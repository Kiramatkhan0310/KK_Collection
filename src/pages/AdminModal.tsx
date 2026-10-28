import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Package,
  RefreshCw,
  Plus,
  Check,
  Search,
  LogOut,
  History,
  ShieldAlert,
  ShieldCheck,
  Lock,
  KeyRound,
  Loader2,
  Clock,
  Mail,
  Download,
  Copy
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase.ts';
import { ApiClient } from '../services/apiClient.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { Order, Product, CategorySlug, InventoryEvent } from '../types/index.ts';
import { formatCurrency, formatDate } from '../utils/currency.ts';
import { SEEDED_CATEGORIES } from '../data/catalogData.ts';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshCatalog: () => void;
  onOpenAdminLogin?: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  onRefreshCatalog,
  onOpenAdminLogin
}) => {
  const { adminUser, adminClaims, isAdmin, isFirebaseAdmin, adminLogout, checkAdminAuthorization } = useAuth();

  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'audit' | 'new-product' | 'newsletter'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [auditLogs, setAuditLogs] = useState<InventoryEvent[]>([]);
  const [subscriptions, setSubscriptions] = useState<{ id: string; email: string; createdAt?: any; source?: string; status?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true);
  const [authDeniedReason, setAuthDeniedReason] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // New Product Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    brand: 'KK Essentials',
    categoryId: 'skincare' as CategorySlug,
    price: 2500,
    salePrice: 0,
    stockQuantity: 50,
    volumeOrWeight: '50 ml',
    description: '',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
    ingredients: '',
    usageInstructions: ''
  });

  /**
   * Strictly enforces authorization before querying privileged administrative endpoints.
   * If the server claim check fails, no privileged data is requested.
   */
  const verifyAndFetchData = useCallback(async () => {
    setIsVerifyingAuth(true);
    setAuthDeniedReason(null);

    const authCheck = await checkAdminAuthorization();
    if (!authCheck.authorized || !authCheck.user || authCheck.user.role !== 'admin') {
      setIsVerifyingAuth(false);
      setAuthDeniedReason(authCheck.error || 'Access denied. Valid server administrator claims required.');
      return;
    }

    setIsVerifyingAuth(false);
    setLoading(true);

    try {
      const [ordRes, prodRes, logsRes] = await Promise.all([
        ApiClient.getAdminOrders(),
        ApiClient.getProducts(),
        ApiClient.getInventoryLogs()
      ]);
      setOrders(ordRes.orders || []);
      setProducts(prodRes.products || []);
      setAuditLogs(logsRes.logs || []);

      // Authoritative read of newsletter subscribers from Firestore
      try {
        const subSnap = await getDocs(collection(db, 'newsletter_subscriptions'));
        const subList = subSnap.docs.map((d) => ({
          id: d.id,
          email: d.data().email || '',
          createdAt: d.data().createdAt,
          source: d.data().source || 'storefront',
          status: d.data().status || 'active'
        }));
        setSubscriptions(subList);
      } catch (subErr) {
        console.warn('Could not read newsletter_subscriptions:', subErr);
      }
    } catch (err: any) {
      console.error('Failed to fetch admin data', err);
      // If error is 401 or 403, revoke session immediately
      if (err.message && (err.message.includes('401') || err.message.includes('403') || err.message.includes('Access denied'))) {
        await adminLogout();
        setAuthDeniedReason('Server rejected administrator authorization. Session terminated.');
      } else {
        setStatusMessage(err.message || 'Error fetching admin records');
      }
    } finally {
      setLoading(false);
    }
  }, [checkAdminAuthorization, adminLogout]);

  useEffect(() => {
    if (isOpen) {
      verifyAndFetchData();
    }
  }, [isOpen, verifyAndFetchData]);

  if (!isOpen) return null;

  const handleUpdateOrderStatus = async (orderId: string, fulfillmentStatus: Order['fulfillmentStatus']) => {
    try {
      const res = await ApiClient.updateOrderStatus(orderId, fulfillmentStatus);
      setStatusMessage(`Order ${res.order.orderNumber} updated to ${fulfillmentStatus}.`);
      verifyAndFetchData();
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
        await adminLogout();
        setAuthDeniedReason('Session revoked by server during mutation. Please re-authenticate.');
      } else {
        alert(`Error updating order: ${err.message}`);
      }
    }
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    try {
      await ApiClient.updateProductStock(productId, newStock, null, 'admin_restock');
      verifyAndFetchData();
      onRefreshCatalog();
    } catch (err: any) {
      if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
        await adminLogout();
        setAuthDeniedReason('Session revoked by server during inventory adjustment.');
      } else {
        alert(`Error adjusting stock: ${err.message}`);
      }
    }
  };

  const handleTogglePublish = async (product: Product) => {
    try {
      await ApiClient.updateProduct(product.id, { isPublished: !product.isPublished });
      verifyAndFetchData();
      onRefreshCatalog();
    } catch (err: any) {
      if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
        await adminLogout();
        setAuthDeniedReason('Session revoked by server during catalog mutation.');
      } else {
        alert(`Error updating visibility: ${err.message}`);
      }
    }
  };

  const handleResetCatalog = async () => {
    if (window.confirm('Reset catalog on server to default 60 cosmetics products?')) {
      try {
        await ApiClient.resetCatalog();
        verifyAndFetchData();
        onRefreshCatalog();
        setStatusMessage('Catalog restored to default 60 formulations on server.');
        setTimeout(() => setStatusMessage(null), 3500);
      } catch (err: any) {
        if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
          await adminLogout();
          setAuthDeniedReason('Session revoked by server during catalog reset.');
        } else {
          alert(err.message);
        }
      }
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim()) return;

    try {
      const cat = SEEDED_CATEGORIES.find((c) => c.id === newProduct.categoryId);
      await ApiClient.createProduct({
        ...newProduct,
        categoryName: cat?.name || 'Cosmetics',
        price: Number(newProduct.price),
        salePrice: newProduct.salePrice ? Number(newProduct.salePrice) : null,
        stockQuantity: Number(newProduct.stockQuantity),
        images: [newProduct.image],
        isPublished: true,
        variants: []
      });

      setStatusMessage(`Product "${newProduct.name}" created and verified on server.`);
      verifyAndFetchData();
      onRefreshCatalog();
      setActiveTab('inventory');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      if (err.message && (err.message.includes('401') || err.message.includes('403'))) {
        await adminLogout();
        setAuthDeniedReason('Session revoked by server during product creation.');
      } else {
        alert(`Failed to create product: ${err.message}`);
      }
    }
  };

  // Metrics
  const totalRevenue = orders
    .filter((o) => o.paymentStatus === 'paid')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const lowStockCount = products.filter((p) => p.stockQuantity < 20).length;

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
      <div
        className="relative w-full max-w-5xl bg-white rounded-xl shadow-2xl overflow-hidden border border-stone-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Verification Loading State */}
        {isVerifyingAuth && (
          <div className="py-24 flex flex-col items-center justify-center bg-stone-950 text-white space-y-4">
            <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
            <div className="text-center">
              <h3 className="font-serif text-lg font-bold">Verifying Server Administrator Claims</h3>
              <p className="text-xs text-stone-400 mt-1 font-mono">
                Authoritative check against /api/auth/admin/verify...
              </p>
            </div>
          </div>
        )}

        {/* RESTRICTED ACCESS GATE: Rendered when not authorized or server rejected claims */}
        {!isVerifyingAuth && (!isAdmin || !adminUser || authDeniedReason) && (
          <div className="p-8 sm:p-12 text-center bg-stone-950 text-stone-100">
            <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 mx-auto mb-4 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-rose-400 block mb-1">
              Restricted Area · Authorization Required
            </span>
            <h2 className="text-2xl font-serif font-bold text-white mb-3">
              Store Operations Portal
            </h2>
            <div className="max-w-md mx-auto p-4 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-300 text-left mb-6 space-y-2 font-sans">
              <p className="font-semibold text-stone-100 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Server-Side Claims Enforcement</span>
              </p>
              <p className="text-stone-400 text-[11px] leading-relaxed">
                This portal strictly verifies cryptographically signed JWT tokens holding server-issued administrator claims (<code className="text-rose-300">role="admin"</code>). Client-side role promotion is completely blocked.
              </p>
              {authDeniedReason && (
                <div className="p-2.5 bg-rose-950/60 border border-rose-900 rounded text-rose-200 text-[11px]">
                  <strong>Security Guard:</strong> {authDeniedReason}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => {
                  if (onOpenAdminLogin) {
                    onOpenAdminLogin();
                  }
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-rose-800 hover:bg-rose-700 text-white font-semibold text-xs tracking-wider uppercase transition shadow-md flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Authenticate as Administrator</span>
              </button>
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs tracking-wider uppercase transition"
              >
                Return to Storefront
              </button>
            </div>
          </div>
        )}

        {/* AUTHENTICATED ADMINISTRATOR INTERFACE */}
        {!isVerifyingAuth && isAdmin && adminUser && !authDeniedReason && (
          <>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-900 text-white gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-rose-800 text-white flex items-center justify-center font-bold text-xs tracking-wider shrink-0 shadow-sm">
                  KK
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-serif font-bold text-white tracking-wide">
                      Store Administration Console
                    </h2>
                    <span className="text-[10px] bg-rose-950 text-rose-300 font-mono px-2 py-0.5 rounded border border-rose-800 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-rose-400" />
                      <span>{isFirebaseAdmin ? 'Firebase ID Token Claim: admin=true' : 'Server Claim: role="admin"'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-400 flex-wrap">
                    <span>Admin: <strong className="text-stone-200">{adminUser.email}</strong></span>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-[11px] text-amber-300 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>Session: 24h Token</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={handleResetCatalog}
                  className="px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Reset catalog on server"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reset Catalog</span>
                </button>

                <button
                  onClick={async () => {
                    await adminLogout();
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded bg-stone-800 hover:bg-rose-900 text-stone-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
                  title="Sign out of Administrator role"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit Admin</span>
                </button>

                <button
                  onClick={onClose}
                  className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition"
                  aria-label="Close admin"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* KPI Strip */}
            <div className="bg-stone-50 border-b border-stone-200 px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-white border border-stone-200 rounded-lg shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Settled Revenue</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-lg font-mono font-bold text-stone-900 tabular-nums">
                  {formatCurrency(totalRevenue)}
                </span>
                <span className="text-[10px] text-stone-400 block mt-0.5">Verified Bank / COD Paid</span>
              </div>

              <div className="p-3 bg-white border border-stone-200 rounded-lg shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Orders in Ledger</span>
                  <ShoppingCart className="w-3.5 h-3.5 text-stone-700" />
                </div>
                <span className="text-lg font-mono font-bold text-stone-900 tabular-nums">
                  {orders.length}
                </span>
                <span className="text-[10px] text-stone-400 block mt-0.5">Server Recorded Orders</span>
              </div>

              <div className="p-3 bg-white border border-stone-200 rounded-lg shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Low Stock SKUs</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <span className="text-lg font-mono font-bold text-amber-700 tabular-nums">
                  {lowStockCount}
                </span>
                <span className="text-[10px] text-stone-400 block mt-0.5">Threshold &lt; 20 units</span>
              </div>

              <div className="p-3 bg-white border border-stone-200 rounded-lg shadow-xs">
                <div className="flex items-center justify-between text-stone-500 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Server Catalog SKUs</span>
                  <Package className="w-3.5 h-3.5 text-rose-800" />
                </div>
                <span className="text-lg font-mono font-bold text-stone-900 tabular-nums">
                  {products.length}
                </span>
                <span className="text-[10px] text-stone-400 block mt-0.5">Active Formulations</span>
              </div>
            </div>

            {/* Status notification toast */}
            {statusMessage && (
              <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800 font-medium">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-200 px-6 bg-white overflow-x-auto">
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === 'orders'
                    ? 'border-rose-900 text-rose-950'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Customer Orders ({orders.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === 'inventory'
                    ? 'border-rose-900 text-rose-950'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Inventory &amp; Formulations ({products.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('audit')}
                className={`py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === 'audit'
                    ? 'border-rose-900 text-rose-950'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Inventory Audit Trail ({auditLogs.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('new-product')}
                className={`py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === 'new-product'
                    ? 'border-rose-900 text-rose-950'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>New Formulation</span>
              </button>

              <button
                onClick={() => setActiveTab('newsletter')}
                className={`py-3 px-4 font-semibold text-xs border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
                  activeTab === 'newsletter'
                    ? 'border-rose-900 text-rose-950'
                    : 'border-transparent text-stone-500 hover:text-stone-800'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>Mailing List ({subscriptions.length})</span>
              </button>
            </div>

            {/* Body Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {loading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-stone-600" />
                  <span className="text-xs text-stone-500">Querying authoritative server database...</span>
                </div>
              ) : activeTab === 'orders' ? (
                <div className="space-y-4">
                  {orders.length === 0 ? (
                    <div className="text-center py-12 text-stone-400 text-xs">
                      No orders placed yet in the database.
                    </div>
                  ) : (
                    orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 rounded-lg border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-stone-900">
                                {order.orderNumber}
                              </span>
                              <span className="text-[10px] font-medium text-stone-400">
                                {formatDate(order.createdAt)}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                order.paymentStatus === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {order.paymentStatus === 'paid' ? 'Paid' : 'COD Pending'}
                              </span>
                            </div>
                            <span className="text-xs text-stone-600 block mt-0.5">
                              {order.customerName} ({order.customerEmail}) · {order.shippingAddress.city}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-sm text-stone-900">
                              {formatCurrency(order.totalAmount)}
                            </span>

                            <select
                              value={order.fulfillmentStatus}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                              className="text-xs font-medium py-1 px-2.5 rounded border border-stone-300 bg-white text-stone-800 focus:outline-none focus:border-rose-900"
                            >
                              <option value="pending">Pending</option>
                              <option value="processing">Processing</option>
                              <option value="shipped">Shipped</option>
                              <option value="delivered">Delivered</option>
                              <option value="cancelled">Cancelled (Auto-Restock)</option>
                            </select>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="space-y-1.5 text-xs text-stone-700">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[11px]">
                              <span>
                                {item.quantity}× {item.name} {item.variantName ? `(${item.variantName})` : ''}
                              </span>
                              <span className="font-mono text-stone-600">
                                {formatCurrency(item.lineTotal)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Courier Details */}
                        {order.trackingNumber && (
                          <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                            <span>Consignment Tracking: <strong>{order.trackingNumber}</strong></span>
                            <span>Destination: {order.shippingAddress.addressLine1}, {order.shippingAddress.city}</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === 'inventory' ? (
                <div>
                  {/* Search bar */}
                  <div className="mb-4 relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search inventory by title, SKU, or category..."
                      className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded text-xs text-stone-900 focus:outline-none focus:border-rose-900"
                    />
                  </div>

                  <div className="border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-stone-100 text-stone-600 border-b border-stone-200 font-semibold text-[11px]">
                          <th className="py-2.5 px-3">Formulation &amp; SKU</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Price</th>
                          <th className="py-2.5 px-3">Stock Units</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Quick Stock Adjustment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-200">
                        {filteredProducts.map((p) => (
                          <tr key={p.id} className="hover:bg-stone-50/70">
                            <td className="py-2.5 px-3">
                              <span className="font-medium text-stone-900 block">{p.name}</span>
                              <span className="font-mono text-[10px] text-stone-400">{p.sku}</span>
                            </td>
                            <td className="py-2.5 px-3 text-stone-600">{p.categoryName}</td>
                            <td className="py-2.5 px-3 font-mono font-medium">{formatCurrency(p.price)}</td>
                            <td className="py-2.5 px-3">
                              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                                p.stockQuantity < 10
                                  ? 'bg-rose-100 text-rose-900'
                                  : p.stockQuantity < 25
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}>
                                {p.stockQuantity} in stock
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <button
                                onClick={() => handleTogglePublish(p)}
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded transition ${
                                  p.isPublished
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                                }`}
                              >
                                {p.isPublished ? 'Published' : 'Hidden'}
                              </button>
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1">
                              <button
                                onClick={() => handleUpdateStock(p.id, p.stockQuantity + 10)}
                                className="px-2 py-1 bg-stone-200 hover:bg-stone-300 rounded font-mono text-[10px] transition"
                                title="Add 10 units"
                              >
                                +10
                              </button>
                              <button
                                onClick={() => handleUpdateStock(p.id, p.stockQuantity + 50)}
                                className="px-2 py-1 bg-stone-200 hover:bg-stone-300 rounded font-mono text-[10px] transition"
                                title="Add 50 units"
                              >
                                +50
                              </button>
                              <button
                                onClick={() => {
                                  const custom = prompt(`Set exact stock quantity for "${p.name}":`, String(p.stockQuantity));
                                  if (custom !== null && !isNaN(Number(custom))) {
                                    handleUpdateStock(p.id, Math.max(0, parseInt(custom, 10)));
                                  }
                                }}
                                className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded font-semibold text-[10px] transition"
                              >
                                Set
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : activeTab === 'audit' ? (
                <div className="space-y-2">
                  <div className="p-3 bg-stone-100 rounded text-xs text-stone-600 mb-3 flex items-center gap-2">
                    <History className="w-4 h-4 text-stone-500 shrink-0" />
                    <span>Every stock alteration is logged server-side with transactional actor tracking.</span>
                  </div>

                  <div className="divide-y divide-stone-200 border border-stone-200 rounded-lg overflow-hidden">
                    {auditLogs.length === 0 ? (
                      <div className="py-8 text-center text-stone-400 text-xs">No audit logs yet.</div>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="p-3 text-xs flex justify-between items-center hover:bg-stone-50">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded uppercase">
                                {log.reason.replace('_', ' ')}
                              </span>
                              <span className="font-mono text-stone-900 font-semibold">{log.sku}</span>
                            </div>
                            <span className="text-[10px] text-stone-400 block mt-0.5">
                              Actor: {log.actorId || 'Server Order Engine'} · {formatDate(log.createdAt)}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className={`font-mono font-bold ${
                              log.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange} units
                            </span>
                            <span className="text-[10px] text-stone-400 block font-mono">
                              New Stock: {log.newQuantity}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : activeTab === 'new-product' ? (
                /* New Product Formulation Tab */
                <form onSubmit={handleCreateProduct} className="space-y-4 max-w-2xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Formulation Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                        placeholder="e.g. Pure Bakuchiol Renewal Oil"
                        className="w-full px-3 py-2 border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:border-rose-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Brand
                      </label>
                      <input
                        type="text"
                        value={newProduct.brand}
                        onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:border-rose-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Cosmetics Category
                      </label>
                      <select
                        value={newProduct.categoryId}
                        onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value as any })}
                        className="w-full px-3 py-2 border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:border-rose-900"
                      >
                        {SEEDED_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Volume / Net Weight
                      </label>
                      <input
                        type="text"
                        value={newProduct.volumeOrWeight}
                        onChange={(e) => setNewProduct({ ...newProduct, volumeOrWeight: e.target.value })}
                        placeholder="30 ml, 50 ml, 3.8 g"
                        className="w-full px-3 py-2 border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:border-rose-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Retail Price (PKR) *
                      </label>
                      <input
                        type="number"
                        required
                        min="100"
                        value={newProduct.price}
                        onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:border-rose-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        Initial Stock Units *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newProduct.stockQuantity}
                        onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:border-rose-900 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      High-Resolution Image URL
                    </label>
                    <input
                      type="url"
                      value={newProduct.image}
                      onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:border-rose-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Description &amp; Key Benefits
                    </label>
                    <textarea
                      rows={3}
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      placeholder="Formulated with clinically-backed botanical extracts..."
                      className="w-full px-3 py-2 border border-stone-300 rounded text-xs text-stone-900 focus:outline-none focus:border-rose-900"
                    />
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-rose-900 text-white rounded-full font-semibold text-xs tracking-wider uppercase hover:bg-rose-800 transition shadow-sm"
                    >
                      Publish Formulation to Server
                    </button>
                  </div>
                </form>
              ) : activeTab === 'newsletter' ? (
                /* Newsletter Subscribers Tab */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-lg border border-stone-200">
                    <div>
                      <h4 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
                        <Mail className="w-4 h-4 text-rose-800" />
                        <span>Captured Newsletter Subscriptions ({subscriptions.length})</span>
                      </h4>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Authoritative email addresses captured in Firestore for marketing automation.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const csv = 'Email,Source,Status\n' + subscriptions.map(s => `"${s.email}","${s.source || ''}","${s.status || ''}"`).join('\n');
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `kk-newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        disabled={subscriptions.length === 0}
                        className="px-3 py-1.5 rounded bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>

                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(subscriptions.map(s => s.email).join(', '));
                          setStatusMessage(`Copied ${subscriptions.length} email addresses to clipboard.`);
                          setTimeout(() => setStatusMessage(null), 3000);
                        }}
                        disabled={subscriptions.length === 0}
                        className="px-3 py-1.5 rounded bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy All</span>
                      </button>
                    </div>
                  </div>

                  {subscriptions.length === 0 ? (
                    <div className="text-center py-12 bg-stone-50 rounded-lg border border-stone-200 text-stone-500 text-xs">
                      No newsletter subscriptions captured yet. Visitors subscribing on the storefront will appear here.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-stone-200 rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-stone-100 text-stone-700 uppercase tracking-wider font-semibold border-b border-stone-200">
                          <tr>
                            <th className="p-3">Subscriber Email</th>
                            <th className="p-3">Origin</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200 bg-white">
                          {subscriptions.map((sub) => (
                            <tr key={sub.id} className="hover:bg-stone-50 transition-colors">
                              <td className="p-3 font-mono font-medium text-stone-900">
                                {sub.email}
                              </td>
                              <td className="p-3 text-stone-500 font-mono text-[11px]">
                                {sub.source || 'storefront_footer'}
                              </td>
                              <td className="p-3">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                  {sub.status || 'active'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(sub.email);
                                    setStatusMessage(`Copied ${sub.email} to clipboard.`);
                                    setTimeout(() => setStatusMessage(null), 2500);
                                  }}
                                  className="text-stone-500 hover:text-stone-900 text-xs font-medium inline-flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
