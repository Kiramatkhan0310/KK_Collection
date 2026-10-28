import React, { useState } from 'react';
import { Heart, Plus, Check, ArrowLeftRight } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/currency';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useCompare } from '../../context/CompareContext';

interface ProductCardProps {
  product: Product;
  onOpenDetails: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onOpenDetails }) => {
  const { addItem, setToastMessage } = useCart();
  const { isWishlisted, toggleWishlist } = useAuth();
  const { isInCompare, toggleCompare } = useCompare();
  const [justAdded, setJustAdded] = useState(false);

  const categoryFallback =
    product.categoryId === 'skincare'
      ? 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80'
      : product.categoryId === 'makeup'
      ? 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80'
      : product.categoryId === 'lip-care'
      ? 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80'
      : product.categoryId === 'haircare'
      ? 'https://images.unsplash.com/photo-1519735777090-ec97162dc266?auto=format&fit=crop&w=800&q=80'
      : product.categoryId === 'fragrance'
      ? 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80'
      : product.categoryId === 'body-care'
      ? 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?auto=format&fit=crop&w=800&q=80'
      : product.categoryId === 'beauty-tools'
      ? 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80'
      : 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=800&q=80';

  const [currentImg, setCurrentImg] = useState<string>(product.images[0] || categoryFallback);
  const [hasTriedFallback, setHasTriedFallback] = useState(false);

  const isOutOfStock = product.stockQuantity <= 0;
  const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= 10;
  const hasVariants = product.variants && product.variants.length > 0;
  const hasDiscount = Boolean(product.salePrice && product.salePrice > 0 && product.salePrice < product.price);
  const effectivePrice = hasDiscount ? product.salePrice! : product.price;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;

    if (hasVariants) {
      // If product has shade or size variants, open modal so user picks variant
      onOpenDetails(product);
      return;
    }

    const res = addItem(
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        price: effectivePrice,
        image: currentImg,
        quantity: 1,
        categoryName: product.categoryName
      },
      product.stockQuantity
    );

    if (res.success) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 1500);
    }
  };

  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowSaved = await toggleWishlist(product.id);
    if (setToastMessage) {
      setToastMessage(
        isNowSaved
          ? `Added "${product.name}" to your wishlist.`
          : `Removed "${product.name}" from your wishlist.`
      );
    }
  };

  const saved = isWishlisted(product.id);
  const compared = isInCompare(product.id);

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompare(product);
  };

  return (
    <div
      onClick={() => onOpenDetails(product)}
      className="group relative flex flex-col bg-white border border-stone-200/90 rounded-lg overflow-hidden cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Product Image Frame */}
      <div className="relative aspect-square w-full overflow-hidden bg-stone-100 flex items-center justify-center">
        <img
          src={currentImg}
          alt={product.name}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (!hasTriedFallback) {
              setHasTriedFallback(true);
              setCurrentImg(categoryFallback);
            }
          }}
        />

        {/* Action Buttons: Wishlist & Compare */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5 z-10">
          {/* Wishlist Button */}
          <button
            onClick={handleWishlistClick}
            aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
            title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
            className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-90 shadow-xs ${
              saved
                ? 'bg-rose-900 text-white shadow-rose-950/20'
                : 'bg-white/85 text-stone-600 hover:text-rose-900 hover:bg-white'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 transition-transform duration-200 ${saved ? 'fill-current scale-105' : ''}`} />
          </button>

          {/* Formulation Compare Button */}
          <button
            onClick={handleCompareClick}
            aria-label={compared ? 'Remove from comparison' : 'Add to formulation comparison'}
            title={compared ? 'Remove from comparison' : 'Add to formulation comparison'}
            className={`p-2 rounded-full backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-90 shadow-xs ${
              compared
                ? 'bg-stone-900 text-rose-300 shadow-stone-950/30'
                : 'bg-white/85 text-stone-600 hover:text-stone-900 hover:bg-white'
            }`}
          >
            <ArrowLeftRight className={`w-3.5 h-3.5 transition-transform duration-200 ${compared ? 'scale-105' : ''}`} />
          </button>
        </div>

        {/* Single subtle tag: Sale / Limited / Out of Stock */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          {isOutOfStock ? (
            <span className="bg-stone-900 text-white text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs">
              Sold Out
            </span>
          ) : hasDiscount ? (
            <span className="bg-rose-800 text-white text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded shadow-xs">
              Sale
            </span>
          ) : product.isFeatured ? (
            <span className="bg-stone-900/80 text-white text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded backdrop-blur-xs">
              Featured
            </span>
          ) : null}
        </div>

        {/* Quick Add Overlay on desktop hover */}
        {!isOutOfStock && (
          <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10 hidden sm:block">
            <button
              onClick={handleQuickAdd}
              className={`w-full py-2 px-3 rounded-md text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition ${
                justAdded
                  ? 'bg-emerald-800 text-white'
                  : 'bg-stone-900 text-white hover:bg-stone-800'
              }`}
            >
              {justAdded ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added</span>
                </>
              ) : hasVariants ? (
                <span>Select Options</span>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Quick Add</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Product Metadata adhering to zero-pill discipline */}
      <div className="p-4 flex flex-col flex-1">

        {/* Quiet unboxed text metadata with dot separators */}
        <div className="flex items-center gap-1.5 text-[11px] text-stone-500 mb-1.5">
          <span>{product.brand}</span>
          <span aria-hidden="true">·</span>
          <span>{product.categoryName}</span>
          {product.volumeOrWeight && (
            <>
              <span aria-hidden="true">·</span>
              <span>{product.volumeOrWeight}</span>
            </>
          )}
        </div>

        {/* Product Title */}
        <h3 className="font-medium text-stone-900 line-clamp-2 text-sm leading-snug group-hover:text-rose-950 transition-colors mb-2">
          {product.name}
        </h3>

        {/* Price & Variant count row */}
        <div className="mt-auto pt-2 flex items-baseline justify-between border-t border-stone-100">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-stone-950 font-mono tabular-nums">
              {formatCurrency(effectivePrice, product.currency)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-stone-400 line-through font-mono tabular-nums">
                {formatCurrency(product.price, product.currency)}
              </span>
            )}
          </div>

          {hasVariants ? (
            <span className="text-[11px] text-stone-500 font-medium">
              {product.variants.length} shades/sizes
            </span>
          ) : isLowStock ? (
            <span className="text-[11px] text-amber-700 font-medium font-mono">
              Only {product.stockQuantity} left
            </span>
          ) : null}
        </div>

      </div>
    </div>
  );
};
