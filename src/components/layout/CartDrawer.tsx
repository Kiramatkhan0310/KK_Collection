import React from 'react';
import { X, Trash2, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/currency';

interface CartDrawerProps {
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onProceedToCheckout }) => {
  const { items, isDrawerOpen, setIsDrawerOpen, updateQuantity, removeItem, subtotal, itemCount } = useCart();

  if (!isDrawerOpen) return null;

  const freeDeliveryThreshold = 5000;
  const isFreeDelivery = subtotal >= freeDeliveryThreshold;
  const amountNeededForFree = freeDeliveryThreshold - subtotal;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-[#FAF8F5] shadow-2xl flex flex-col border-l border-stone-200">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 bg-white">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-stone-900" />
              <h2 className="text-base font-serif font-bold text-stone-900 tracking-wide">
                Your Shopping Bag
              </h2>
              <span className="text-xs text-stone-500 font-mono">({itemCount})</span>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
              aria-label="Close Bag"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Delivery progress bar */}
          <div className="px-6 py-3 bg-stone-100 border-b border-stone-200 text-xs">
            {isFreeDelivery ? (
              <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Complimentary Express Shipping Unlocked!</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex justify-between text-stone-600 text-[11px]">
                  <span>Add <strong className="text-stone-900 font-semibold">{formatCurrency(amountNeededForFree)}</strong> more for Free Delivery</span>
                  <span className="font-mono">{Math.round((subtotal / freeDeliveryThreshold) * 100)}%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-stone-900 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (subtotal / freeDeliveryThreshold) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-stone-200/80">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16">
                <div className="w-16 h-16 rounded-full bg-stone-200/60 flex items-center justify-center mb-4 text-stone-400">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h3 className="font-serif text-lg font-bold text-stone-900 mb-1">Your bag is empty</h3>
                <p className="text-xs text-stone-500 max-w-xs mb-6">
                  Explore our luxury skincare, luminous foundations, and artisanal fragrances.
                </p>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-6 py-2.5 bg-stone-900 text-white rounded-full text-xs font-semibold hover:bg-stone-800 transition"
                >
                  Explore Collection
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={`${item.productId}-${item.variantId || 'base'}`} className="py-4 flex gap-4">
                  {/* Thumbnail with fallback */}
                  <div className="w-20 h-20 rounded-md overflow-hidden bg-stone-100 border border-stone-200 shrink-0 relative">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Resilient fallback container if image fails
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>

                  {/* Metadata and Controls */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-semibold text-stone-900 line-clamp-1">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => removeItem(item.productId, item.variantId)}
                          className="text-stone-400 hover:text-rose-700 transition p-1"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quiet unboxed metadata */}
                      {item.variantName && (
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Option: <span className="font-medium text-stone-700">{item.variantName}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      {/* Stepper */}
                      <div className="flex items-center border border-stone-300 rounded-full bg-white shadow-xs">
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, -1, 999)}
                          className="w-7 h-7 flex items-center justify-center text-xs text-stone-600 hover:text-stone-950 hover:bg-stone-100 rounded-l-full transition"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="w-7 text-center text-xs font-semibold font-mono text-stone-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.variantId, 1, 999)}
                          className="w-7 h-7 flex items-center justify-center text-xs text-stone-600 hover:text-stone-950 hover:bg-stone-100 rounded-r-full transition"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      {/* Line Price with Tabular Numerals */}
                      <span className="text-xs font-semibold font-mono text-stone-950 tabular-nums">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {items.length > 0 && (
            <div className="border-t border-stone-200 px-6 py-5 bg-white space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-semibold text-stone-950 tabular-nums">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Estimated Delivery</span>
                  <span className="font-mono text-stone-950 tabular-nums">
                    {isFreeDelivery ? 'Free' : formatCurrency(250)}
                  </span>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-2 flex justify-between text-sm font-bold text-stone-900 font-serif">
                <span>Estimated Total</span>
                <span className="font-mono tabular-nums text-base">
                  {formatCurrency(subtotal + (isFreeDelivery ? 0 : 250))}
                </span>
              </div>

              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  onProceedToCheckout();
                }}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-full bg-stone-900 text-stone-100 hover:bg-stone-800 active:scale-[0.99] font-medium text-xs tracking-wider uppercase transition shadow-md"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-stone-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
                <span>Cash on Delivery &amp; Verified Security</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
