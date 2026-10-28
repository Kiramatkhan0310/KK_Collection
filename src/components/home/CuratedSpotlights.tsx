import React from 'react';
import { ArrowRight } from 'lucide-react';
import { CategorySlug } from '../../types';

interface CuratedSpotlightsProps {
  onSelectCategory: (cat: CategorySlug) => void;
}

export const CuratedSpotlights: React.FC<CuratedSpotlightsProps> = ({ onSelectCategory }) => {
  const spotlights = [
    {
      category: 'skincare' as CategorySlug,
      title: 'Active Skin Elixirs & Barrier Repair',
      description: 'Stabilized 15% Vitamin C, 10% Niacinamide, and multi-molecular ceramides for clinical radiance.',
      image: '/src/assets/images/spotlight_skincare_elixir_1792869212007.jpg',
      tag: 'Bioactive Formulas'
    },
    {
      category: 'fragrance' as CategorySlug,
      title: 'Artisanal Extraits & Botanical Parfums',
      description: 'Turkish damask rose, amber resins, and Cambodian oud created by master European perfumers.',
      image: '/src/assets/images/craftsmanship_perfume_amber_1792869212475.jpg',
      tag: 'Fine Fragrance'
    },
    {
      category: 'makeup' as CategorySlug,
      title: 'Silk Radiance Complexion & Velour Lips',
      description: 'Weightless micro-milled pigments and non-drying matte lipsticks designed for warm undertones.',
      image: '/src/assets/images/editorial_makeup_collection_1792869212052.jpg',
      tag: 'Studio Artistry'
    }
  ];

  return (
    <section className="py-16 bg-[#FAF8F5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Editorial Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-stone-200">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-800">
              Curated Collections
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 mt-1">
              Iconic Formulations of the House
            </h2>
          </div>
          <p className="text-xs text-stone-500 max-w-md mt-2 sm:mt-0 leading-relaxed">
            Targeted active formulations calibrated for high performance, verified skin biocompatibility, and sensorial pleasure.
          </p>
        </div>

        {/* 3-Column Spotlight Grid with equal aspect ratio and measured scrims */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {spotlights.map((item) => (
            <div
              key={item.category}
              onClick={() => onSelectCategory(item.category)}
              className="group relative cursor-pointer overflow-hidden rounded-xl bg-white border border-stone-200 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col"
            >
              {/* Image Container with 4:3 Aspect Ratio */}
              <div className="aspect-[4/3] w-full overflow-hidden bg-stone-100 relative">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const fallback =
                      item.category === 'skincare'
                        ? 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80'
                        : item.category === 'fragrance'
                        ? 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=800&q=80'
                        : 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80';
                    (e.target as HTMLImageElement).src = fallback;
                  }}
                />
                <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-stone-100 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded">
                  {item.tag}
                </div>
              </div>

              {/* Metadata */}
              <div className="p-6 flex flex-col flex-1 justify-between bg-white">
                <div>
                  <h3 className="text-base font-serif font-bold text-stone-900 group-hover:text-rose-900 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-stone-900 group-hover:text-rose-900">
                  <span className="tracking-wide">Explore {item.category}</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
