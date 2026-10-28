import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Heart,
  Star,
  ShieldCheck,
  Check,
  ShoppingBag,
  Truck,
  AlertCircle,
  MessageSquarePlus,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Loader2,
  Lock,
  ArrowRight,
  User,
  ArrowLeftRight
} from 'lucide-react';
import { collection, doc, setDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase.ts';
import { Product, ProductVariant } from '../../types/index.ts';
import { formatCurrency, formatDate } from '../../utils/currency.ts';
import { useCart } from '../../context/CartContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useCompare } from '../../context/CompareContext.tsx';
import { ApiClient } from '../../services/apiClient.ts';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onProceedToCheckout?: () => void;
  onOpenAuth?: () => void;
}

export interface ReviewItem {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userEmail?: string;
  rating: number;
  comment: string;
  verifiedPurchase?: boolean;
  createdAt: string;
  isFirestore?: boolean;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onProceedToCheckout,
  onOpenAuth
}) => {
  const { addItem } = useCart();
  const { user, isWishlisted, toggleWishlist, signInWithGoogle } = useAuth();
  const { isInCompare, toggleCompare } = useCompare();

  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'details' | 'ingredients' | 'reviews' | 'usage'>('details');
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reviews State
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);

  // Fallback high-resolution beauty photos per category
  const categoryFallback = useMemo(() => {
    if (!product) return 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80';
    switch (product.categoryId) {
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
  }, [product]);

  const [activeImg, setActiveImg] = useState<string>('');

  useEffect(() => {
    if (product) {
      setSelectedVariantId(product.variants?.length ? product.variants[0].id : undefined);
      setSelectedImageIndex(0);
      setQuantity(1);
      setErrorMessage(null);
      setReviewSuccessMsg(null);
      setActiveImg(product.images[0] || categoryFallback);

      // 1. Fetch pre-seeded catalog reviews from local API
      ApiClient.getProduct(product.id)
        .then((res) => {
          const apiReviews: ReviewItem[] = (res.reviews || []).map((r: any) => ({
            id: r.id,
            productId: r.productId,
            userId: r.userId,
            userName: r.userName || 'Verified Buyer',
            rating: r.rating || 5,
            comment: r.comment || '',
            verifiedPurchase: r.verifiedPurchase ?? true,
            createdAt: r.createdAt || new Date().toISOString(),
            isFirestore: false
          }));

          setReviews((prev) => {
            const existingIds = new Set(prev.map((item) => item.id));
            const fresh = apiReviews.filter((item) => !existingIds.has(item.id));
            return [...prev, ...fresh];
          });
        })
        .catch(() => {});

      // 2. Authoritative real-time Firestore synchronization for reviews
      const reviewsCol = collection(db, 'reviews');
      const q = query(reviewsCol, where('productId', '==', product.id));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fsReviews: ReviewItem[] = snapshot.docs.map((d) => {
            const data = d.data();
            let dateStr = new Date().toISOString();
            if (data.createdAt?.toDate) {
              dateStr = data.createdAt.toDate().toISOString();
            } else if (typeof data.createdAt === 'string') {
              dateStr = data.createdAt;
            }

            return {
              id: d.id,
              productId: data.productId,
              userId: data.userId,
              userName: data.userName || 'Client',
              userEmail: data.userEmail,
              rating: data.rating || 5,
              comment: data.comment || '',
              verifiedPurchase: data.verifiedPurchase ?? true,
              createdAt: dateStr,
              isFirestore: true
            };
          });

          setReviews((prev) => {
            const fsIds = new Set(fsReviews.map((r) => r.id));
            const nonFs = prev.filter((r) => !fsIds.has(r.id));
            return [...fsReviews, ...nonFs];
          });
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'reviews');
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [product, categoryFallback]);

  // Sync activeImg when thumbnail index changes
  useEffect(() => {
    if (product && product.images && product.images[selectedImageIndex]) {
      setActiveImg(product.images[selectedImageIndex]);
    } else {
      setActiveImg(categoryFallback);
    }
  }, [selectedImageIndex, product, categoryFallback]);

  // Keyboard accessibility: ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Star Ratings calculation
  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const val = Math.min(Math.max(Math.round(r.rating || 5), 1), 5) as 1 | 2 | 3 | 4 | 5;
      counts[val] = (counts[val] || 0) + 1;
    });
    return counts;
  }, [reviews]);

  if (!product) return null;

  const selectedVariant: ProductVariant | undefined = product.variants?.find(
    (v) => v.id === selectedVariantId
  );

  const basePrice =
    product.salePrice && product.salePrice > 0 && product.salePrice < product.price
      ? product.salePrice
      : product.price;

  const unitPrice = selectedVariant?.priceDelta ? basePrice + selectedVariant.priceDelta : basePrice;
  const originalFullPrice = selectedVariant?.priceDelta
    ? product.price + selectedVariant.priceDelta
    : product.price;
  const hasDiscount = Boolean(product.salePrice && product.salePrice > 0 && product.salePrice < product.price);

  const availableStock = selectedVariant ? selectedVariant.stockQuantity : product.stockQuantity;
  const isOutOfStock = availableStock <= 0;

  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalReviews).toFixed(1)
    : (product.rating ? product.rating.toFixed(1) : '5.0');

  const handleAddToCart = () => {
    setErrorMessage(null);
    if (isOutOfStock) {
      setErrorMessage('Selected option is currently out of stock.');
      return;
    }

    const res = addItem(
      {
        productId: product.id,
        variantId: selectedVariant?.id,
        name: product.name,
        variantName: selectedVariant?.name,
        sku: selectedVariant ? selectedVariant.sku : product.sku,
        price: unitPrice,
        image: activeImg || product.images[0] || categoryFallback,
        quantity,
        categoryName: product.categoryName
      },
      availableStock
    );

    if (res.success) {
      setAddedSuccess(true);
      setTimeout(() => setAddedSuccess(false), 2000);
    } else {
      setErrorMessage(res.message || 'Could not add to bag.');
    }
  };

  /**
   * Persists customer review directly to Firestore as requested.
   * Adheres strictly to security rules and handles errors via handleFirestoreError.
   */
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedComment = newComment.trim();
    if (!trimmedComment || trimmedComment.length < 3) {
      setErrorMessage('Please provide a thoughtful review (at least 3 characters).');
      return;
    }

    setSubmittingReview(true);

    try {
      let currentAuthUser = auth.currentUser;

      // Ensure Firebase authentication session
      if (!currentAuthUser) {
        const gRes = await signInWithGoogle();
        if (!gRes.success || !auth.currentUser) {
          setErrorMessage(
            gRes.error || 'Please authenticate with Google or your Atelier Account to submit a verified review to Firestore.'
          );
          setSubmittingReview(false);
          return;
        }
        currentAuthUser = auth.currentUser;
      }

      const reviewDocRef = doc(collection(db, 'reviews'));
      const displayName =
        currentAuthUser.displayName ||
        currentAuthUser.email?.split('@')[0] ||
        user?.displayName ||
        'Atelier Client';
      const email = currentAuthUser.email || user?.email || undefined;

      const payload: any = {
        productId: product.id,
        userId: currentAuthUser.uid,
        userName: displayName,
        rating: Number(newRating),
        comment: trimmedComment,
        verifiedPurchase: true,
        createdAt: serverTimestamp()
      };

      if (email) {
        payload.userEmail = email;
      }

      // Persist directly to Firestore database
      await setDoc(reviewDocRef, payload);

      // Best-effort local backend sync
      try {
        await ApiClient.submitReview(product.id, newRating, trimmedComment);
      } catch {
        // Non-fatal
      }

      // Update local state
      const localReview: ReviewItem = {
        id: reviewDocRef.id,
        productId: product.id,
        userId: currentAuthUser.uid,
        userName: displayName,
        userEmail: email,
        rating: Number(newRating),
        comment: trimmedComment,
        verifiedPurchase: true,
        createdAt: new Date().toISOString(),
        isFirestore: true
      };

      setReviews((prev) => [localReview, ...prev.filter((r) => r.id !== reviewDocRef.id)]);
      setNewComment('');
      setReviewSuccessMsg('Your verified customer review has been published and persisted to Firestore!');
      setTimeout(() => setReviewSuccessMsg(null), 4000);
    } catch (err: unknown) {
      try {
        handleFirestoreError(err, OperationType.WRITE, 'reviews');
      } catch (logErr) {
        console.error('Handled Firestore review error:', logErr);
      }
      setErrorMessage('Could not record review to Firestore. Please check your network and try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const saved = Boolean(product && isWishlisted(product.id));
  const compared = Boolean(product && isInCompare(product.id));

  const getRatingDescriptor = (val: number) => {
    switch (val) {
      case 5:
        return 'Exceptional formulation';
      case 4:
        return 'Very good performance';
      case 3:
        return 'Average experience';
      case 2:
        return 'Below expectation';
      case 1:
        return 'Needs improvement';
      default:
        return '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden border border-stone-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 text-stone-500 hover:text-stone-900 bg-white/80 hover:bg-white rounded-full backdrop-blur-xs transition shadow-xs focus-visible:ring-2 focus-visible:ring-stone-900"
          aria-label="Close product details dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[90vh] overflow-y-auto">
          {/* Left Column: Visual Media Gallery */}
          <div className="md:col-span-6 bg-stone-50 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-stone-200">
            {/* Primary Image Viewport with resilient fallback */}
            <div className="aspect-square w-full rounded-lg overflow-hidden bg-white border border-stone-200 relative flex items-center justify-center shadow-xs">
              <img
                src={activeImg || categoryFallback}
                alt={product.name}
                className="w-full h-full object-cover object-center transition-all duration-300"
                referrerPolicy="no-referrer"
                onError={() => {
                  // Fall back gracefully to guaranteed beauty image
                  setActiveImg(categoryFallback);
                }}
              />

              {hasDiscount && (
                <span className="absolute top-3 left-3 bg-rose-800 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded shadow-xs">
                  Privilege Offer
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedImageIndex(idx);
                      setActiveImg(img);
                    }}
                    className={`w-14 h-14 rounded-md overflow-hidden border-2 transition shrink-0 ${
                      selectedImageIndex === idx
                        ? 'border-stone-900 shadow-xs'
                        : 'border-stone-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = categoryFallback;
                      }}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Brand Authenticity Assurance */}
            <div className="mt-6 pt-4 border-t border-stone-200/80 flex items-center justify-between text-[11px] text-stone-500">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Original Batch Certified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-stone-600 shrink-0" />
                <span>TCS Courier Tracked</span>
              </div>
            </div>
          </div>

          {/* Right Column: Contiguous Purchase & Reviews Module */}
          <div className="md:col-span-6 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              {/* Category & Brand Metadata */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs text-stone-500 uppercase tracking-widest font-medium">
                  <span>{product.brand}</span>
                  <span aria-hidden="true">·</span>
                  <span>{product.categoryName}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className={`p-2 rounded-full transition ${
                      saved
                        ? 'bg-rose-100 text-rose-900'
                        : 'text-stone-400 hover:text-rose-900 hover:bg-stone-100'
                    }`}
                    aria-label="Wishlist toggle"
                    title={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                  >
                    <Heart className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    onClick={() => toggleCompare(product)}
                    className={`p-2 rounded-full transition ${
                      compared
                        ? 'bg-stone-900 text-rose-300'
                        : 'text-stone-400 hover:text-stone-900 hover:bg-stone-100'
                    }`}
                    aria-label="Compare toggle"
                    title={compared ? 'Remove from comparison' : 'Add to formulation comparison'}
                  >
                    <ArrowLeftRight className={`w-4 h-4 ${compared ? 'scale-105' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Product Title */}
              <h2 id="product-title" className="text-2xl font-serif font-bold text-stone-900 leading-snug">
                {product.name}
              </h2>

              {/* Rating and Reviews header button */}
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className="flex items-center gap-2 mt-2 text-xs text-stone-600 hover:text-stone-900 transition-colors group cursor-pointer text-left"
              >
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.round(Number(avgRating)) ? 'fill-current' : 'text-stone-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="font-mono font-semibold text-stone-900">{avgRating}</span>
                <span className="text-stone-500 group-hover:underline">
                  ({totalReviews} client reviews)
                </span>
                <span className="text-[10px] text-rose-800 font-semibold uppercase tracking-wider ml-1">
                  · Read or Review
                </span>
              </button>

              {/* Price Banner with Tabular Numerals */}
              <div className="mt-4 pb-4 border-b border-stone-200 flex items-baseline gap-3">
                <span className="text-2xl font-bold font-mono text-stone-950 tabular-nums">
                  {formatCurrency(unitPrice, product.currency)}
                </span>
                {hasDiscount && (
                  <span className="text-sm font-mono text-stone-400 line-through tabular-nums">
                    {formatCurrency(originalFullPrice, product.currency)}
                  </span>
                )}
                {product.volumeOrWeight && (
                  <span className="text-xs text-stone-500">({product.volumeOrWeight})</span>
                )}
              </div>

              {/* Variant Selector */}
              {product.variants && product.variants.length > 0 && (
                <div className="mt-4 space-y-2">
                  <label className="block text-xs font-semibold text-stone-700">
                    Select Formulation Option:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`px-3 py-1.5 rounded text-xs font-medium border transition ${
                          selectedVariantId === variant.id
                            ? 'border-stone-900 bg-stone-900 text-white shadow-xs'
                            : 'border-stone-300 text-stone-700 hover:border-stone-400 bg-white'
                        }`}
                      >
                        {variant.name}
                        {variant.priceDelta ? ` (+${formatCurrency(variant.priceDelta, product.currency)})` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Purchase Actions */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3">
                  {/* Quantity selector */}
                  <div className="flex items-center border border-stone-300 rounded overflow-hidden bg-stone-50">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={isOutOfStock}
                      className="px-2.5 py-1.5 text-stone-600 hover:bg-stone-200 text-sm font-bold disabled:opacity-40"
                    >
                      -
                    </button>
                    <span className="px-3 py-1 text-xs font-mono font-bold text-stone-900">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                      disabled={isOutOfStock || quantity >= availableStock}
                      className="px-2.5 py-1.5 text-stone-600 hover:bg-stone-200 text-sm font-bold disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Bag Button */}
                  <button
                    onClick={handleAddToCart}
                    disabled={isOutOfStock}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-6 rounded-full font-serif font-bold text-xs uppercase tracking-wider transition shadow-sm ${
                      isOutOfStock
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        : addedSuccess
                        ? 'bg-emerald-800 text-white'
                        : 'bg-stone-900 hover:bg-stone-800 text-white active:scale-[0.99]'
                    }`}
                  >
                    {addedSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Added to Bag</span>
                      </>
                    ) : isOutOfStock ? (
                      <span>Sold Out</span>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" />
                        <span>Add to Bag</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Formulation Comparison Action */}
                <div className="pt-2 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => toggleCompare(product)}
                    className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900 transition font-medium cursor-pointer"
                  >
                    <ArrowLeftRight className={`w-3.5 h-3.5 ${compared ? 'text-rose-900' : 'text-stone-400'}`} />
                    <span>
                      {compared
                        ? 'Added to Formulation Comparison (Click to Remove)'
                        : 'Add to Formulation Comparison'}
                    </span>
                  </button>
                  <span className="text-[11px] text-stone-400">
                    Side-by-side INCI &amp; Price Analysis
                  </span>
                </div>

                {errorMessage && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </div>

              {/* Informational Tabs */}
              <div className="mt-8 border-t border-stone-200 pt-4">
                <div className="flex border-b border-stone-200 gap-4 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`pb-2 transition border-b-2 ${
                      activeTab === 'details'
                        ? 'border-stone-900 text-stone-900'
                        : 'border-transparent text-stone-400 hover:text-stone-700'
                    }`}
                  >
                    Details
                  </button>
                  <button
                    onClick={() => setActiveTab('ingredients')}
                    className={`pb-2 transition border-b-2 ${
                      activeTab === 'ingredients'
                        ? 'border-stone-900 text-stone-900'
                        : 'border-transparent text-stone-400 hover:text-stone-700'
                    }`}
                  >
                    Formulation
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`pb-2 transition border-b-2 flex items-center gap-1 ${
                      activeTab === 'reviews'
                        ? 'border-rose-900 text-rose-950 font-bold'
                        : 'border-transparent text-stone-400 hover:text-stone-700'
                    }`}
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    <span>Client Reviews ({totalReviews})</span>
                  </button>
                  {product.usageInstructions && (
                    <button
                      onClick={() => setActiveTab('usage')}
                      className={`pb-2 transition border-b-2 ${
                        activeTab === 'usage'
                          ? 'border-stone-900 text-stone-900'
                          : 'border-transparent text-stone-400 hover:text-stone-700'
                      }`}
                    >
                      Application
                    </button>
                  )}
                </div>

                {/* Tab Content Panes */}
                <div className="py-4 text-xs text-stone-600 leading-relaxed min-h-[140px]">
                  {activeTab === 'details' && <p>{product.description}</p>}

                  {activeTab === 'ingredients' && (
                    <p className="font-mono text-[11px] leading-normal text-stone-700 bg-stone-50 p-3 rounded border border-stone-200">
                      {product.ingredients}
                    </p>
                  )}

                  {activeTab === 'usage' && <p>{product.usageInstructions}</p>}

                  {/* CUSTOMER REVIEW SECTION EXTENSION */}
                  {activeTab === 'reviews' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                      {reviewSuccessMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{reviewSuccessMsg}</span>
                        </div>
                      )}

                      {/* Ratings Breakdown Summary */}
                      <div className="bg-stone-50 p-4 rounded-xl border border-stone-200/90 flex flex-col sm:flex-row items-center gap-6">
                        <div className="text-center sm:text-left shrink-0">
                          <div className="text-3xl font-serif font-bold text-stone-900 tabular-nums">
                            {avgRating}
                          </div>
                          <div className="flex text-amber-500 my-1 justify-center sm:justify-start">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= Math.round(Number(avgRating)) ? 'fill-current' : 'text-stone-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-stone-500 block">
                            Based on {totalReviews} reviews
                          </span>
                        </div>

                        {/* Progress distribution */}
                        <div className="flex-1 w-full space-y-1.5 text-[11px]">
                          {[5, 4, 3, 2, 1].map((starVal) => {
                            const count = ratingCounts[starVal as 1 | 2 | 3 | 4 | 5] || 0;
                            const percent = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                            return (
                              <div key={starVal} className="flex items-center gap-2">
                                <span className="w-6 font-mono text-stone-500">{starVal}★</span>
                                <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                                <span className="w-8 text-right font-mono text-stone-400 text-[10px]">
                                  {count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Write a Review Module */}
                      <div className="bg-white border border-stone-200 rounded-xl p-4 sm:p-5 shadow-xs">
                        {auth.currentUser || user ? (
                          <form onSubmit={handleSubmitReview} className="space-y-3.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-rose-900 text-white flex items-center justify-center text-[10px] font-bold">
                                  {(auth.currentUser?.displayName || user?.displayName || 'C')[0]}
                                </div>
                                <span className="text-xs font-semibold text-stone-900">
                                  {auth.currentUser?.displayName || user?.displayName || 'Client'}
                                </span>
                                <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  <span>Authenticated</span>
                                </span>
                              </div>
                              <span className="text-[10px] text-stone-400 font-mono">
                                Cloud Firestore Persistent
                              </span>
                            </div>

                            {/* Interactive Star Picker */}
                            <div className="space-y-1">
                              <label className="block text-xs font-semibold text-stone-700">
                                Overall Formulation Rating *
                              </label>
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex gap-1.5 text-amber-400 cursor-pointer"
                                  onMouseLeave={() => setHoverRating(null)}
                                >
                                  {[1, 2, 3, 4, 5].map((star) => {
                                    const effective = hoverRating !== null ? hoverRating : newRating;
                                    const isFilled = star <= effective;
                                    return (
                                      <button
                                        type="button"
                                        key={star}
                                        onMouseEnter={() => setHoverRating(star)}
                                        onClick={() => setNewRating(star)}
                                        className="p-1 hover:scale-110 active:scale-95 transition-transform focus:outline-none"
                                        aria-label={`Rate ${star} stars`}
                                      >
                                        <Star
                                          className={`w-5 h-5 ${
                                            isFilled ? 'fill-current text-amber-400' : 'text-stone-300'
                                          }`}
                                        />
                                      </button>
                                    );
                                  })}
                                </div>
                                <span className="text-xs text-stone-600 font-medium italic">
                                  {getRatingDescriptor(hoverRating !== null ? hoverRating : newRating)}
                                </span>
                              </div>
                            </div>

                            {/* Text Review Input */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-semibold text-stone-700">
                                  Your Detailed Experience *
                                </label>
                                <span className="text-[10px] text-stone-400 font-mono">
                                  {newComment.length} / 1000
                                </span>
                              </div>
                              <textarea
                                rows={3}
                                required
                                minLength={3}
                                maxLength={1000}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Share details on texture absorption, skin finish, efficacy over time, and scent profile..."
                                className="w-full bg-stone-50 border border-stone-300 rounded-lg p-2.5 text-xs text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900 transition-colors"
                              />
                            </div>

                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-stone-400">
                                Reviews are stored in Firestore and checked for community authenticity.
                              </span>

                              <button
                                type="submit"
                                disabled={submittingReview || newComment.trim().length < 3}
                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold font-serif tracking-wider uppercase transition shadow-sm disabled:opacity-50"
                              >
                                {submittingReview ? (
                                  <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving to Firestore...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5 text-rose-300" />
                                    <span>Submit Review</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        ) : (
                          /* Prompt for Unauthenticated Visitors */
                          <div className="py-5 px-4 text-center space-y-3 bg-stone-50/80 rounded-lg border border-dashed border-stone-300">
                            <div className="w-9 h-9 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center mx-auto">
                              <Lock className="w-4 h-4 text-stone-700" />
                            </div>
                            <div className="space-y-0.5 max-w-sm mx-auto">
                              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                                Client Sign-In Required
                              </h4>
                              <p className="text-[11px] text-stone-500 leading-normal">
                                Authenticate to rate this formula and record verified reviews in Firestore.
                              </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={async () => {
                                  const res = await signInWithGoogle();
                                  if (!res.success && res.error) {
                                    setErrorMessage(res.error);
                                  }
                                }}
                                className="px-4 py-2 bg-white hover:bg-stone-100 text-stone-900 border border-stone-300 rounded-full text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                  <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                  />
                                  <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                  />
                                  <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                  />
                                  <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                  />
                                </svg>
                                <span>Sign In with Google</span>
                              </button>

                              {onOpenAuth && (
                                <button
                                  type="button"
                                  onClick={onOpenAuth}
                                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-xs font-semibold transition"
                                >
                                  <span>Atelier Account</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Reviews Stream */}
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-stone-800">
                          Community Client Feedback ({reviews.length})
                        </h4>

                        {reviews.length === 0 ? (
                          <div className="p-8 text-center bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                            <Sparkles className="w-6 h-6 text-stone-400 mx-auto stroke-[1.5]" />
                            <p className="text-xs font-semibold text-stone-700">
                              No client reviews recorded yet
                            </p>
                            <p className="text-[11px] text-stone-400">
                              Be the first patron to share feedback for this formulation.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                            {reviews.map((r) => (
                              <div
                                key={r.id}
                                className="p-3.5 bg-stone-50 rounded-lg border border-stone-200/90 space-y-1.5 transition-colors hover:bg-stone-100/60"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-[9px]">
                                      {(r.userName || 'C')[0].toUpperCase()}
                                    </div>
                                    <strong className="text-xs font-semibold text-stone-900">
                                      {r.userName}
                                    </strong>
                                    {r.verifiedPurchase && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.2 rounded">
                                        <UserCheck className="w-3 h-3 text-emerald-700" />
                                        Verified
                                      </span>
                                    )}
                                    {r.isFirestore && (
                                      <span className="text-[9px] font-mono text-stone-400 bg-stone-200/70 px-1 py-0.2 rounded">
                                        Firestore
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex text-amber-400">
                                    {[...Array(5)].map((_, idx) => (
                                      <Star
                                        key={idx}
                                        className={`w-3 h-3 ${
                                          idx < (r.rating || 5) ? 'fill-current' : 'text-stone-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>

                                <p className="text-xs text-stone-700 leading-relaxed font-sans">
                                  {r.comment}
                                </p>

                                <div className="flex items-center justify-between pt-0.5 text-[10px] text-stone-400 font-mono">
                                  <span>{formatDate(r.createdAt)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
