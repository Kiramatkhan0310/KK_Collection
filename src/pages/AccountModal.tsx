import React, { useState, useEffect } from 'react';
import { X, Package, Heart, MapPin, LogOut, Trash2, ShoppingBag, Truck, ExternalLink, Loader2, Sparkles, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useCart } from '../context/CartContext.tsx';
import { ApiClient } from '../services/apiClient.ts';
import { formatCurrency, formatDate } from '../utils/currency.ts';
import { Product, Order } from '../types/index.ts';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenProductDetails: (product: Product) => void;
  onTrackOrder: (consignmentNumber: string) => void;
  allProducts: Product[];
  initialTab?: 'orders' | 'wishlist' | 'address';
  onOpenAuth?: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onOpenProductDetails,
  onTrackOrder,
  allProducts,
  initialTab = 'orders',
  onOpenAuth
}) => {
  const { user, customerLogout, wishlist, toggleWishlist, clearWishlist, updateDefaultAddress } = useAuth();
  const { addItem, setToastMessage } = useCart();

  const [activeTab, setActiveTab] = useState<'orders' | 'wishlist' | 'address'>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [addressSavedMsg, setAddressSavedMsg] = useState(false);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const wishlistedProducts = allProducts.filter((p) => wishlist.includes(p.id));

  const getCategoryFallback = (categoryId: string) => {
    switch (categoryId) {
      case 'skincare':
        return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80';
      case 'makeup':
        return 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80';
      case 'lip-care':
        return 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80';
      case 'haircare':
        return 'https://images.unsplash.com/photo-1519735777090-ec97162dc266?auto=format&fit=crop&w=800&q=80';
      case 'fragrance':
        return 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80';
      case 'body-care':
        return 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?auto=format&fit=crop&w=800&q=80';
      case 'beauty-tools':
        return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80';
      default:
        return 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=800&q=80';
    }
  };

  const [addressForm, setAddressForm] = useState({
    fullName: user?.defaultAddress?.fullName || user?.displayName || '',
    phone: user?.defaultAddress?.phone || user?.phoneNumber || '',
    addressLine1: user?.defaultAddress?.addressLine1 || '',
    city: user?.defaultAddress?.city || 'Karachi',
    stateOrProvince: user?.defaultAddress?.stateOrProvince || 'Sindh',
    postalCode: user?.defaultAddress?.postalCode || '75500',
    country: 'Pakistan'
  });

  useEffect(() => {
    if (!isOpen || !user) return;
    setAddressForm({
      fullName: user.defaultAddress?.fullName || user.displayName || '',
      phone: user.defaultAddress?.phone || user.phoneNumber || '',
      addressLine1: user.defaultAddress?.addressLine1 || '',
      city: user.defaultAddress?.city || 'Karachi',
      stateOrProvince: user.defaultAddress?.stateOrProvince || 'Sindh',
      postalCode: user.defaultAddress?.postalCode || '75500',
      country: 'Pakistan'
    });
  }, [isOpen, user]);

  useEffect(() => {
    let mounted = true;
    async function loadOrders() {
      if (!isOpen || !user) return;
      setLoadingOrders(true);
      try {
        const res = await ApiClient.getMyOrders();
        if (mounted) setOrders(res.orders || []);
      } catch (err) {
        console.error('Failed to load user orders', err);
      } finally {
        if (mounted) setLoadingOrders(false);
      }
    }
    loadOrders();
    return () => {
      mounted = false;
    };
  }, [isOpen, user]);

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDefaultAddress(addressForm);
      setAddressSavedMsg(true);
      setTimeout(() => setAddressSavedMsg(false), 2000);
    } catch {
      // handled
    }
  };

  if (!isOpen) return null;

  const handleLogout = async () => {
    await customerLogout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div
        className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden border border-stone-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-stone-900 text-white flex items-center justify-center font-serif text-lg font-bold">
              {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'K'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-serif font-bold text-stone-900">
                  {user ? user.displayName : 'Atelier Patron'}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-200 text-stone-800">
                  {user ? 'Verified Client' : 'Guest Wishlist'}
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono">
                {user ? user.email : 'Local Session · Sign in to sync across devices'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <button
                onClick={handleLogout}
                className="text-xs font-semibold px-3 py-1.5 rounded-full border border-stone-300 text-stone-700 hover:bg-stone-200/70 flex items-center gap-1.5 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              onOpenAuth && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuth();
                  }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-stone-900 text-white hover:bg-stone-800 flex items-center gap-1.5 transition"
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>
              )
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-stone-200 px-6 bg-white gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('wishlist')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'wishlist'
                ? 'border-rose-900 text-rose-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-800" />
            <span>Saved Wishlist ({wishlistedProducts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'orders'
                ? 'border-stone-900 text-stone-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>My Orders ({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('address')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 transition ${
              activeTab === 'address'
                ? 'border-stone-900 text-stone-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Delivery Coordinates</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* 1. Dedicated Wishlist Tab */}
          {activeTab === 'wishlist' && (
            <div className="space-y-4">
              {wishlistedProducts.length === 0 ? (
                <div className="text-center py-14 px-4 bg-stone-50 rounded-xl border border-stone-200/90 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-900 flex items-center justify-center mx-auto">
                    <Heart className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      Your Saved Wishlist is Empty
                    </h3>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Curate your private selection of barrier-repair skincare, silk foundations, and botanical parfums. Tap the heart icon on any product card to save it here.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-stone-900 text-white text-xs font-serif font-bold tracking-wider uppercase hover:bg-stone-800 transition shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-rose-300" />
                    <span>Explore Formulations</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Top Bar for Wishlist Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50 p-3.5 rounded-lg border border-stone-200/90 text-xs">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-800 fill-current" />
                      <span className="font-semibold text-stone-900">
                        {wishlistedProducts.length} Saved {wishlistedProducts.length === 1 ? 'Formulation' : 'Formulations'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          let count = 0;
                          wishlistedProducts.forEach((p) => {
                            if (p.stockQuantity > 0) {
                              const price = p.salePrice && p.salePrice > 0 ? p.salePrice : p.price;
                              addItem(
                                {
                                  productId: p.id,
                                  name: p.name,
                                  sku: p.sku,
                                  price,
                                  image: p.images[0] || getCategoryFallback(p.categoryId),
                                  quantity: 1,
                                  categoryName: p.categoryName
                                },
                                p.stockQuantity
                              );
                              count++;
                            }
                          });
                          if (setToastMessage) {
                            setToastMessage(`Added ${count} in-stock formulations to your shopping bag.`);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-xs"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Move All to Bag</span>
                      </button>

                      <button
                        onClick={async () => {
                          await clearWishlist();
                          if (setToastMessage) {
                            setToastMessage('Cleared all items from your wishlist.');
                          }
                        }}
                        className="px-3 py-1.5 rounded-full border border-stone-300 text-stone-600 hover:bg-stone-200/70 text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All</span>
                      </button>
                    </div>
                  </div>

                  {/* Wishlisted Product Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {wishlistedProducts.map((p) => {
                      const hasDiscount = Boolean(p.salePrice && p.salePrice > 0 && p.salePrice < p.price);
                      const effectivePrice = hasDiscount ? p.salePrice! : p.price;
                      const isOutOfStock = p.stockQuantity <= 0;
                      const isLowStock = p.stockQuantity > 0 && p.stockQuantity <= 10;
                      const fallbackImg = getCategoryFallback(p.categoryId);

                      return (
                        <div
                          key={p.id}
                          className="relative flex flex-col justify-between bg-white border border-stone-200 rounded-xl overflow-hidden p-3.5 hover:border-stone-400/80 transition-all shadow-xs group"
                        >
                          <div className="flex gap-3.5">
                            {/* Product Thumbnail with resilient fallback */}
                            <div
                              onClick={() => {
                                onClose();
                                onOpenProductDetails(p);
                              }}
                              className="relative w-20 h-20 bg-stone-100 rounded-lg overflow-hidden shrink-0 cursor-pointer border border-stone-200"
                            >
                              <img
                                src={p.images[0] || fallbackImg}
                                alt={p.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = fallbackImg;
                                }}
                              />
                              {hasDiscount && (
                                <span className="absolute top-1 left-1 bg-rose-800 text-white text-[9px] font-bold px-1 py-0.2 rounded">
                                  Sale
                                </span>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider truncate">
                                    {p.brand} · {p.categoryName}
                                  </span>
                                  {/* Remove Heart Button */}
                                  <button
                                    onClick={() => toggleWishlist(p.id)}
                                    className="text-rose-800 hover:text-stone-400 p-1 transition"
                                    title="Remove from wishlist"
                                    aria-label="Remove from wishlist"
                                  >
                                    <Heart className="w-4 h-4 fill-current" />
                                  </button>
                                </div>

                                <h4
                                  onClick={() => {
                                    onClose();
                                    onOpenProductDetails(p);
                                  }}
                                  className="text-xs font-semibold text-stone-900 hover:text-rose-900 transition-colors line-clamp-1 cursor-pointer mt-0.5"
                                >
                                  {p.name}
                                </h4>

                                <div className="flex items-baseline gap-2 mt-1">
                                  <span className="text-xs font-mono font-bold text-stone-950 tabular-nums">
                                    {formatCurrency(effectivePrice, p.currency)}
                                  </span>
                                  {hasDiscount && (
                                    <span className="text-[11px] font-mono text-stone-400 line-through tabular-nums">
                                      {formatCurrency(p.price, p.currency)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Stock status indicator */}
                              <div className="pt-1">
                                {isOutOfStock ? (
                                  <span className="text-[10px] text-stone-400 font-medium">Sold Out</span>
                                ) : isLowStock ? (
                                  <span className="text-[10px] text-amber-700 font-medium">
                                    Only {p.stockQuantity} left
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-emerald-700 font-medium">In Stock</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons Footer */}
                          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (isOutOfStock) return;
                                addItem(
                                  {
                                    productId: p.id,
                                    name: p.name,
                                    sku: p.sku,
                                    price: effectivePrice,
                                    image: p.images[0] || fallbackImg,
                                    quantity: 1,
                                    categoryName: p.categoryName
                                  },
                                  p.stockQuantity
                                );
                                if (setToastMessage) {
                                  setToastMessage(`Added "${p.name}" to your bag.`);
                                }
                              }}
                              disabled={isOutOfStock}
                              className={`flex-1 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                                isOutOfStock
                                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                  : 'bg-stone-900 hover:bg-stone-800 text-white shadow-xs'
                              }`}
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>{isOutOfStock ? 'Sold Out' : 'Add to Bag'}</span>
                            </button>

                            <button
                              onClick={() => {
                                onClose();
                                onOpenProductDetails(p);
                              }}
                              className="py-1.5 px-3 rounded-full border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {!user ? (
                <div className="text-center py-12 text-stone-500 text-xs">
                  <Package className="w-8 h-8 mx-auto mb-2 text-stone-400 stroke-[1.5]" />
                  <p className="font-medium text-stone-800">Sign in to view order receipts</p>
                  <p className="mt-1">Authenticated client accounts have instant access to delivery tracking.</p>
                </div>
              ) : loadingOrders ? (
                <div className="py-12 flex justify-center items-center">
                  <Loader2 className="w-6 h-6 animate-spin text-stone-700" />
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 text-stone-500 text-xs">
                  <Package className="w-8 h-8 mx-auto mb-2 text-stone-400 stroke-[1.5]" />
                  <p className="font-medium text-stone-800">No past orders found</p>
                  <p className="mt-1">Items you purchase will appear here with live courier airway tracking.</p>
                </div>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2 text-xs">
                      <div>
                        <span className="font-mono font-bold text-stone-900 mr-2">{o.orderNumber}</span>
                        <span className="text-stone-500">{formatDate(o.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            o.fulfillmentStatus === 'delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.fulfillmentStatus === 'shipped'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {o.fulfillmentStatus}
                        </span>
                        <span className="font-mono font-bold text-stone-950 tabular-nums">
                          {formatCurrency(o.totalAmount, o.currency)}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-stone-100 text-xs">
                      {o.items.map((item, idx) => (
                        <div key={idx} className="py-1.5 flex justify-between">
                          <span className="text-stone-800">
                            {item.quantity}x {item.name} {item.variantName ? `(${item.variantName})` : ''}
                          </span>
                          <span className="font-mono text-stone-600 tabular-nums">
                            {formatCurrency(item.lineTotal)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-stone-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="text-stone-500">
                        Payment:{' '}
                        <strong className="uppercase font-mono text-stone-800">
                          {o.paymentMethod.replace('_', ' ')}
                        </strong>{' '}
                        · ({o.paymentStatus})
                      </div>

                      {o.trackingNumber && (
                        <button
                          onClick={() => onTrackOrder(o.trackingNumber!)}
                          className="px-3 py-1 bg-stone-900 text-white rounded text-xs font-semibold hover:bg-stone-800 flex items-center gap-1.5 transition"
                        >
                          <Truck className="w-3.5 h-3.5 text-rose-300" />
                          <span>Track TCS Consignment ({o.trackingNumber})</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. Address Tab */}
          {activeTab === 'address' && (
            <form onSubmit={handleSaveAddress} className="space-y-4 max-w-lg">
              {addressSavedMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md">
                  Default delivery address updated on server successfully!
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={addressForm.fullName}
                  onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded px-3 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Delivery Address</label>
                <input
                  type="text"
                  required
                  value={addressForm.addressLine1}
                  onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Province</label>
                  <input
                    type="text"
                    required
                    value={addressForm.stateOrProvince}
                    onChange={(e) => setAddressForm({ ...addressForm, stateOrProvince: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-stone-900 text-white rounded-full text-xs font-semibold hover:bg-stone-800 transition"
              >
                Save Delivery Coordinates
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
