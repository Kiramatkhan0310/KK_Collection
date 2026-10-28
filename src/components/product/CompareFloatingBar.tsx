import React from 'react';
import { ArrowLeftRight, X, Sparkles, ChevronRight } from 'lucide-react';
import { useCompare } from '../../context/CompareContext.tsx';
import { Product } from '../../types/index.ts';

interface CompareFloatingBarProps {
  allProducts: Product[];
}

export const CompareFloatingBar: React.FC<CompareFloatingBarProps> = ({ allProducts }) => {
  const { compareIds, removeFromCompare, clearCompare, setIsCompareOpen, maxItems } = useCompare();

  if (compareIds.length === 0) return null;

  const comparedProducts = compareIds
    .map((id) => allProducts.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  return (
    <aside
      aria-label="Active formulation comparison"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-stone-900/95 text-stone-100 rounded-2xl shadow-2xl border border-stone-800/80 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-3.5 transition-all animate-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
        {/* Left: Indicator & Thumbnails */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800/40 flex items-center justify-center text-rose-300 shrink-0">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-serif font-bold tracking-wide uppercase text-stone-200">
                  Formulation Compare
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-medium">
                  {comparedProducts.length}/{maxItems}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 hidden xs:block">
                {comparedProducts.length === 1
                  ? 'Select at least 1 more to compare'
                  : 'Ready for side-by-side analysis'}
              </p>
            </div>
          </div>

          {/* Product Thumbnails with remove button */}
          <div className="flex items-center -space-x-1.5 sm:space-x-1.5 sm:ml-2">
            {comparedProducts.map((p) => (
              <div
                key={p.id}
                className="relative group w-8 h-8 rounded-lg border-2 border-stone-900 overflow-hidden bg-stone-800 shrink-0 shadow-sm"
                title={p.name}
              >
                <img
                  src={p.images[0] || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=200&q=80'}
                  alt={p.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCompare(p.id);
                  }}
                  aria-label={`Remove ${p.name} from comparison`}
                  className="absolute inset-0 bg-stone-950/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <X className="w-3.5 h-3.5 text-rose-300" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={clearCompare}
            className="text-xs text-stone-400 hover:text-stone-200 hover:underline px-2 py-1 transition-colors"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => setIsCompareOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-white text-stone-950 text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 whitespace-nowrap"
          >
            <span>Compare Now</span>
            <ChevronRight className="w-3.5 h-3.5 text-stone-700" />
          </button>
        </div>
      </div>
    </aside>
  );
};
