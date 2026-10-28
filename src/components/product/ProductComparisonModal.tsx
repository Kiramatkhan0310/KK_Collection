import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  ShoppingBag,
  Heart,
  Star,
  Check,
  AlertCircle,
  ArrowLeftRight,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { Product, ProductVariant } from '../../types/index.ts';
import { formatCurrency } from '../../utils/currency.ts';
import { useCart } from '../../context/CartContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useCompare } from '../../context/CompareContext.tsx';

interface ProductComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  allProducts: Product[];
  onOpenProductDetails: (product: Product) => void;
}

// Common active cosmetic ingredients to auto-detect and highlight
const NOTABLE_ACTIVES = [
  'Ceramide',
  'Hyaluronic Acid',
  'Sodium Hyaluronate',
  'Niacinamide',
  'Zinc PCA',
  'Vitamin C',
  'Ascorbic Acid',
  'Retinol',
  'Salicylic Acid',
  'Glycolic Acid',
  'Lactic Acid',
  'Peptide',
  'Squalane',
  'Argan Oil',
  'Shea Butter',
  'Centella Asiatica',
  'Cica',
  'Allantoin',
  'Panthenol',
  'Collagen',
  'Vitamin E',
  'Tocopherol',
  'Caffeine',
  'Green Tea',
  'Bakuchiol',
  'Keratin'
];

export const ProductComparisonModal: React.FC<ProductComparisonModalProps> = ({
  isOpen,
  onClose,
  allProducts,
  onOpenProductDetails
}) => {
  const { addItem, setToastMessage } = useCart();
  const { isWishlisted, toggleWishlist } = useAuth();
  const {
    compareIds,
    removeFromCompare,
    clearCompare,
    addToCompare,
    maxItems
  } = useCompare();

  const [highlightDifferences, setHighlightDifferences] = useState(false);
  const [isAddPickerOpen, setIsAddPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState<string>('all');
  const [expandedIngredients, setExpandedIngredients] = useState<Record<string, boolean>>({});
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Resolve products from compareIds
  const comparedProducts = useMemo(() => {
    return compareIds
      .map((id) => allProducts.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));
  }, [compareIds, allProducts]);

  // Extract ingredients tokens for intersection analysis
  const ingredientData = useMemo(() => {
    const map: Record<string, { actives: string[]; list: string[] }> = {};
    comparedProducts.forEach((p) => {
      const raw = p.ingredients || '';
      const tokens = raw
        .split(/[,;•\n]/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1);

      // Detect active ingredients
      const matchedActives = NOTABLE_ACTIVES.filter((active) =>
        raw.toLowerCase().includes(active.toLowerCase())
      );

      map[p.id] = {
        actives: matchedActives,
        list: tokens
      };
    });
    return map;
  }, [comparedProducts]);

  // Find shared active ingredients across all compared formulations (when 2+ products)
  const sharedActives = useMemo(() => {
    if (comparedProducts.length < 2) return [];
    const firstActives = ingredientData[comparedProducts[0].id]?.actives || [];
    return firstActives.filter((active) =>
      comparedProducts.every((p) =>
        ingredientData[p.id]?.actives.includes(active)
      )
    );
  }, [comparedProducts, ingredientData]);

  // Candidate products for "+ Add Formulation" picker
  const availableToAdd = useMemo(() => {
    return allProducts.filter((p) => !compareIds.includes(p.id));
  }, [allProducts, compareIds]);

  const filteredCandidates = useMemo(() => {
    return availableToAdd.filter((p) => {
      const matchSearch =
        !pickerSearch ||
        p.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        p.brand.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        p.categoryName.toLowerCase().includes(pickerSearch.toLowerCase());
      const matchCat = pickerCategory === 'all' || p.categoryId === pickerCategory;
      return matchSearch && matchCat;
    });
  }, [availableToAdd, pickerSearch, pickerCategory]);

  if (!isOpen) return null;

  // Fallback image helper
  const getProductImage = (p: Product) => {
    if (p.images && p.images[0]) return p.images[0];
    switch (p.categoryId) {
      case 'skincare':
        return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=600&q=80';
      case 'makeup':
        return 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=80';
      case 'lip-care':
        return 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=600&q=80';
      case 'haircare':
        return 'https://images.unsplash.com/photo-1519735777090-ec97162dc266?auto=format&fit=crop&w=600&q=80';
      case 'fragrance':
        return 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=600&q=80';
      case 'body-care':
        return 'https://images.unsplash.com/photo-1576426863848-c21f53c60b19?auto=format&fit=crop&w=600&q=80';
      case 'beauty-tools':
        return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80';
      default:
        return 'https://images.unsplash.com/photo-1599305090598-fe179d501227?auto=format&fit=crop&w=600&q=80';
    }
  };

  // Helper to parse volume into ml/g number for unit price calculation
  const parseVolumeNumber = (vol?: string): { value: number; unit: string } | null => {
    if (!vol) return null;
    const match = vol.match(/(\d+(?:\.\d+)?)\s*(ml|g|oz)/i);
    if (match) {
      return { value: parseFloat(match[1]), unit: match[2].toLowerCase() };
    }
    return null;
  };

  // Check if a row differs across products
  const isRowDifferent = (getter: (p: Product) => any) => {
    if (comparedProducts.length < 2) return false;
    const firstVal = getter(comparedProducts[0]);
    return comparedProducts.some((p) => String(getter(p)) !== String(firstVal));
  };

  // Add to Bag handler for a specific product
  const handleAddToCart = (product: Product) => {
    if (product.stockQuantity <= 0) return;

    let targetPrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
    let chosenVariant: ProductVariant | undefined = undefined;

    if (product.variants && product.variants.length > 0) {
      const varId = selectedVariants[product.id] || product.variants[0].id;
      chosenVariant = product.variants.find((v) => v.id === varId);
      if (chosenVariant && chosenVariant.priceDelta) {
        targetPrice += chosenVariant.priceDelta;
      }
    }

    const res = addItem(
      {
        productId: product.id,
        variantId: chosenVariant?.id,
        variantName: chosenVariant?.name,
        name: product.name,
        sku: chosenVariant?.sku || product.sku,
        price: targetPrice,
        image: getProductImage(product),
        quantity: 1,
        categoryName: product.categoryName
      },
      chosenVariant ? chosenVariant.stockQuantity : product.stockQuantity
    );

    if (res.success && setToastMessage) {
      setToastMessage(`Added "${product.name}" to shopping bag.`);
    }
  };

  const handleWishlistToggle = async (productId: string, productName: string) => {
    const isNowSaved = await toggleWishlist(productId);
    if (setToastMessage) {
      setToastMessage(
        isNowSaved
          ? `Saved "${productName}" to wishlist.`
          : `Removed "${productName}" from wishlist.`
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-950/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-7xl max-h-[94vh] flex flex-col bg-[#FAF8F5] rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">

        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-white border-b border-stone-200/90 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-rose-300 flex items-center justify-center shadow-xs">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="comparison-modal-title" className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                  Formulation Atelier Comparison
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 font-semibold">
                  {comparedProducts.length} of {maxItems}
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Side-by-side analysis of clinical specifications, INCI ingredients, and luxury pricing.
              </p>
            </div>
          </div>

          {/* Controls Strip */}
          <div className="flex items-center gap-3">
            {comparedProducts.length >= 2 && (
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/70 px-3 py-1.5 rounded-full transition border border-stone-200">
                <input
                  type="checkbox"
                  checked={highlightDifferences}
                  onChange={(e) => setHighlightDifferences(e.target.checked)}
                  className="rounded text-rose-900 focus:ring-0"
                />
                <span>Highlight Differences</span>
              </label>
            )}

            {comparedProducts.length < maxItems && (
              <button
                type="button"
                onClick={() => setIsAddPickerOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white px-3.5 py-1.5 rounded-full transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Formulation</span>
              </button>
            )}

            {comparedProducts.length > 0 && (
              <button
                type="button"
                onClick={clearCompare}
                className="text-xs text-stone-500 hover:text-rose-800 hover:underline px-2 py-1 transition"
                title="Clear all compared formulations"
              >
                Clear All
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close comparison modal"
              className="p-2 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Empty State */}
          {comparedProducts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-stone-300 p-8 max-w-xl mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto mb-4">
                <ArrowLeftRight className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-stone-900 mb-2">
                No formulations selected for comparison
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed mb-6">
                Select formulations from our luxury catalog to compare their active ingredients,
                volume values, skin benefits, and clinical specifications side-by-side.
              </p>
              <button
                type="button"
                onClick={() => setIsAddPickerOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Select Formulations to Compare</span>
              </button>
            </div>
          ) : (
            <>
              {/* Shared Actives Banner (when 2+ products have common actives) */}
              {comparedProducts.length >= 2 && sharedActives.length > 0 && (
                <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-3.5 flex items-start gap-3 text-xs text-rose-950">
                  <Sparkles className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-rose-900">Shared Key Actives: </span>
                    <span>
                      These formulations all leverage{' '}
                      <strong>{sharedActives.join(', ')}</strong> for complementary skin barrier restoration and efficacy.
                    </span>
                  </div>
                </div>
              )}

              {/* Responsive Side-by-Side Comparison Matrix */}
              <div className="overflow-x-auto pb-4">
                <div className="min-w-[680px]">

                  {/* Sticky Header Row: Product Cards */}
                  <div className="grid grid-cols-12 gap-4 pb-6 border-b border-stone-200">
                    <div className="col-span-3 flex flex-col justify-end p-2 text-stone-500">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                        Formulation Matrix
                      </span>
                      <p className="text-xs text-stone-600 mt-1">
                        Comparing {comparedProducts.length} of {maxItems} active atelier formulations
                      </p>
                    </div>

                    {/* Product Column Cards */}
                    <div
                      className={`col-span-9 grid gap-4`}
                      style={{
                        gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                      }}
                    >
                      {comparedProducts.map((p) => {
                        const isOutOfStock = p.stockQuantity <= 0;
                        const hasDiscount = Boolean(p.salePrice && p.salePrice > 0 && p.salePrice < p.price);
                        const effectivePrice = hasDiscount ? p.salePrice! : p.price;
                        const saved = isWishlisted(p.id);

                        return (
                          <div
                            key={p.id}
                            className="bg-white rounded-xl border border-stone-200/90 p-4 shadow-xs relative flex flex-col justify-between hover:shadow-md transition"
                          >
                            {/* Card Top: Remove & Wishlist */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-900 bg-rose-50 px-2 py-0.5 rounded">
                                {p.categoryName}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleWishlistToggle(p.id, p.name)}
                                  className={`p-1.5 rounded-full transition ${
                                    saved ? 'text-rose-800 bg-rose-50' : 'text-stone-400 hover:text-rose-800'
                                  }`}
                                  title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                                >
                                  <Heart className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeFromCompare(p.id)}
                                  className="p-1.5 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100 transition"
                                  title="Remove from comparison"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Image & Title */}
                            <div
                              onClick={() => onOpenProductDetails(p)}
                              className="cursor-pointer group mb-3"
                            >
                              <div className="aspect-square w-full rounded-lg overflow-hidden bg-stone-100 mb-2.5">
                                <img
                                  src={getProductImage(p)}
                                  alt={p.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  loading="lazy"
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest block">
                                {p.brand}
                              </span>
                              <h3 className="text-sm font-serif font-bold text-stone-900 group-hover:text-rose-900 transition-colors line-clamp-2 leading-snug">
                                {p.name}
                              </h3>
                            </div>

                            {/* Rating and Price */}
                            <div className="space-y-1.5 mb-4">
                              <div className="flex items-center gap-1 text-xs">
                                <div className="flex text-amber-500">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-3 h-3 ${
                                        i < Math.round(p.rating || 5) ? 'fill-current' : 'text-stone-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="font-mono text-[11px] font-bold text-stone-800">
                                  {p.rating || 5.0}
                                </span>
                                <span className="text-[10px] text-stone-400">
                                  ({p.reviewCount || 42})
                                </span>
                              </div>

                              <div className="flex items-baseline gap-2">
                                <span className="text-base font-bold font-mono text-stone-950">
                                  {formatCurrency(effectivePrice, p.currency)}
                                </span>
                                {hasDiscount && (
                                  <span className="text-xs font-mono text-stone-400 line-through">
                                    {formatCurrency(p.price, p.currency)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Variant picker if present */}
                            {p.variants && p.variants.length > 0 && (
                              <div className="mb-3">
                                <label className="block text-[10px] font-medium text-stone-500 mb-1">
                                  Option:
                                </label>
                                <select
                                  value={selectedVariants[p.id] || p.variants[0].id}
                                  onChange={(e) =>
                                    setSelectedVariants((prev) => ({
                                      ...prev,
                                      [p.id]: e.target.value
                                    }))
                                  }
                                  className="w-full text-xs bg-stone-50 border border-stone-200 rounded px-2 py-1 text-stone-800 focus:outline-none"
                                >
                                  {p.variants.map((v) => (
                                    <option key={v.id} value={v.id}>
                                      {v.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Primary Action Button */}
                            <button
                              type="button"
                              onClick={() => handleAddToCart(p)}
                              disabled={isOutOfStock}
                              className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-xs ${
                                isOutOfStock
                                  ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                  : 'bg-stone-900 hover:bg-stone-800 text-white active:scale-98'
                              }`}
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>{isOutOfStock ? 'Sold Out' : 'Add to Bag'}</span>
                            </button>
                          </div>
                        );
                      })}

                      {/* Add Slot Button if < maxItems */}
                      {comparedProducts.length < maxItems && (
                        <button
                          type="button"
                          onClick={() => setIsAddPickerOpen(true)}
                          className="bg-stone-50/70 border-2 border-dashed border-stone-300 hover:border-stone-400 hover:bg-stone-100/70 rounded-xl p-6 flex flex-col items-center justify-center text-center transition group min-h-[300px]"
                        >
                          <div className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 group-hover:bg-stone-900 group-hover:text-white transition shadow-xs mb-3">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-serif font-bold text-stone-800">
                            Add Formulation
                          </span>
                          <span className="text-[11px] text-stone-400 mt-1 max-w-[140px]">
                            Compare up to {maxItems} products side-by-side
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Section 1: Pricing & Value Rows */}
                  <div className="mt-6 space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                      <span>Pricing &amp; Value Analysis</span>
                    </div>

                    {/* Price Row */}
                    <div
                      className={`grid grid-cols-12 gap-4 py-3 px-3 rounded-lg text-xs transition ${
                        highlightDifferences && isRowDifferent((p) => (p.salePrice || p.price))
                          ? 'bg-amber-50/70 border border-amber-200/60'
                          : 'bg-white border border-stone-100'
                      }`}
                    >
                      <div className="col-span-3 font-medium text-stone-600">Base Retail Price</div>
                      <div
                        className="col-span-9 grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                        }}
                      >
                        {comparedProducts.map((p) => (
                          <div key={p.id} className="font-mono font-semibold text-stone-900">
                            {formatCurrency(p.price, p.currency)}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sale / Promotional Price Row */}
                    <div
                      className={`grid grid-cols-12 gap-4 py-3 px-3 rounded-lg text-xs transition ${
                        highlightDifferences && isRowDifferent((p) => (p.salePrice || 'none'))
                          ? 'bg-amber-50/70 border border-amber-200/60'
                          : 'bg-white/60 border border-stone-100'
                      }`}
                    >
                      <div className="col-span-3 font-medium text-stone-600">Offer / Sale Price</div>
                      <div
                        className="col-span-9 grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                        }}
                      >
                        {comparedProducts.map((p) => (
                          <div key={p.id}>
                            {p.salePrice ? (
                              <span className="text-rose-900 font-mono font-bold">
                                {formatCurrency(p.salePrice, p.currency)}
                                <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded ml-1.5">
                                  Save {Math.round(((p.price - p.salePrice) / p.price) * 100)}%
                                </span>
                              </span>
                            ) : (
                              <span className="text-stone-400">Regular list price</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Volume / Net Weight */}
                    <div
                      className={`grid grid-cols-12 gap-4 py-3 px-3 rounded-lg text-xs transition ${
                        highlightDifferences && isRowDifferent((p) => p.volumeOrWeight)
                          ? 'bg-amber-50/70 border border-amber-200/60'
                          : 'bg-white border border-stone-100'
                      }`}
                    >
                      <div className="col-span-3 font-medium text-stone-600">Net Volume / Weight</div>
                      <div
                        className="col-span-9 grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                        }}
                      >
                        {comparedProducts.map((p) => (
                          <div key={p.id} className="font-medium text-stone-800">
                            {p.volumeOrWeight || 'Standard formulation'}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Unit Value (Rs per ml/g) */}
                    <div
                      className={`grid grid-cols-12 gap-4 py-3 px-3 rounded-lg text-xs transition ${
                        highlightDifferences
                          ? 'bg-amber-50/70 border border-amber-200/60'
                          : 'bg-white/60 border border-stone-100'
                      }`}
                    >
                      <div className="col-span-3 font-medium text-stone-600">
                        <span>Calculated Unit Value</span>
                        <span className="block text-[10px] text-stone-400">Price per ml/g</span>
                      </div>
                      <div
                        className="col-span-9 grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                        }}
                      >
                        {comparedProducts.map((p) => {
                          const vol = parseVolumeNumber(p.volumeOrWeight);
                          const effPrice = p.salePrice || p.price;
                          if (vol && vol.value > 0) {
                            const unitPrice = (effPrice / vol.value).toFixed(1);
                            return (
                              <div key={p.id} className="font-mono text-stone-700">
                                <strong>Rs. {unitPrice}</strong>
                                <span className="text-[10px] text-stone-400"> / {vol.unit}</span>
                              </div>
                            );
                          }
                          return (
                            <div key={p.id} className="text-stone-400 text-[11px]">
                              N/A
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Complimentary Delivery */}
                    <div className="grid grid-cols-12 gap-4 py-3 px-3 rounded-lg text-xs bg-white border border-stone-100">
                      <div className="col-span-3 font-medium text-stone-600">Shipping Privilege</div>
                      <div
                        className="col-span-9 grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                        }}
                      >
                        {comparedProducts.map((p) => {
                          const effPrice = p.salePrice || p.price;
                          const qualifies = effPrice >= 5000;
                          return (
                            <div key={p.id} className="flex items-center gap-1.5">
                              {qualifies ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span className="text-emerald-800 font-medium">Free Express Delivery</span>
                                </>
                              ) : (
                                <span className="text-stone-500">
                                  Standard delivery (Free over Rs. 5,000)
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Active Formulation & Ingredients */}
                  <div className="mt-8 space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-rose-800 mb-2 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Formulation Ingredients &amp; Actives</span>
                    </div>

                    {/* Key Actives Badges */}
                    <div
                      className={`grid grid-cols-12 gap-4 py-3.5 px-3 rounded-lg text-xs transition ${
                        highlightDifferences
                          ? 'bg-amber-50/70 border border-amber-200/60'
                          : 'bg-white border border-stone-100'
                      }`}
                    >
                      <div className="col-span-3 font-medium text-stone-700">
                        <span>Highlighted Actives</span>
                        <span className="block text-[10px] text-stone-400 font-normal">
                          Botanical &amp; clinical stars
                        </span>
                      </div>
                      <div
                        className="col-span-9 grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                        }}
                      >
                        {comparedProducts.map((p) => {
                          const actives = ingredientData[p.id]?.actives || [];
                          return (
                            <div key={p.id} className="flex flex-wrap gap-1.5">
                              {actives.length > 0 ? (
                                actives.map((act) => {
                                  const isShared = sharedActives.includes(act);
                                  return (
                                    <span
                                      key={act}
                                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                        isShared
                                          ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                          : 'bg-stone-100 text-stone-800 border border-stone-200'
                                      }`}
                                    >
                                      {act}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-stone-400 text-[11px]">
                                  Pure botanical blend
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Full INCI Ingredients List (Expandable) */}
                    <div className="grid grid-cols-12 gap-4 py-3.5 px-3 rounded-lg text-xs bg-white/60 border border-stone-100">
                      <div className="col-span-3 font-medium text-stone-700">
                        <span>Full INCI Ingredients</span>
                        <span className="block text-[10px] text-stone-400 font-normal">
                          Standardized disclosure
                        </span>
                      </div>
                      <div
                        className="col-span-9 grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                        }}
                      >
                        {comparedProducts.map((p) => {
                          const isExpanded = Boolean(expandedIngredients[p.id]);
                          const raw = p.ingredients || 'Formula details proprietary or certified pure.';

                          return (
                            <div key={p.id} className="text-stone-600 text-[11px] leading-relaxed">
                              <p className={isExpanded ? '' : 'line-clamp-3'}>
                                {raw}
                              </p>
                              {raw.length > 100 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedIngredients((prev) => ({
                                      ...prev,
                                      [p.id]: !prev[p.id]
                                    }))
                                  }
                                  className="text-[10px] text-rose-900 font-semibold hover:underline mt-1 flex items-center gap-0.5"
                                >
                                  <span>{isExpanded ? 'Show Less' : 'View Full Formula'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Clinical & Application Specifications */}
                  <div className="mt-8 space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                      <span>Specifications &amp; Application Protocol</span>
                    </div>

                    {/* Primary Benefit / Description */}
                    <div
                      className={`grid grid-cols-12 gap-4 py-3 px-3 rounded-lg text-xs transition ${
                        highlightDifferences ? 'bg-amber-50/70 border border-amber-200/60' : 'bg-white border border-stone-100'
                      }`}
                    >
                      <div className="col-span-3 font-medium text-stone-600">Target Clinical Concern</div>
                      <div
                        className="col-span-9 grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                        }}
                      >
                        {comparedProducts.map((p) => (
                          <div key={p.id} className="text-stone-700 leading-relaxed text-[11px]">
                            {p.description}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Usage Instructions */}
                    <div
                      className={`grid grid-cols-12 gap-4 py-3 px-3 rounded-lg text-xs transition ${
                        highlightDifferences && isRowDifferent((p) => (p.usageInstructions || ''))
                          ? 'bg-amber-50/70 border border-amber-200/60'
                          : 'bg-white/60 border border-stone-100'
                      }`}
                    >
                      <div className="col-span-3 font-medium text-stone-600">Application Routine</div>
                      <div
                        className="col-span-9 grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                        }}
                      >
                        {comparedProducts.map((p) => (
                          <div key={p.id} className="text-stone-700 text-[11px] leading-relaxed">
                            {p.usageInstructions || 'Apply evenly onto clean skin daily.'}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Available Variants */}
                    <div
                      className={`grid grid-cols-12 gap-4 py-3 px-3 rounded-lg text-xs transition ${
                        highlightDifferences && isRowDifferent((p) => (p.variants?.length || 0))
                          ? 'bg-amber-50/70 border border-amber-200/60'
                          : 'bg-white border border-stone-100'
                      }`}
                    >
                      <div className="col-span-3 font-medium text-stone-600">Available Options</div>
                      <div
                        className="col-span-9 grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                        }}
                      >
                        {comparedProducts.map((p) => (
                          <div key={p.id} className="text-[11px]">
                            {p.variants && p.variants.length > 0 ? (
                              <div className="space-y-1">
                                <span className="font-semibold text-stone-800">
                                  {p.variants.length} options available:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {p.variants.map((v) => (
                                    <span
                                      key={v.id}
                                      className="bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded text-[10px]"
                                    >
                                      {v.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="text-stone-500">Universal standard formulation</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stock Status & Inventory */}
                    <div
                      className={`grid grid-cols-12 gap-4 py-3 px-3 rounded-lg text-xs transition ${
                        highlightDifferences && isRowDifferent((p) => (p.stockQuantity > 0))
                          ? 'bg-amber-50/70 border border-amber-200/60'
                          : 'bg-white/60 border border-stone-100'
                      }`}
                    >
                      <div className="col-span-3 font-medium text-stone-600">Stock Availability</div>
                      <div
                        className="col-span-9 grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                        }}
                      >
                        {comparedProducts.map((p) => {
                          const isOut = p.stockQuantity <= 0;
                          const isLow = p.stockQuantity > 0 && p.stockQuantity <= 10;
                          return (
                            <div key={p.id} className="flex items-center gap-1.5 text-[11px]">
                              {isOut ? (
                                <span className="text-rose-700 font-semibold">Sold Out</span>
                              ) : isLow ? (
                                <span className="text-amber-700 font-semibold">
                                  Low Stock ({p.stockQuantity} left)
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-medium">
                                  In Stock ({p.stockQuantity} available)
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SKU Reference */}
                    <div className="grid grid-cols-12 gap-4 py-3 px-3 rounded-lg text-xs bg-white border border-stone-100">
                      <div className="col-span-3 font-medium text-stone-600">Atelier Catalog SKU</div>
                      <div
                        className="col-span-9 grid gap-4"
                        style={{
                          gridTemplateColumns: `repeat(${Math.max(comparedProducts.length + (comparedProducts.length < maxItems ? 1 : 0), 1)}, minmax(0, 1fr))`
                        }}
                      >
                        {comparedProducts.map((p) => (
                          <div key={p.id} className="font-mono text-stone-500 text-[10px]">
                            {p.sku}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-stone-200 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-stone-500 text-[11px]">
            <Info className="w-3.5 h-3.5 text-stone-400" />
            <span>
              All formulations meet dermatological safety standards, 100% cruelty-free, backed by genuine client reviews.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-stone-900 text-white font-semibold hover:bg-stone-800 transition"
          >
            Close Atelier
          </button>
        </div>

      </div>

      {/* Inline Formulation Picker Dialog to add products into comparison */}
      {isAddPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-formulation-title"
          className="fixed inset-0 z-60 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
              <div>
                <h3 id="add-formulation-title" className="font-serif font-bold text-lg text-stone-900">
                  Select Formulation to Compare
                </h3>
                <p className="text-xs text-stone-500">
                  Choose another product from the atelier catalog
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddPickerOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-900 rounded-full hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search and Category Filter in Picker */}
            <div className="p-4 border-b border-stone-100 bg-stone-50/70 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by formulation name, active ingredient, or brand..."
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-400"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {['all', 'skincare', 'makeup', 'lip-care', 'haircare', 'fragrance', 'body-care'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPickerCategory(cat)}
                    className={`px-2.5 py-1 rounded-full capitalize whitespace-nowrap transition ${
                      pickerCategory === cat
                        ? 'bg-stone-900 text-white font-semibold'
                        : 'bg-white text-stone-600 border border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredCandidates.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs">
                  No additional formulations match your search criteria.
                </div>
              ) : (
                filteredCandidates.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-stone-200 hover:border-stone-400 hover:bg-stone-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0">
                        <img
                          src={getProductImage(p)}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-rose-800">
                          {p.categoryName}
                        </span>
                        <h4 className="text-xs font-serif font-bold text-stone-900 line-clamp-1">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono">
                          <span className="text-stone-900 font-semibold">
                            {formatCurrency(p.salePrice || p.price, p.currency)}
                          </span>
                          {p.volumeOrWeight && (
                            <span className="text-stone-400 font-sans">· {p.volumeOrWeight}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        addToCompare(p);
                        setIsAddPickerOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shrink-0 transition"
                    >
                      Compare
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
