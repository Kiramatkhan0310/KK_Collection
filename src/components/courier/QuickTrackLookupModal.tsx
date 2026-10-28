import React, { useState } from 'react';
import { X, Search, Truck, ArrowRight } from 'lucide-react';

interface QuickTrackLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrack: (cn: string) => void;
}

export const QuickTrackLookupModal: React.FC<QuickTrackLookupModalProps> = ({
  isOpen,
  onClose,
  onTrack
}) => {
  const [cn, setCn] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cn.trim()) {
      onTrack(cn.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div
        className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-stone-200 my-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-stone-900" />
            <h3 className="text-base font-serif font-bold text-stone-900">Track Parcel Consignment</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-xs text-stone-600">
            Enter your TCS Express consignment number or KK Collection order reference:
          </p>

          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. TCS-98124021 or KK-749210"
              value={cn}
              onChange={(e) => setCn(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-300 rounded text-xs font-mono text-stone-900 uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-900"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-full bg-stone-900 text-white font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-stone-800 transition"
          >
            <span>Query Courier Milestones</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
