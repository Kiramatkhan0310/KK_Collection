import React from 'react';
import { ShieldCheck, Truck, Sparkles, RefreshCw, FileText } from 'lucide-react';
import { CategorySlug } from '../../types/index.ts';

interface FooterProps {
  onSelectCategory: (cat: CategorySlug | 'all') => void;
  onOpenPolicy: (tab: 'returns' | 'shipping' | 'ingredients' | 'privacy') => void;
  onOpenTrackLookup: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  onOpenPolicy,
  onOpenTrackLookup
}) => {
  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800">
      {/* Trust Markers Bar */}
      <div className="border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3.5">
            <Truck className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-stone-100">Nationwide Express Delivery</h4>
              <p className="text-xs text-stone-400 mt-0.5">TCS &amp; Leopards courier delivery across Karachi, Lahore, Islamabad &amp; all of Pakistan.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-stone-100">100% Authentic Formulations</h4>
              <p className="text-xs text-stone-400 mt-0.5">Direct manufacturer batch certification codes on every luxury bottle and jar.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <Sparkles className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-stone-100">Clean &amp; Dermatologically Tested</h4>
              <p className="text-xs text-stone-400 mt-0.5">Formulated without parabens, phthalates, or harsh sulfates. 100% Cruelty-free.</p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <RefreshCw className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-stone-100">COD &amp; Verified Online Pay</h4>
              <p className="text-xs text-stone-400 mt-0.5">Pay upon parcel arrival or choose 256-bit cryptographically verified cards.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-stone-100 text-stone-900 flex items-center justify-center font-serif text-sm font-bold">
                KK
              </div>
              <span className="text-xl font-serif font-bold tracking-widest text-white">
                KK COLLECTION
              </span>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              An atelier dedicated to high-performance skincare, pure botanical distillations, luminous foundations, and luxury fragrance designed for enduring skin health.
            </p>
            <div className="pt-2 text-xs text-stone-400 space-y-1">
              <p><strong className="text-stone-300">Flagship Studio:</strong> Gulberg III, Lahore, Pakistan</p>
              <p><strong className="text-stone-300">Concierge Desk:</strong> concierge@kkcollection.store · 042-35789000</p>
            </div>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h5 className="text-xs uppercase font-semibold tracking-wider text-stone-200">Catalog Collections</h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => onSelectCategory('skincare')} className="hover:text-stone-100 transition-colors">
                  Barrier Repair Skincare
                </button>
              </li>
              <li>
                <button onClick={() => onSelectCategory('makeup')} className="hover:text-stone-100 transition-colors">
                  Silk Foundation &amp; Palettes
                </button>
              </li>
              <li>
                <button onClick={() => onSelectCategory('lip-care')} className="hover:text-stone-100 transition-colors">
                  Nourishing Lip Therapy
                </button>
              </li>
              <li>
                <button onClick={() => onSelectCategory('haircare')} className="hover:text-stone-100 transition-colors">
                  Bond Restructuring Haircare
                </button>
              </li>
              <li>
                <button onClick={() => onSelectCategory('fragrance')} className="hover:text-stone-100 transition-colors">
                  Artisanal Eau de Parfum
                </button>
              </li>
              <li>
                <button onClick={() => onSelectCategory('body-care')} className="hover:text-stone-100 transition-colors">
                  Whipped Body Butters
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h5 className="text-xs uppercase font-semibold tracking-wider text-stone-200">Institutional Policies</h5>
            <ul className="space-y-2 text-xs text-stone-400">
              <li>
                <button onClick={() => onOpenPolicy('returns')} className="hover:text-stone-100 transition-colors">
                  7-Day Return Policy
                </button>
              </li>
              <li>
                <button onClick={() => onOpenPolicy('shipping')} className="hover:text-stone-100 transition-colors">
                  Courier &amp; COD Terms
                </button>
              </li>
              <li>
                <button onClick={() => onOpenPolicy('ingredients')} className="hover:text-stone-100 transition-colors">
                  Cruelty-Free Standard
                </button>
              </li>
              <li>
                <button onClick={() => onOpenPolicy('privacy')} className="hover:text-stone-100 transition-colors">
                  Privacy &amp; Data Security
                </button>
              </li>
              <li>
                <button onClick={onOpenTrackLookup} className="hover:text-stone-100 text-rose-300 font-semibold transition-colors flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Track Courier Parcel</span>
                </button>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h5 className="text-xs uppercase font-semibold tracking-wider text-stone-200">Privilege Vouchers</h5>
            <div className="bg-stone-800/80 p-3 rounded-lg border border-stone-700/60 text-xs space-y-1.5">
              <p className="text-rose-300 font-semibold font-mono tracking-wider">WELCOME10</p>
              <p className="text-stone-400 text-[11px]">10% off your initial purchase above Rs. 2,000.</p>
            </div>
            <div className="bg-stone-800/80 p-3 rounded-lg border border-stone-700/60 text-xs space-y-1.5">
              <p className="text-rose-300 font-semibold font-mono tracking-wider">KKBEAUTY</p>
              <p className="text-stone-400 text-[11px]">Flat Rs. 500 privilege discount on orders over Rs. 3,500.</p>
            </div>
          </div>

        </div>

        <div className="border-t border-stone-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-500">
          <p>© 2026 KK Collection. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>256-Bit SSL Encryption</span>
            <span>·</span>
            <span>TCS &amp; Leopards Logistics Partner</span>
            <span>·</span>
            <span>Cruelty-Free Certified</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
