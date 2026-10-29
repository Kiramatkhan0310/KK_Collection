import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext.tsx';
import { CartProvider, useCart } from './context/CartContext.tsx';
import { CompareProvider, useCompare } from './context/CompareContext.tsx';
import { Navbar } from './components/layout/Navbar.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { CartDrawer } from './components/layout/CartDrawer.tsx';
import { HeroBanner } from './components/home/HeroBanner.tsx';
import { CuratedSpotlights } from './components/home/CuratedSpotlights.tsx';
import { NewsletterSection } from './components/home/NewsletterSection.tsx';
import { ProductCard } from './components/product/ProductCard.tsx';
import { ProductDetailModal } from './components/product/ProductDetailModal.tsx';
import { ProductComparisonModal } from './components/product/ProductComparisonModal.tsx';
import { CompareFloatingBar } from './components/product/CompareFloatingBar.tsx';
import { CheckoutModal } from './pages/CheckoutModal.tsx';
import { OrderConfirmationModal } from './pages/OrderConfirmationModal.tsx';
import { AccountModal } from './pages/AccountModal.tsx';
import { AdminModal } from './pages/AdminModal.tsx';
import { AuthModal } from './components/auth/AuthModal.tsx';
import { AdminLoginModal } from './components/admin/AdminLoginModal.tsx';
import { PaymentGatewayModal } from './components/checkout/PaymentGatewayModal.tsx';
import { CourierTrackingModal } from './components/courier/CourierTrackingModal.tsx';
import { QuickTrackLookupModal } from './components/courier/QuickTrackLookupModal.tsx';
import { PolicyModal } from './components/policies/PolicyModal.tsx';
import { ApiClient } from './services/apiClient.ts';
import { SEEDED_CATEGORIES, SEEDED_PRODUCTS } from './data/catalogData.ts';
import { CategorySlug, Product, Order } from './types/index.ts';
import { Sparkles, SlidersHorizontal, Check, Loader2 } from 'lucide-react';

function Storefront() {
  const { toastMessage } = useCart();
  const { isCompareOpen, setIsCompareOpen } = useCompare();

  // Navigation & Filtering State
  const [activeCategory, setActiveCategory] = useState<CategorySlug | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating' | 'name'>('featured');
  const [onlyInStock, setOnlyInStock] = useState(false);

  // Modals & Dialogs State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [paymentPendingOrder, setPaymentPendingOrder] = useState<Order | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [accountInitialTab, setAccountInitialTab] = useState<'orders' | 'wishlist' | 'address'>('orders');
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [trackedConsignment, setTrackedConsignment] = useState<string | null>(null);
  const [isQuickTrackOpen, setIsQuickTrackOpen] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState<'returns' | 'shipping' | 'ingredients' | 'privacy' | null>(null);

  // Authoritative Server Catalog State
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [catalogVersion, setCatalogVersion] = useState(0);

  // Fetch products from server API
  useEffect(() => {
    let isMounted = true;
    async function loadCatalog() {
      setLoadingProducts(true);
      try {
        const res = await ApiClient.getProducts({
          category: activeCategory !== 'all' ? activeCategory : undefined,
          search: searchQuery || undefined,
          inStock: onlyInStock,
          sort: sortBy
        });
        if (isMounted) {
          setProducts(res.products || []);
        }
            } catch (err) {
        console.warn(
          'Server API unavailable. Using the local demo catalogue.',
          err
        );

        if (isMounted) {
          let fallbackProducts = SEEDED_PRODUCTS.filter(
            (product) => product.isPublished
          );

          // Filter by selected category
          if (activeCategory !== 'all') {
            fallbackProducts = fallbackProducts.filter(
              (product) => product.categoryId === activeCategory
            );
          }

          // Filter by search text
          if (searchQuery.trim()) {
            const query = searchQuery.trim().toLowerCase();

            fallbackProducts = fallbackProducts.filter((product) =>
              [
                product.name,
                product.brand,
                product.description,
                product.categoryName,
                product.sku,
              ].some((value) => value?.toLowerCase().includes(query))
            );
          }

          // Show products that have stock
          if (onlyInStock) {
            fallbackProducts = fallbackProducts.filter(
              (product) => product.stockQuantity > 0
            );
          }

          // Apply the selected sorting option
          fallbackProducts.sort((a, b) => {
            switch (sortBy) {
              case 'price-low':
                return a.price - b.price;

              case 'price-high':
                return b.price - a.price;

              case 'rating':
                return (b.rating ?? 0) - (a.rating ?? 0);

              case 'name':
                return a.name.localeCompare(b.name);

              case 'featured':
              default:
                return (
                  Number(b.isFeatured) - Number(a.isFeatured) ||
                  a.name.localeCompare(b.name)
                );
            }
          });

          setProducts(fallbackProducts);
        }
      } finally {
        if (isMounted) setLoadingProducts(false);
      }
    }
    loadCatalog();
    return () => { isMounted = false; };
  }, [activeCategory, searchQuery, onlyInStock, sortBy, catalogVersion]);

  const activeCategoryObj = SEEDED_CATEGORIES.find((c) => c.id === activeCategory);

  const handleSelectCategory = (cat: CategorySlug | 'all') => {
    setActiveCategory(cat);
    const el = document.getElementById('catalog-grid-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleOrderCompleted = (order: Order, needsPayment: boolean) => {
    setCatalogVersion((v) => v + 1);
    if (needsPayment) {
      setPaymentPendingOrder(order);
    } else {
      setCompletedOrder(order);
    }
  };

  const handlePaymentSettled = (updatedOrder: Order) => {
    setPaymentPendingOrder(null);
    setCompletedOrder(updatedOrder);
    setCatalogVersion((v) => v + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5]">

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-stone-100 text-xs px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 border border-stone-700 animate-in fade-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar adhering to the Top Bar Contract */}
      <Navbar
        onSelectCategory={handleSelectCategory}
        activeCategory={activeCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAccount={() => {
          setAccountInitialTab('orders');
          setIsAccountOpen(true);
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
        onOpenWishlist={() => {
          setAccountInitialTab('wishlist');
          setIsAccountOpen(true);
        }}
        onOpenCompare={() => setIsCompareOpen(true)}
      />

      <main className="flex-1">

        {/* Editorial Campaign Hero */}
        {activeCategory === 'all' && !searchQuery && (
          <>
            <HeroBanner onSelectCategory={handleSelectCategory} />
            <CuratedSpotlights onSelectCategory={handleSelectCategory} />
          </>
        )}

        {/* Catalog Section */}
        <section id="catalog-grid-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 scroll-mt-24">

          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-4 border-b border-stone-200">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-800">
                <span>{activeCategory === 'all' ? 'Authoritative Inventory' : activeCategoryObj?.name}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-stone-500">{products.length} Formulations</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
                {activeCategory === 'all'
                  ? searchQuery
                    ? `Results for "${searchQuery}"`
                    : 'The Complete Cosmetics Collection'
                  : activeCategoryObj?.name}
              </h2>
              {activeCategoryObj?.description && (
                <p className="text-xs text-stone-500 mt-1 max-w-xl">
                  {activeCategoryObj.description}
                </p>
              )}
            </div>

            {/* Controls Strip: Sorting & Filter Toggles */}
            <div className="flex flex-wrap items-center gap-3 text-xs">

              {/* Only In Stock Toggle */}
              <label className="flex items-center gap-2 cursor-pointer bg-white border border-stone-200 px-3 py-1.5 rounded-full shadow-xs hover:border-stone-300 transition text-stone-700">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="rounded text-stone-900 focus:ring-0"
                />
                <span className="font-medium">In Stock Only</span>
              </label>

              {/* Sort By Select */}
              <div className="flex items-center gap-1.5 bg-white border border-stone-200 px-3 py-1.5 rounded-full shadow-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-stone-500" />
                <span className="text-stone-500">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (
                      value === 'featured' ||
                      value === 'price-low' ||
                      value === 'price-high' ||
                      value === 'rating' ||
                      value === 'name'
                    ) {
                      setSortBy(value);
                    }
                  }}
                  className="bg-transparent font-medium text-stone-900 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="featured">Featured First</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                  <option value="name">Alphabetical</option>
                </select>
              </div>

              {/* Reset filter button if searched or filtered */}
              {(activeCategory !== 'all' || searchQuery || onlyInStock) && (
                <button
                  onClick={() => {
                    setActiveCategory('all');
                    setSearchQuery('');
                    setOnlyInStock(false);
                  }}
                  className="text-stone-500 hover:text-stone-900 underline text-xs ml-1"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Bar (Interactive Buttons) */}
          <div className="mb-8 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap transition-all shadow-xs ${
                activeCategory === 'all'
                  ? 'bg-stone-900 text-stone-100'
                  : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-400'
              }`}
            >
              All Formulations
            </button>
            {SEEDED_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap transition-all shadow-xs ${
                    isActive
                      ? 'bg-stone-900 text-stone-100'
                      : 'bg-white text-stone-700 border border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Product Grid */}
          {loadingProducts ? (
            <div className="py-24 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-stone-800" />
              <p className="text-xs text-stone-500 font-medium">Synchronizing authoritative catalog from server...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-stone-200 p-8">
              <Sparkles className="w-10 h-10 text-stone-400 mx-auto mb-3 stroke-[1.5]" />
              <h3 className="font-serif text-lg font-bold text-stone-900 mb-1">
                No formulations matched your query
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto mb-6">
                Try clearing your search terms or exploring our complete skincare and makeup collections.
              </p>
              <button
                onClick={() => {
                  setActiveCategory('all');
                  setSearchQuery('');
                  setOnlyInStock(false);
                }}
                className="px-6 py-2.5 rounded-full bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition"
              >
                Reset Catalog View
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpenDetails={(p) => setSelectedProduct(p)}
                />
              ))}
            </div>
          )}

        </section>

      </main>

      {/* Cart Drawer */}
      <CartDrawer onProceedToCheckout={() => setIsCheckoutOpen(true)} />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderCompleted={handleOrderCompleted}
      />

      {/* Payment Gateway Modal (for online payment verification) */}
      <PaymentGatewayModal
        order={paymentPendingOrder}
        isOpen={Boolean(paymentPendingOrder)}
        onClose={() => setPaymentPendingOrder(null)}
        onPaymentSettled={handlePaymentSettled}
      />

      {/* Order Confirmation Receipt Modal */}
      <OrderConfirmationModal
        order={completedOrder}
        onClose={() => setCompletedOrder(null)}
      />

      {/* Customer Account & Wishlist Modal */}
      <AccountModal
        isOpen={isAccountOpen}
        initialTab={accountInitialTab}
        onClose={() => setIsAccountOpen(false)}
        onOpenProductDetails={(p) => setSelectedProduct(p)}
        onTrackOrder={(cn) => {
          setIsAccountOpen(false);
          setTrackedConsignment(cn);
        }}
        allProducts={products}
        onOpenAuth={() => {
          setIsAccountOpen(false);
          setIsAuthOpen(true);
        }}
      />

      {/* Client Sign In & Registration Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* Dedicated Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={() => setIsAdminOpen(true)}
      />

      {/* Admin Portal Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        onRefreshCatalog={() => setCatalogVersion((v) => v + 1)}
        onOpenAdminLogin={() => {
          setIsAdminOpen(false);
          setIsAdminLoginOpen(true);
        }}
      />

      {/* Live Courier Tracking Modal */}
      <CourierTrackingModal
        consignmentNumber={trackedConsignment}
        isOpen={Boolean(trackedConsignment)}
        onClose={() => setTrackedConsignment(null)}
      />

      {/* Quick Consignment Tracking Lookup */}
      <QuickTrackLookupModal
        isOpen={isQuickTrackOpen}
        onClose={() => setIsQuickTrackOpen(false)}
        onTrack={(cn) => setTrackedConsignment(cn)}
      />

      {/* Institutional Store Policy Modal */}
      <PolicyModal
        isOpen={Boolean(activePolicyTab)}
        initialTab={activePolicyTab || 'returns'}
        onClose={() => setActivePolicyTab(null)}
      />

      {/* Product Comparison Atelier Modal */}
      <ProductComparisonModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        allProducts={products}
        onOpenProductDetails={(p) => {
          setIsCompareOpen(false);
          setSelectedProduct(p);
        }}
      />

      {/* Sticky Bottom Comparison Floating Dock */}
      <CompareFloatingBar allProducts={products} />

      {/* Newsletter Signup Section */}
      <NewsletterSection />

      {/* Footer */}
      <Footer
        onSelectCategory={handleSelectCategory}
        onOpenPolicy={(tab) => setActivePolicyTab(tab)}
        onOpenTrackLookup={() => setIsQuickTrackOpen(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <CompareProvider>
          <Storefront />
        </CompareProvider>
      </CartProvider>
    </AuthProvider>
  );
}
