import React, { useState } from 'react';
import { ShoppingBag, Search, Heart, User, ShieldCheck, X, LogIn, ArrowLeftRight } from 'lucide-react';
import { useCart } from '../../context/CartContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useCompare } from '../../context/CompareContext.tsx';
import { CategorySlug } from '../../types/index.ts';

interface NavbarProps {
  onSelectCategory: (cat: CategorySlug | 'all') => void;
  activeCategory: CategorySlug | 'all';
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenAccount: () => void;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  onOpenAdminLogin: () => void;
  onOpenWishlist: () => void;
  onOpenCompare?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectCategory,
  activeCategory,
  searchQuery,
  setSearchQuery,
  onOpenAccount,
  onOpenAuth,
  onOpenAdmin,
  onOpenAdminLogin,
  onOpenWishlist,
  onOpenCompare
}) => {
  const { itemCount, setIsDrawerOpen } = useCart();
  const { user, isAdmin, wishlist } = useAuth();
  const { compareIds, setIsCompareOpen } = useCompare();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleUserClick = () => {
    if (user) {
      onOpenAccount();
    } else {
      onOpenAuth();
    }
  };

  const handleAdminClick = () => {
    if (isAdmin) {
      onOpenAdmin();
    } else {
      onOpenAdminLogin();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
      {/* Promotional Top Bar */}
      <div className="bg-stone-900 px-4 py-2 text-center text-xs text-stone-200 tracking-wider flex items-center justify-center gap-3">
        <span className="font-medium">COMPLIMENTARY EXPRESS DELIVERY NATIONWIDE ON ORDERS OVER RS. 5,000</span>
        <span className="hidden sm:inline text-stone-500">·</span>
        <span className="hidden sm:inline text-stone-400">Use code <strong className="text-amber-200 tracking-widest font-mono">WELCOME10</strong> for 10% off</span>
      </div>

      {/* Main Top Bar adhering to the Top Bar Contract (3 zones separated by gap-8) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-20">

          {/* Zone 1: Single text element wordmark */}
          <button
            onClick={() => onSelectCategory('all')}
            className="flex items-center gap-2.5 text-left group shrink-0"
          >
            <div className="w-8 h-8 rounded-full bg-stone-900 text-stone-100 flex items-center justify-center font-serif text-base font-semibold shadow-sm group-hover:bg-rose-950 transition-colors">
              KK
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-serif font-bold tracking-widest text-stone-900 group-hover:text-rose-900 transition-colors whitespace-nowrap">
                KK COLLECTION
              </span>
              <span className="text-[10px] tracking-[0.25em] uppercase text-stone-500 font-sans font-medium">
                Luxury Cosmetics &amp; Skincare
              </span>
            </div>
          </button>

          {/* Zone 2: 4–5 single-line clean nav links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-stone-600">
            <button
              onClick={() => onSelectCategory('all')}
              className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeCategory === 'all' ? 'border-stone-900 text-stone-950 font-semibold' : 'border-transparent'
              }`}
            >
              All Catalog
            </button>
            <button
              onClick={() => onSelectCategory('skincare')}
              className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeCategory === 'skincare' ? 'border-stone-900 text-stone-950 font-semibold' : 'border-transparent'
              }`}
            >
              Skincare
            </button>
            <button
              onClick={() => onSelectCategory('makeup')}
              className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeCategory === 'makeup' ? 'border-stone-900 text-stone-950 font-semibold' : 'border-transparent'
              }`}
            >
              Makeup
            </button>
            <button
              onClick={() => onSelectCategory('fragrance')}
              className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeCategory === 'fragrance' ? 'border-stone-900 text-stone-950 font-semibold' : 'border-transparent'
              }`}
            >
              Fragrance
            </button>
            <button
              onClick={() => onSelectCategory('haircare')}
              className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeCategory === 'haircare' ? 'border-stone-900 text-stone-950 font-semibold' : 'border-transparent'
              }`}
            >
              Haircare
            </button>
            <button
              onClick={() => onSelectCategory('body-care')}
              className={`hover:text-stone-900 transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeCategory === 'body-care' ? 'border-stone-900 text-stone-950 font-semibold' : 'border-transparent'
              }`}
            >
              Body Care
            </button>
          </nav>

          {/* Zone 3: Interactive Affordances (Search, Wishlist, Account, Cart Drawer) */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Search Input / Trigger */}
            <div className="relative">
              {isSearchOpen ? (
                <div className="flex items-center bg-white border border-stone-300 rounded-full px-3 py-1.5 shadow-sm">
                  <Search className="w-4 h-4 text-stone-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search serums, shades, fragrance..."
                    className="w-40 sm:w-64 text-xs text-stone-800 placeholder-stone-400 bg-transparent focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-stone-400 hover:text-stone-600 ml-1 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsSearchOpen(false)}
                    className="text-stone-400 hover:text-stone-700 ml-2 text-xs"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="p-2 text-stone-700 hover:text-stone-950 rounded-full hover:bg-stone-200/60 transition-colors"
                  aria-label="Search Catalog"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Wishlist button */}
            <button
              onClick={onOpenWishlist}
              className="relative p-2 text-stone-700 hover:text-rose-900 rounded-full hover:bg-stone-200/60 transition-colors"
              aria-label="Saved Wishlist"
              title="Saved Wishlist"
            >
              <Heart className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-800 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Formulation Comparison Button */}
            <button
              onClick={() => {
                if (onOpenCompare) onOpenCompare();
                else setIsCompareOpen(true);
              }}
              className="relative p-2 text-stone-700 hover:text-stone-950 rounded-full hover:bg-stone-200/60 transition-colors"
              aria-label="Formulation Comparison"
              title="Compare Formulations Side-by-Side"
            >
              <ArrowLeftRight className="w-5 h-5" />
              {compareIds.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-stone-900 text-rose-300 text-[10px] font-bold flex items-center justify-center font-mono ring-1 ring-white">
                  {compareIds.length}
                </span>
              )}
            </button>

            {/* Customer Account or Sign In Button */}
            <button
              onClick={handleUserClick}
              className="p-2 text-stone-700 hover:text-stone-950 rounded-full hover:bg-stone-200/60 transition-colors flex items-center gap-1.5"
              aria-label={user ? 'Client Account' : 'Sign In'}
            >
              {user ? (
                <>
                  <User className="w-5 h-5" />
                  <span className="hidden xl:inline text-xs font-medium text-stone-700 truncate max-w-[100px]">
                    {user.displayName.split(' ')[0]}
                  </span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span className="hidden sm:inline text-xs font-semibold text-stone-700">
                    Sign In
                  </span>
                </>
              )}
            </button>

            {/* Protected Admin Trigger (Requires Authenticated Admin Token) */}
            <button
              onClick={handleAdminClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                isAdmin
                  ? 'bg-amber-100/90 border-amber-300 text-amber-900 font-semibold'
                  : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200/70'
              }`}
              title={isAdmin ? 'Administrator Console (Verified)' : 'Administrator Login'}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-stone-800" />
              <span className="hidden sm:inline">Admin</span>
            </button>

            {/* Primary Action: Shopping Bag Trigger */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-stone-900 text-stone-100 hover:bg-stone-800 active:scale-95 transition-all shadow-sm"
              aria-label="Shopping Bag"
            >
              <ShoppingBag className="w-4 h-4 text-rose-300" />
              <span className="text-xs font-semibold tracking-wide">Bag</span>
              <span className="w-5 h-5 rounded-full bg-rose-700 text-white text-[11px] font-bold flex items-center justify-center font-mono">
                {itemCount}
              </span>
            </button>
          </div>

        </div>

        {/* Secondary Category Scroll for Mobile and Tablet */}
        <div className="lg:hidden flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none border-t border-stone-200/60 text-xs">
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeCategory === 'all'
                ? 'bg-stone-900 text-white font-medium'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            All Products
          </button>
          <button
            onClick={() => onSelectCategory('skincare')}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeCategory === 'skincare'
                ? 'bg-stone-900 text-white font-medium'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Skincare
          </button>
          <button
            onClick={() => onSelectCategory('makeup')}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeCategory === 'makeup'
                ? 'bg-stone-900 text-white font-medium'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Makeup
          </button>
          <button
            onClick={() => onSelectCategory('fragrance')}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeCategory === 'fragrance'
                ? 'bg-stone-900 text-white font-medium'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Fragrance
          </button>
          <button
            onClick={() => onSelectCategory('haircare')}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeCategory === 'haircare'
                ? 'bg-stone-900 text-white font-medium'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Haircare
          </button>
          <button
            onClick={() => onSelectCategory('body-care')}
            className={`px-3 py-1 rounded-full whitespace-nowrap transition-colors ${
              activeCategory === 'body-care'
                ? 'bg-stone-900 text-white font-medium'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            Body Care
          </button>
        </div>
      </div>
    </header>
  );
};
