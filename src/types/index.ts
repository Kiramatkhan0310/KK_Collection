export type CategorySlug =
  | 'skincare'
  | 'makeup'
  | 'lip-care'
  | 'haircare'
  | 'fragrance'
  | 'body-care'
  | 'beauty-tools'
  | 'nail-care';

export interface Category {
  id: CategorySlug;
  name: string;
  slug: CategorySlug;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  name: string; // e.g. "01 Porcelain", "50ml", "Cherry Tint"
  type: 'shade' | 'size' | 'default';
  hexColor?: string;
  priceDelta?: number; // Added to base price
  stockQuantity: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: CategorySlug;
  categoryName: string;
  brand: string;
  images: string[];
  price: number; // Stored in PKR
  salePrice?: number | null;
  currency: string;
  variants: ProductVariant[];
  stockQuantity: number;
  isPublished: boolean;
  isFeatured: boolean;
  ingredients?: string;
  usageInstructions?: string;
  warnings?: string;
  volumeOrWeight?: string;
  isDemoData?: boolean;
  rating?: number;
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  variantName?: string;
  sku: string;
  price: number;
  image: string;
  quantity: number;
  categoryName?: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateOrProvince: string;
  postalCode: string;
  country: string;
}

export type OrderPaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded';
export type OrderFulfillmentStatus = 'unfulfilled' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cash_on_delivery' | 'online_gateway';

export interface OrderItemSnapshot {
  productId: string;
  variantId?: string | null;
  name: string;
  variantName?: string | null;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  image?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerEmail: string;
  customerName: string;
  items: OrderItemSnapshot[];
  shippingAddress: ShippingAddress;
  subtotal: number;
  shippingAmount: number;
  discountAmount: number;
  appliedPromoCode?: string | null;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumSpend: number;
  startAt: string;
  endAt: string;
  usageLimit: number;
  timesUsed: number;
  isActive: boolean;
  description?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  defaultAddress?: ShippingAddress;
  wishlist: string[];
  role: 'customer' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface InventoryEvent {
  id: string;
  productId: string;
  variantId?: string | null;
  sku: string;
  quantityChange: number;
  newQuantity: number;
  reason: 'order_placement' | 'order_cancellation' | 'admin_restock' | 'adjustment_loss';
  actorId: string;
  orderId?: string;
  createdAt: string;
}
