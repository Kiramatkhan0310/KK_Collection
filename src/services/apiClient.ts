import { Product, Order, ShippingAddress, CartItem, InventoryEvent } from '../types/index.ts';

const TOKEN_KEY = 'kk_auth_token_v2';
const ADMIN_TOKEN_KEY = 'kk_admin_token_v2';

export class ApiClient {
  static getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  static clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  static getAdminToken(): string | null {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  }

  static setAdminToken(token: string): void {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  }

  static clearAdminToken(): void {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }

  static parseTokenClaims(token: string): { uid: string; email: string; role: 'customer' | 'admin'; displayName: string; exp?: number; iat?: number } | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}, isAdminEndpoint = false): Promise<T> {
    const token = isAdminEndpoint ? (this.getAdminToken() || this.getToken()) : this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (isAdminEndpoint && (res.status === 401 || res.status === 403)) {
        this.clearAdminToken();
      }
      const errorMsg = data?.error || data?.message || `Request failed with status ${res.status}`;
      throw new Error(errorMsg);
    }

    return data as T;
  }

  // --- Auth Endpoints ---
  static async register(payload: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    addressLine1?: string;
    city?: string;
  }) {
    const res = await this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    this.setToken(res.token);
    return res;
  }

  static async login(email: string, password: string) {
    const res = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(res.token);
    return res;
  }

  static async adminLogin(email: string, password: string) {
    const res = await this.request<{ token: string; user: any; claims?: any }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setAdminToken(res.token);
    return res;
  }

  static async verifyAdminSession() {
    return this.request<{ valid: boolean; user: any; claims: any; verifiedAt: string }>(
      '/auth/admin/verify',
      {},
      true
    );
  }

  static async adminLogoutServer() {
    try {
      await this.request<{ success: boolean }>('/auth/admin/logout', { method: 'POST' }, true);
    } catch {
      // Clean up client token even if network fails
    } finally {
      this.clearAdminToken();
    }
  }

  static async getMe(isAdmin = false) {
    return this.request<{ user: any }>('/auth/me', {}, isAdmin);
  }

  static async updateProfile(payload: {
    displayName?: string;
    phoneNumber?: string;
    defaultAddress?: ShippingAddress;
    wishlist?: string[];
  }) {
    return this.request<{ user: any }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  // --- Products & Reviews ---
  static async getProducts(params?: { category?: string; search?: string; inStock?: boolean; sort?: string }) {
    const query = new URLSearchParams();
    if (params?.category) query.set('category', params.category);
    if (params?.search) query.set('search', params.search);
    if (params?.inStock) query.set('inStock', 'true');
    if (params?.sort) query.set('sort', params.sort);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    return this.request<{ products: Product[]; total: number }>(`/products${queryString}`);
  }

  static async getProduct(id: string) {
    return this.request<{ product: Product; reviews: any[] }>(`/products/${id}`);
  }

  static async submitReview(productId: string, rating: number, comment: string) {
    return this.request<{ review: any; verifiedPurchase: boolean }>(`/products/${productId}/reviews`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment })
    });
  }

  // --- Orders & Transactional Checkout ---
  static async createOrder(payload: {
    items: CartItem[];
    shippingAddress: ShippingAddress;
    promoCode?: string;
    paymentMethod: Order['paymentMethod'];
    email?: string;
  }) {
    return this.request<{ order: Order; consignment: any }>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  static async getMyOrders() {
    return this.request<{ orders: Order[] }>('/orders/my-orders');
  }

  static async getOrder(id: string) {
    return this.request<{ order: Order; consignment: any }>(`/orders/${id}`);
  }

  // --- Payment Gateway Handshake ---
  static async createPaymentSession(orderId: string) {
    return this.request<{
      sessionId: string;
      orderId: string;
      orderNumber: string;
      amount: number;
      currency: string;
      transactionReference: string;
      timestamp: number;
      signature: string;
      merchantName: string;
      environment: string;
    }>('/payments/create-session', {
      method: 'POST',
      body: JSON.stringify({ orderId })
    });
  }

  static async verifyPayment(payload: {
    orderId: string;
    amount: number;
    currency: string;
    transactionReference: string;
    timestamp: number;
    signature: string;
    payerCard?: { brand?: string; last4?: string };
  }) {
    return this.request<{ verified: boolean; message: string; order: Order }>('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // --- Courier & Logistics ---
  static async calculateCourierRate(destinationCity: string, weightKg = 0.5, orderAmount = 0) {
    return this.request<{
      shippingFee: number;
      carrier: string;
      estimatedDeliveryDays: string;
      isComplimentary: boolean;
    }>('/courier/calculate-rate', {
      method: 'POST',
      body: JSON.stringify({ destinationCity, weightKg, orderAmount })
    });
  }

  static async trackConsignment(consignmentNumber: string) {
    return this.request<{ consignment: any }>(`/courier/track/${encodeURIComponent(consignmentNumber)}`);
  }

  // --- Promotions ---
  static async validatePromoCode(code: string, subtotal: number) {
    return this.request<{ valid: boolean; code?: string; discountAmount?: number; message: string }>('/promotions/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal })
    });
  }

  // --- Admin Endpoints ---
  static async getAdminOrders(status?: string) {
    const q = status ? `?status=${status}` : '';
    return this.request<{ orders: Order[]; total: number }>(`/admin/orders${q}`, {}, true);
  }

  static async updateOrderStatus(orderId: string, fulfillmentStatus: Order['fulfillmentStatus'], trackingNumber?: string) {
    return this.request<{ order: Order }>(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ fulfillmentStatus, trackingNumber })
    }, true);
  }

  static async updateProduct(id: string, updates: Partial<Product>) {
    return this.request<{ product: Product }>(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }, true);
  }

  static async updateProductStock(id: string, newStock: number, variantId?: string | null, reason?: string) {
    return this.request<{ product: Product; auditEvent: InventoryEvent }>(`/admin/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ newStock, variantId, reason })
    }, true);
  }

  static async createProduct(product: Partial<Product>) {
    return this.request<{ product: Product }>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(product)
    }, true);
  }

  static async resetCatalog() {
    return this.request<{ success: boolean; message: string; total: number }>('/admin/reset-catalog', {
      method: 'POST'
    }, true);
  }

  static async getInventoryLogs() {
    return this.request<{ logs: InventoryEvent[]; total: number }>('/admin/inventory-logs', {}, true);
  }
}
