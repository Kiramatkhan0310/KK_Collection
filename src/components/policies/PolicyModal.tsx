import React, { useState } from 'react';
import { X, ShieldCheck, RefreshCw, Truck, FileText } from 'lucide-react';

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'returns' | 'shipping' | 'ingredients' | 'privacy';
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'returns'
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'returns' | 'shipping' | 'ingredients' | 'privacy'>(initialTab);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div
        className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden border border-stone-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 bg-stone-50">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-800">
              Institutional Trust &amp; Standards
            </span>
            <h3 className="text-xl font-serif font-bold text-stone-900">
              KK Collection Client Policies
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 px-6 bg-white gap-6 text-xs font-semibold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('returns')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'returns'
                ? 'border-stone-900 text-stone-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Returns &amp; Exchanges</span>
          </button>

          <button
            onClick={() => setActiveTab('shipping')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'shipping'
                ? 'border-stone-900 text-stone-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Delivery &amp; COD Terms</span>
          </button>

          <button
            onClick={() => setActiveTab('ingredients')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'ingredients'
                ? 'border-stone-900 text-stone-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Formulation &amp; Cruelty-Free</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`py-3.5 border-b-2 flex items-center gap-1.5 whitespace-nowrap transition ${
              activeTab === 'privacy'
                ? 'border-stone-900 text-stone-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Privacy &amp; Data Security</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 max-h-[65vh] overflow-y-auto text-xs text-stone-700 leading-relaxed space-y-4">

          {activeTab === 'returns' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-stone-900 font-serif">7-Day Return &amp; Exchange Policy</h4>
              <p>
                At KK Collection, client satisfaction and cosmetic hygiene are paramount. We accept returns or exchanges for unused, unopened formulations in their original luxury packaging within <strong>7 days</strong> of confirmed courier delivery.
              </p>
              <div className="bg-stone-50 p-4 rounded-lg border border-stone-200 space-y-2">
                <h5 className="font-bold text-stone-900">Conditions for Return:</h5>
                <ul className="list-disc list-inside space-y-1 text-stone-600">
                  <li>Product seal, hologram sticker, and protective sleeve must remain intact.</li>
                  <li>Damaged or defective transit parcels must be reported within 24 hours of receipt with unboxing photos.</li>
                  <li>Refunds are credited to the customer&apos;s bank account or digital wallet within 3–5 business days following quality inspection at our Lahore hub.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-stone-900 font-serif">Nationwide Pakistan Delivery &amp; COD Policy</h4>
              <p>
                We partner with <strong>TCS Express</strong> and <strong>Leopards Courier</strong> to ensure swift, temperature-regulated transit from our centralized climate-controlled storage in Lahore.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-stone-50 rounded border border-stone-200">
                  <span className="font-bold text-stone-900 block mb-1">Major Metropolitan Hubs</span>
                  <p className="text-stone-600">Karachi, Lahore, Islamabad, Rawalpindi, Faisalabad:</p>
                  <strong className="text-stone-900 block mt-1">2 to 3 Business Days</strong>
                </div>
                <div className="p-3.5 bg-stone-50 rounded border border-stone-200">
                  <span className="font-bold text-stone-900 block mb-1">Rest of Pakistan</span>
                  <p className="text-stone-600">Peshawar, Quetta, Multan, Sialkot, Hyderabad &amp; rural zones:</p>
                  <strong className="text-stone-900 block mt-1">3 to 5 Business Days</strong>
                </div>
              </div>
              <p>
                <strong>Cash on Delivery (COD):</strong> Customers can inspect the exterior packaging and pay the exact invoice amount directly to the courier rider. Orders exceeding Rs. 5,000 enjoy 100% complimentary delivery nationwide.
              </p>
            </div>
          )}

          {activeTab === 'ingredients' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-stone-900 font-serif">Formulation Standards &amp; Ethical Sourcing</h4>
              <p>
                Every formula in the KK Collection catalog adheres to stringent international cosmetic safety directives. We combine high-concentration actives with soothing botanical buffers to protect the skin barrier.
              </p>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2 text-emerald-950">
                <p className="font-bold">Our Clean Formulation Pledge:</p>
                <ul className="list-disc list-inside space-y-1 text-emerald-900">
                  <li><strong>100% Cruelty-Free:</strong> Never tested on animals at any phase of ingredient development.</li>
                  <li><strong>Paraben &amp; Phthalate Free:</strong> Zero endocrine-disrupting preservative agents.</li>
                  <li><strong>Dermatologist Verified:</strong> Patch tested for sensitive skin compatibility in humid and dry climates.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-stone-900 font-serif">Client Data Protection &amp; Payment Security</h4>
              <p>
                We implement industry-grade security protocols to protect client privacy and transaction integrity.
              </p>
              <ul className="list-disc list-inside space-y-1 text-stone-600">
                <li><strong>No Card Data Retention:</strong> Credit/debit card credentials are never stored on our servers; transactions are encrypted via 256-bit SSL tokens directly with certified bank gateways.</li>
                <li><strong>Password Security:</strong> All client and administrator passwords are salted and hashed using PBKDF2 with SHA-512 cryptographic digests.</li>
                <li><strong>Confidentiality:</strong> Contact numbers and shipping coordinates are shared strictly with verified courier personnel for fulfillment purposes only.</li>
              </ul>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-stone-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};
