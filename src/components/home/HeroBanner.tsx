import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { CategorySlug } from '../../types';

interface HeroBannerProps {
  onSelectCategory: (cat: CategorySlug | 'all') => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onSelectCategory }) => {
  return (
    <section className="relative overflow-hidden bg-stone-900 text-stone-100">
      {/* Visual Canvas with Scrim */}
      <div className="relative min-h-[520px] lg:min-h-[580px] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <img
            src={`${import.meta.env.BASE_URL}images/hero_cosmetics_luxury_1792869210810.jpg`}
            alt="KK Collection Luxury Editorial"
            className="w-full h-full object-cover object-center scale-[1.02] transition-transform duration-1000"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1600&q=80';
            }}
          />
          {/* Measured gradient scrim providing 4.5:1 text legibility across all screens */}
          <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/65 to-transparent sm:w-3/4" />
          <div className="absolute inset-0 bg-stone-950/30" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-2xl space-y-6">

            {/* Quiet unboxed text kicker */}
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-rose-200/90 font-medium">
              <span>The Autumn / Winter Edit</span>
              <span aria-hidden="true">·</span>
              <span>Karachi &amp; Lahore Flagship</span>
            </div>

            {/* Display Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-white tracking-tight leading-[1.1] text-balance">
              Formulated for Radiance. Crafted with Absolute Discipline.
            </h1>

            {/* Body Copy */}
            <p className="text-sm sm:text-base text-stone-200/90 leading-relaxed font-normal max-w-xl">
              Discover bioactive barrier repair elixirs, micro-milled silk foundations, and concentrated extraits de parfum formulated to elevate everyday beauty into an enduring ritual.
            </p>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                onClick={() => onSelectCategory('all')}
                className="flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white text-stone-950 hover:bg-stone-100 active:scale-95 text-xs uppercase font-semibold tracking-wider transition shadow-lg"
              >
                <span>Shop Full Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onSelectCategory('skincare')}
                className="px-6 py-3.5 rounded-full bg-stone-900/60 hover:bg-stone-900/90 backdrop-blur-md text-stone-100 border border-stone-700/80 active:scale-95 text-xs uppercase font-semibold tracking-wider transition"
              >
                Explore Skincare
              </button>
            </div>

            {/* Quantitative Trust Strip */}
            <div className="pt-6 border-t border-stone-800/80 flex flex-wrap items-center gap-6 text-xs text-stone-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-300 shrink-0" />
                <span>60+ Dermatologist-Approved Formulas</span>
              </div>
              <span className="hidden sm:inline text-stone-600">·</span>
              <div>
                <span>Complimentary Delivery Nationwide</span>
              </div>
              <span className="hidden sm:inline text-stone-600">·</span>
              <div>
                <span>Cash on Delivery Verified</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
