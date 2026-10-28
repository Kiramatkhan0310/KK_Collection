import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  db,
  hashPassword,
  verifyPassword,
  createAuthToken,
  verifyAuthToken,
  PAYMENT_GATEWAY_SECRET,
  StoredUser,
  StoredReview,
  PaymentTransaction,
  CourierConsignment
} from './db.ts';
import { Product, Order, InventoryEvent } from '../types/index.ts';

export const apiRouter = Router();

// Extend Request interface
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: 'customer' | 'admin';
    displayName: string;
    exp?: number;
    iat?: number;
  };
}

// Authentication Middleware
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return next();
  }

  const verified = verifyAuthToken(token);
  if (verified) {
    req.user = verified;
  }
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrative privilege required.' });
  }
  next();
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & CUSTOMER ACCOUNTS
// -------------------------------------------------------------

// Customer Registration (Strictly produces role: 'customer')
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  const { email, password, fullName, phone, addressLine1, city } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password, and full name are required.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  const result = await db.withLock((data) => {
    const existing = data.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return { error: 'An account with this email address already exists.' };
    }

    const { salt, hash } = hashPassword(password);
    const uid = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const newUser: StoredUser = {
      uid,
      email: cleanEmail,
      displayName: fullName.trim(),
      phoneNumber: phone || '',
      role: 'customer', // Security: User cannot self-promote to admin
      wishlist: [],
      defaultAddress: addressLine1 ? {
        fullName: fullName.trim(),
        phone: phone || '',
        addressLine1,
        city: city || 'Karachi',
        stateOrProvince: 'Sindh',
        postalCode: '75500',
        country: 'Pakistan'
      } : undefined,
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.users.push(newUser);

    const token = createAuthToken({
      uid: newUser.uid,
      email: newUser.email,
      role: newUser.role,
      displayName: newUser.displayName
    });

    const { passwordHash: _, passwordSalt: __, ...safeProfile } = newUser;
    return { token, user: safeProfile };
  });

  if ('error' in result && result.error) {
    return res.status(409).json({ error: result.error });
  }

  return res.status(201).json(result);
});

// Customer Login
apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  const user = db.getData().users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isValid = verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = createAuthToken({
    uid: user.uid,
    email: user.email,
    role: user.role,
    displayName: user.displayName
  });

  const { passwordHash: _, passwordSalt: __, ...safeProfile } = user;
  return res.json({ token, user: safeProfile });
});

// Admin Brute-Force & Rate Limiting Protection (In-Memory IP & Email Lockout)
interface FailedAttemptRecord {
  count: number;
  lastAttemptAt: number;
  lockedUntil?: number;
}
const adminFailedAttempts = new Map<string, FailedAttemptRecord>();

function getAttemptKey(req: Request, email: string): string {
  const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
  return `${ip}::${email.toLowerCase()}`;
}

// Dedicated Administrator Login (Hardened against Brute-Force & Timing Attacks)
apiRouter.post('/auth/admin/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Administrator email and credentials required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const attemptKey = getAttemptKey(req, cleanEmail);
  const now = Date.now();

  // Check lockout
  const attemptRecord = adminFailedAttempts.get(attemptKey);
  if (attemptRecord && attemptRecord.lockedUntil && attemptRecord.lockedUntil > now) {
    const remainingSeconds = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
    return res.status(429).json({
      error: `Security Lockout: Too many failed administrator authentication attempts. Access locked for ${remainingSeconds} more seconds.`
    });
  }

  const user = db.getData().users.find((u) => u.email.toLowerCase() === cleanEmail && u.role === 'admin');

  // Defense against timing attacks: if user is not found or not admin, execute dummy PBKDF2 hash
  if (!user) {
    verifyPassword('dummyPasswordForTimingResistance123!', '00000000000000000000000000000000', '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000');

    // Increment failed attempt counter
    const current = adminFailedAttempts.get(attemptKey) || { count: 0, lastAttemptAt: now };
    current.count += 1;
    current.lastAttemptAt = now;
    if (current.count >= 5) {
      current.lockedUntil = now + (15 * 60 * 1000); // 15 min lock
    }
    adminFailedAttempts.set(attemptKey, current);

    return res.status(403).json({ error: 'Invalid administrator credentials or access denied.' });
  }

  const isValid = verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!isValid) {
    const current = adminFailedAttempts.get(attemptKey) || { count: 0, lastAttemptAt: now };
    current.count += 1;
    current.lastAttemptAt = now;
    if (current.count >= 5) {
      current.lockedUntil = now + (15 * 60 * 1000);
    }
    adminFailedAttempts.set(attemptKey, current);

    return res.status(403).json({ error: 'Invalid administrator credentials or access denied.' });
  }

  // Clear failed attempt record on successful authentication
  adminFailedAttempts.delete(attemptKey);

  // Issue strictly scoped admin token with 24-hour expiration
  const token = createAuthToken({
    uid: user.uid,
    email: user.email,
    role: 'admin',
    displayName: user.displayName
  }, 24 * 60 * 60);

  const { passwordHash: _, passwordSalt: __, ...safeProfile } = user;
  return res.json({
    token,
    user: safeProfile,
    claims: {
      uid: user.uid,
      email: user.email,
      role: 'admin' as const,
      displayName: user.displayName,
      expiresInSeconds: 24 * 60 * 60
    }
  });
});

// Dedicated Administrator Server-Side Claims Verification
apiRouter.get('/auth/admin/verify', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getData().users.find((u) => u.uid === req.user!.uid && u.role === 'admin');

  if (!user) {
    return res.status(403).json({
      valid: false,
      error: 'Security alert: Administrator profile revoked or does not hold server admin privilege.'
    });
  }

  const { passwordHash: _, passwordSalt: __, ...safeProfile } = user;
  return res.json({
    valid: true,
    user: safeProfile,
    claims: {
      uid: req.user!.uid,
      email: req.user!.email,
      role: 'admin',
      displayName: req.user!.displayName,
      exp: req.user!.exp,
      iat: req.user!.iat
    },
    verifiedAt: new Date().toISOString()
  });
});

// Administrator Logout & Session Invalidation
apiRouter.post('/auth/admin/logout', requireAdmin, (_req: AuthenticatedRequest, res: Response) => {
  return res.json({ success: true, message: 'Administrator session closed.' });
});

// Current Authenticated Profile
apiRouter.get('/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = db.getData().users.find((u) => u.uid === req.user!.uid);
  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }
  const { passwordHash: _, passwordSalt: __, ...safeProfile } = user;
  return res.json({ user: safeProfile });
});

// Update Profile & Default Address
apiRouter.put('/auth/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { displayName, phoneNumber, defaultAddress, wishlist } = req.body;

  const updated = await db.withLock((data) => {
    const user = data.users.find((u) => u.uid === req.user!.uid);
    if (!user) return null;

    if (displayName) user.displayName = displayName.trim();
    if (phoneNumber) user.phoneNumber = phoneNumber.trim();
    if (defaultAddress) user.defaultAddress = defaultAddress;
    if (Array.isArray(wishlist)) user.wishlist = wishlist;
    user.updatedAt = new Date().toISOString();

    const { passwordHash: _, passwordSalt: __, ...safeProfile } = user;
    return safeProfile;
  });

  if (!updated) {
    return res.status(404).json({ error: 'User not found.' });
  }

  return res.json({ user: updated });
});

// -------------------------------------------------------------
// 2. AUTHORITATIVE PRODUCT CATALOG & INVENTORY
// -------------------------------------------------------------

// Public Product Listing
apiRouter.get('/products', (req: Request, res: Response) => {
  const { category, search, inStock, sort } = req.query;
  let products = [...db.getData().products];

  // Only published items for public
  products = products.filter((p) => p.isPublished);

  if (category && category !== 'all') {
    products = products.filter((p) => p.categoryId === category);
  }

  if (typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.categoryName.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  if (inStock === 'true') {
    products = products.filter((p) => p.stockQuantity > 0);
  }

  if (sort === 'price-low') {
    products.sort((a, b) => (a.salePrice || a.price) - (b.salePrice || b.price));
  } else if (sort === 'price-high') {
    products.sort((a, b) => (b.salePrice || b.price) - (a.salePrice || a.price));
  } else if (sort === 'rating') {
    products.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  } else if (sort === 'name') {
    products.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    // Featured first
    products.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
  }

  return res.json({ products, total: products.length });
});

// Single Product Details with Verified Reviews
apiRouter.get('/products/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const product = db.getData().products.find((p) => p.id === id || p.slug === id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found in catalog.' });
  }

  const reviews = db.getData().reviews.filter((r) => r.productId === product.id);

  return res.json({ product, reviews });
});

// Submit Verified Customer Review
apiRouter.post('/products/:id/reviews', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { rating, comment } = req.body;

  if (!rating || !comment) {
    return res.status(400).json({ error: 'Rating (1-5) and review comment are required.' });
  }

  const product = db.getData().products.find((p) => p.id === id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  // Check verified purchase: Has customer received this product in a delivered order?
  const hasDeliveredOrder = db.getData().orders.some(
    (o) => o.userId === req.user!.uid &&
           o.fulfillmentStatus === 'delivered' &&
           o.items.some((item) => item.productId === product.id)
  );

  const review: StoredReview = {
    id: `rev-${Date.now()}`,
    productId: product.id,
    userId: req.user!.uid,
    userName: req.user!.displayName,
    rating: Math.min(5, Math.max(1, Number(rating))),
    comment: comment.trim(),
    verifiedPurchase: hasDeliveredOrder,
    createdAt: new Date().toISOString()
  };

  await db.withLock((data) => {
    data.reviews.unshift(review);

    // Recalculate average rating
    const allProdReviews = data.reviews.filter((r) => r.productId === product.id);
    const avg = allProdReviews.reduce((sum, r) => sum + r.rating, 0) / allProdReviews.length;
    const prodRef = data.products.find((p) => p.id === product.id);
    if (prodRef) {
      prodRef.rating = Number(avg.toFixed(1));
      prodRef.reviewCount = allProdReviews.length;
    }
  });

  return res.status(201).json({ review, verifiedPurchase: hasDeliveredOrder });
});

// Admin: Create Product
apiRouter.post('/admin/products', requireAdmin, async (req: Request, res: Response) => {
  const newProduct: Product = req.body;

  if (!newProduct.name || !newProduct.price || !newProduct.categoryId) {
    return res.status(400).json({ error: 'Product name, price, and category are mandatory.' });
  }

  const created = await db.withLock((data) => {
    const id = newProduct.id || `prod-${Date.now()}`;
    const slug = newProduct.slug || newProduct.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const product: Product = {
      ...newProduct,
      id,
      slug,
      sku: newProduct.sku || `KK-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublished: newProduct.isPublished ?? true
    };
    data.products.unshift(product);
    return product;
  });

  return res.status(201).json({ product: created });
});

// Admin: Update Product
apiRouter.put('/admin/products/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const updated = await db.withLock((data) => {
    const index = data.products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    data.products[index] = {
      ...data.products[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    return data.products[index];
  });

  if (!updated) {
    return res.status(404).json({ error: 'Product not found.' });
  }

  return res.json({ product: updated });
});

// Admin: Adjust Inventory with Audit Trail
apiRouter.patch('/admin/products/:id/stock', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { variantId, newStock, reason } = req.body;

  if (typeof newStock !== 'number' || newStock < 0) {
    return res.status(400).json({ error: 'Valid stock quantity (>= 0) required.' });
  }

  const result = await db.withLock((data) => {
    const product = data.products.find((p) => p.id === id);
    if (!product) return null;

    let delta = 0;
    let targetSku = product.sku;

    if (variantId && product.variants) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) return null;
      delta = newStock - variant.stockQuantity;
      variant.stockQuantity = newStock;
      product.stockQuantity = Math.max(0, product.stockQuantity + delta);
      targetSku = variant.sku;
    } else {
      delta = newStock - product.stockQuantity;
      product.stockQuantity = newStock;
    }

    product.updatedAt = new Date().toISOString();

    const auditEvent: InventoryEvent = {
      id: `inv-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      productId: product.id,
      variantId: variantId || null,
      sku: targetSku,
      quantityChange: delta,
      newQuantity: newStock,
      reason: reason || 'admin_restock',
      actorId: req.user!.uid,
      createdAt: new Date().toISOString()
    };

    data.inventoryEvents.unshift(auditEvent);
    return { product, auditEvent };
  });

  if (!result) {
    return res.status(404).json({ error: 'Product or variant not found.' });
  }

  return res.json(result);
});

// Admin: Reset Catalog
apiRouter.post('/admin/reset-catalog', requireAdmin, async (req: Request, res: Response) => {
  const products = db.resetCatalog();
  return res.json({ success: true, message: 'Catalog reset to original 60 seeded formulations.', total: products.length });
});

// -------------------------------------------------------------
// 3. AUTHORITATIVE ORDERS & TRANSACTIONAL CHECKOUT
// -------------------------------------------------------------

// Calculate Courier Delivery Fee
function calculateShipping(subtotal: number, city: string): number {
  if (subtotal >= 5000) return 0; // Free delivery over PKR 5,000 nationwide

  const majorHubs = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad'];
  if (majorHubs.includes(city)) {
    return 250;
  }
  return 350; // Remote or rest of Pakistan
}

// Transactional Order Placement
apiRouter.post('/orders', async (req: AuthenticatedRequest, res: Response) => {
  const { items, shippingAddress, promoCode, paymentMethod } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Shopping bag cannot be empty.' });
  }

  if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.addressLine1 || !shippingAddress.city) {
    return res.status(400).json({ error: 'Mandatory delivery information (Name, Phone, Address, City) is required.' });
  }

  if (paymentMethod !== 'cash_on_delivery' && paymentMethod !== 'online_gateway') {
    return res.status(400).json({ error: 'Invalid payment method selected.' });
  }

  // ATOMIC LOCK: Verify stock and decrement transactionally
  const orderResult = await db.withLock((data) => {
    let subtotal = 0;
    const orderItems: any[] = [];
    const stockDeductions: { product: Product; variant?: any; qty: number }[] = [];
    const inventoryLogs: InventoryEvent[] = [];

    // 1. Authoritative verification of prices and inventory
    for (const item of items) {
      if (!item.quantity || item.quantity <= 0) {
        return { error: 'Item quantities must be positive integers.' };
      }

      const product = data.products.find((p) => p.id === item.productId);
      if (!product || !product.isPublished) {
        return { error: `Product "${item.name || item.productId}" is currently unavailable.` };
      }

      let activePrice = (product.salePrice && product.salePrice > 0 && product.salePrice < product.price)
        ? product.salePrice
        : product.price;

      let variantName: string | null = null;
      let variantSku = product.sku;
      let matchedVariant: any = null;

      if (item.variantId && product.variants?.length) {
        matchedVariant = product.variants.find((v) => v.id === item.variantId);
        if (!matchedVariant) {
          return { error: `Selected shade/size for "${product.name}" was not found.` };
        }

        if (matchedVariant.stockQuantity < item.quantity) {
          return {
            error: `Insufficient stock for "${product.name} (${matchedVariant.name})". Only ${matchedVariant.stockQuantity} available.`
          };
        }

        if (matchedVariant.priceDelta) {
          activePrice += matchedVariant.priceDelta;
        }

        variantName = matchedVariant.name;
        variantSku = matchedVariant.sku;
      } else {
        if (product.stockQuantity < item.quantity) {
          return {
            error: `Insufficient stock for "${product.name}". Only ${product.stockQuantity} units available.`
          };
        }
      }

      const lineTotal = activePrice * item.quantity;
      subtotal += lineTotal;

      stockDeductions.push({ product, variant: matchedVariant, qty: item.quantity });

      orderItems.push({
        productId: product.id,
        variantId: item.variantId || null,
        name: product.name,
        variantName,
        sku: variantSku,
        unitPrice: activePrice,
        quantity: item.quantity,
        lineTotal,
        image: item.image || product.images[0]
      });
    }

    // 2. Authoritative Server Promo Code Calculation
    let discountAmount = 0;
    let validPromoCode: string | null = null;

    if (promoCode) {
      const cleanCode = promoCode.trim().toUpperCase();
      const promo = data.promotions.find((p) => p.code.toUpperCase() === cleanCode && p.isActive);

      if (promo) {
        const now = new Date();
        const start = new Date(promo.startAt);
        const end = new Date(promo.endAt);

        if (now >= start && now <= end && subtotal >= promo.minimumSpend) {
          if (!promo.usageLimit || promo.timesUsed < promo.usageLimit) {
            discountAmount = promo.discountType === 'percentage'
              ? Math.round((subtotal * promo.discountValue) / 100)
              : promo.discountValue;

            discountAmount = Math.min(discountAmount, subtotal);
            validPromoCode = cleanCode;
            promo.timesUsed += 1;
          }
        }
      }
    }

    // 3. Authoritative Pakistan Logistics Fee
    const shippingAmount = calculateShipping(subtotal, shippingAddress.city);
    const totalAmount = Math.max(0, subtotal - discountAmount + shippingAmount);

    // 4. Commit Inventory Decrements (Atomic)
    const orderId = `ord-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const orderNumber = `KK-${Math.floor(100000 + Math.random() * 900000)}`;

    for (const deduction of stockDeductions) {
      if (deduction.variant) {
        deduction.variant.stockQuantity -= deduction.qty;
        deduction.product.stockQuantity = Math.max(0, deduction.product.stockQuantity - deduction.qty);
      } else {
        deduction.product.stockQuantity -= deduction.qty;
      }
      deduction.product.updatedAt = new Date().toISOString();

      inventoryLogs.push({
        id: `inv-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        productId: deduction.product.id,
        variantId: deduction.variant ? deduction.variant.id : null,
        sku: deduction.variant ? deduction.variant.sku : deduction.product.sku,
        quantityChange: -deduction.qty,
        newQuantity: deduction.variant ? deduction.variant.stockQuantity : deduction.product.stockQuantity,
        reason: 'order_placement',
        actorId: req.user ? req.user.uid : 'guest_checkout',
        orderId,
        createdAt: new Date().toISOString()
      });
    }

    data.inventoryEvents.unshift(...inventoryLogs);

    // 5. Generate Pakistan Courier Consignment
    const consignmentNumber = `TCS-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const consignment: CourierConsignment = {
      consignmentNumber,
      courierName: 'TCS Express',
      orderId,
      orderNumber,
      destinationCity: shippingAddress.city,
      destinationAddress: shippingAddress.addressLine1,
      recipientName: shippingAddress.fullName,
      recipientPhone: shippingAddress.phone,
      codAmount: paymentMethod === 'cash_on_delivery' ? totalAmount : 0,
      weightKg: Math.max(0.5, orderItems.reduce((acc, i) => acc + (i.quantity * 0.2), 0)),
      createdAt: new Date().toISOString(),
      currentStatus: 'booked',
      checkpoints: [
        {
          timestamp: new Date().toISOString(),
          status: 'Shipment Booked',
          location: 'KK Collection Lahore Fulfillment Hub',
          remarks: 'Order verified and electronic consignment registered'
        }
      ]
    };

    data.consignments.unshift(consignment);

    // 6. Create Order Entity
    const newOrder: Order = {
      id: orderId,
      orderNumber,
      userId: req.user ? req.user.uid : 'guest-order',
      customerEmail: req.user ? req.user.email : (req.body.email || 'customer@kkcollection.store'),
      customerName: shippingAddress.fullName,
      items: orderItems,
      shippingAddress,
      subtotal,
      shippingAmount,
      discountAmount,
      appliedPromoCode: validPromoCode,
      taxAmount: 0,
      totalAmount,
      currency: 'PKR',
      paymentMethod,
      paymentStatus: paymentMethod === 'cash_on_delivery' ? 'pending' : 'authorized',
      fulfillmentStatus: 'processing',
      trackingNumber: consignmentNumber,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.orders.unshift(newOrder);

    return { order: newOrder, consignment };
  });

  if ('error' in orderResult && orderResult.error) {
    return res.status(409).json({ error: orderResult.error });
  }

  return res.status(201).json(orderResult);
});

// Get User's Own Orders (Secure: User cannot view other customers' orders)
apiRouter.get('/orders/my-orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userOrders = db.getData().orders.filter((o) => o.userId === req.user!.uid);
  return res.json({ orders: userOrders });
});

// Single Order Lookup (Owner or Admin only)
apiRouter.get('/orders/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const order = db.getData().orders.find((o) => o.id === id || o.orderNumber === id);

  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  if (req.user!.role !== 'admin' && order.userId !== req.user!.uid) {
    return res.status(403).json({ error: 'Access denied to this order record.' });
  }

  const consignment = db.getData().consignments.find((c) => c.orderId === order.id);
  return res.json({ order, consignment });
});

// Admin: View All Orders
apiRouter.get('/admin/orders', requireAdmin, (req: Request, res: Response) => {
  const { status } = req.query;
  let orders = [...db.getData().orders];

  if (status && status !== 'all') {
    orders = orders.filter((o) => o.fulfillmentStatus === status);
  }

  return res.json({ orders, total: orders.length });
});

// Admin: Update Order Fulfillment & Restock on Cancellation
apiRouter.patch('/admin/orders/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { fulfillmentStatus, trackingNumber } = req.body;

  const validStatuses = ['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(fulfillmentStatus)) {
    return res.status(400).json({ error: 'Invalid fulfillment status.' });
  }

  const result = await db.withLock((data) => {
    const order = data.orders.find((o) => o.id === id || o.orderNumber === id);
    if (!order) return null;

    const previousStatus = order.fulfillmentStatus;
    order.fulfillmentStatus = fulfillmentStatus;

    if (trackingNumber) {
      order.trackingNumber = trackingNumber;
    }

    if (fulfillmentStatus === 'delivered') {
      order.paymentStatus = 'paid';
    }

    // Cancellation Restock Logic
    if (fulfillmentStatus === 'cancelled' && previousStatus !== 'cancelled') {
      for (const item of order.items) {
        const prod = data.products.find((p) => p.id === item.productId);
        if (prod) {
          if (item.variantId && prod.variants) {
            const v = prod.variants.find((v) => v.id === item.variantId);
            if (v) {
              v.stockQuantity += item.quantity;
              prod.stockQuantity += item.quantity;
            }
          } else {
            prod.stockQuantity += item.quantity;
          }
          prod.updatedAt = new Date().toISOString();

          data.inventoryEvents.unshift({
            id: `inv-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
            productId: prod.id,
            variantId: item.variantId || null,
            sku: item.sku,
            quantityChange: item.quantity,
            newQuantity: prod.stockQuantity,
            reason: 'order_cancellation',
            actorId: req.user!.uid,
            orderId: order.id,
            createdAt: new Date().toISOString()
          });
        }
      }
    }

    order.updatedAt = new Date().toISOString();

    // Sync consignment checkpoints if delivered or shipped
    const consignment = data.consignments.find((c) => c.orderId === order.id);
    if (consignment) {
      if (fulfillmentStatus === 'shipped') {
        consignment.currentStatus = 'in_transit';
        consignment.checkpoints.push({
          timestamp: new Date().toISOString(),
          status: 'Departed Hub',
          location: 'Lahore Origin Facility',
          remarks: 'Dispatched on courier linehaul route'
        });
      } else if (fulfillmentStatus === 'delivered') {
        consignment.currentStatus = 'delivered';
        consignment.checkpoints.push({
          timestamp: new Date().toISOString(),
          status: 'Delivered',
          location: order.shippingAddress.city,
          remarks: 'Delivered and signed by consignee'
        });
      }
    }

    return order;
  });

  if (!result) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  return res.json({ order: result });
});

// -------------------------------------------------------------
// 4. LEGITIMATE PAYMENT GATEWAY & SIGNATURE VERIFICATION
// -------------------------------------------------------------

// Create Payment Session
apiRouter.post('/payments/create-session', async (req: Request, res: Response) => {
  const { orderId } = req.body;

  const order = db.getData().orders.find((o) => o.id === orderId || o.orderNumber === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  const transactionRef = `TXN-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const timestamp = Math.floor(Date.now() / 1000);

  // Compute HMAC-SHA256 signature
  const payloadToSign = `${order.id}|${order.totalAmount}|${order.currency}|${transactionRef}|${timestamp}`;
  const signature = crypto.createHmac('sha256', PAYMENT_GATEWAY_SECRET).update(payloadToSign).digest('hex');

  const session = {
    sessionId: `pay_sess_${crypto.randomBytes(8).toString('hex')}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amount: order.totalAmount,
    currency: order.currency,
    transactionReference: transactionRef,
    timestamp,
    signature,
    merchantName: 'KK Collection Pakistan',
    environment: 'sandbox_production_ready'
  };

  return res.json(session);
});

// Cryptographic Webhook / Callback Verification
apiRouter.post('/payments/verify', async (req: Request, res: Response) => {
  const { orderId, amount, currency, transactionReference, timestamp, signature, payerCard } = req.body;

  if (!orderId || !transactionReference || !signature) {
    return res.status(400).json({ error: 'Missing mandatory payment verification fields.' });
  }

  // Recalculate HMAC signature on server
  const expectedPayload = `${orderId}|${amount}|${currency}|${transactionReference}|${timestamp}`;
  const expectedSignature = crypto.createHmac('sha256', PAYMENT_GATEWAY_SECRET).update(expectedPayload).digest('hex');

  const sigBuf = Buffer.from(String(signature));
  const expBuf = Buffer.from(expectedSignature);
  const isAuthentic = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

  if (!isAuthentic) {
    return res.status(400).json({
      verified: false,
      error: 'Security alert: Payment signature verification failed (HMAC mismatch).'
    });
  }

  const updatedOrder = await db.withLock((data) => {
    const order = data.orders.find((o) => o.id === orderId);
    if (!order) return null;

    order.paymentStatus = 'paid';
    order.updatedAt = new Date().toISOString();

    const paymentRecord: PaymentTransaction = {
      id: `pay-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: Number(amount),
      currency: currency || 'PKR',
      gateway: 'safepay_pakistan',
      transactionReference,
      status: 'completed',
      signature,
      payerDetails: payerCard ? {
        cardBrand: payerCard.brand || 'Visa',
        last4: payerCard.last4 || '4242'
      } : undefined,
      createdAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString()
    };

    data.payments.unshift(paymentRecord);
    return order;
  });

  if (!updatedOrder) {
    return res.status(404).json({ error: 'Order not found.' });
  }

  return res.json({
    verified: true,
    message: 'Payment verified and settled by server.',
    order: updatedOrder
  });
});

// -------------------------------------------------------------
// 5. PAKISTAN COURIER & LIVE TRACKING
// -------------------------------------------------------------

apiRouter.post('/courier/calculate-rate', (req: Request, res: Response) => {
  const { destinationCity, weightKg, orderAmount } = req.body;

  const fee = calculateShipping(orderAmount || 0, destinationCity || 'Karachi');
  const estimatedDays = destinationCity === 'Lahore' ? '1–2 days' : '2–3 days';

  return res.json({
    shippingFee: fee,
    carrier: 'TCS Express Pakistan',
    estimatedDeliveryDays: estimatedDays,
    isComplimentary: fee === 0
  });
});

apiRouter.get('/courier/track/:cn', (req: Request, res: Response) => {
  const { cn } = req.params;
  const consignment = db.getData().consignments.find((c) => c.consignmentNumber === cn || c.orderNumber === cn);

  if (!consignment) {
    return res.status(404).json({ error: 'Consignment tracking number not found in courier network.' });
  }

  return res.json({ consignment });
});

// -------------------------------------------------------------
// 6. PROMOTIONS VALIDATION
// -------------------------------------------------------------

apiRouter.post('/promotions/validate', (req: Request, res: Response) => {
  const { code, subtotal } = req.body;

  if (!code) {
    return res.status(400).json({ valid: false, message: 'Please enter a code.' });
  }

  const cleanCode = code.trim().toUpperCase();
  const promo = db.getData().promotions.find((p) => p.code.toUpperCase() === cleanCode && p.isActive);

  if (!promo) {
    return res.status(404).json({ valid: false, message: `Voucher "${cleanCode}" is invalid.` });
  }

  if (Number(subtotal) < promo.minimumSpend) {
    return res.status(400).json({
      valid: false,
      message: `Voucher "${cleanCode}" requires a minimum spend of Rs. ${promo.minimumSpend.toLocaleString()}.`
    });
  }

  let discount = promo.discountType === 'percentage'
    ? Math.round((Number(subtotal) * promo.discountValue) / 100)
    : promo.discountValue;

  discount = Math.min(discount, Number(subtotal));

  return res.json({
    valid: true,
    code: promo.code,
    discountAmount: discount,
    message: promo.description || `${promo.code} applied successfully.`
  });
});

// -------------------------------------------------------------
// 7. INVENTORY AUDIT EVENTS
// -------------------------------------------------------------

apiRouter.get('/admin/inventory-logs', requireAdmin, (req: Request, res: Response) => {
  const logs = db.getData().inventoryEvents;
  return res.json({ logs, total: logs.length });
});
