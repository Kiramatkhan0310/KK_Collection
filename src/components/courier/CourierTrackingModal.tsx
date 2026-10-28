import React, { useState, useEffect } from 'react';
import { X, Truck, CheckCircle2, Clock, MapPin, Package, AlertCircle, Loader2 } from 'lucide-react';
import { ApiClient } from '../../services/apiClient.ts';
import { formatCurrency, formatDate } from '../../utils/currency.ts';

interface CourierTrackingModalProps {
  consignmentNumber: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CourierTrackingModal: React.FC<CourierTrackingModalProps> = ({
  consignmentNumber,
  isOpen,
  onClose
}) => {
  const [consignment, setConsignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchTracking() {
      if (!isOpen || !consignmentNumber) return;
      setLoading(true);
      setError(null);
      try {
        const res = await ApiClient.trackConsignment(consignmentNumber);
        if (mounted) setConsignment(res.consignment);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Tracking number not found in carrier network.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchTracking();
    return () => { mounted = false; };
  }, [isOpen, consignmentNumber]);

  if (!isOpen || !consignmentNumber) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-stone-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-stone-500">
                Pakistan Express Logistics
              </span>
              <h3 className="text-base font-serif font-bold text-stone-900">
                Consignment #{consignmentNumber}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-stone-700" />
              <p className="text-xs text-stone-500">Querying live courier tracking hub...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{error}</span>
            </div>
          ) : consignment ? (
            <>
              {/* Carrier & Consignee Summary */}
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-2 text-xs">
                <div className="flex justify-between items-center border-b border-stone-200 pb-2">
                  <span className="font-semibold text-stone-900">{consignment.courierName}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    consignment.currentStatus === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {consignment.currentStatus.replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600 pt-1">
                  <div>
                    <span className="text-stone-400 block">Recipient:</span>
                    <strong className="text-stone-900">{consignment.recipientName}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Destination:</span>
                    <strong className="text-stone-900">{consignment.destinationCity}</strong>
                  </div>
                  <div>
                    <span className="text-stone-400 block">Weight:</span>
                    <span>{consignment.weightKg} kg</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">COD Collectable:</span>
                    <strong className="text-stone-900 font-mono">
                      {consignment.codAmount > 0 ? formatCurrency(consignment.codAmount) : 'Paid Online'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Checkpoint Timeline */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-bold tracking-wider text-stone-900 border-b border-stone-200 pb-1.5">
                  Live Courier Tracking Milestones
                </h4>

                <div className="space-y-4 pl-2 border-l-2 border-stone-200">
                  {consignment.checkpoints?.map((chk: any, idx: number) => (
                    <div key={idx} className="relative pl-5">
                      {/* Node circle */}
                      <div className="absolute -left-[19px] top-0.5 w-3.5 h-3.5 rounded-full bg-stone-900 border-2 border-white ring-2 ring-stone-200" />
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-stone-900">{chk.status}</span>
                          <span className="text-[10px] text-stone-400 font-mono">{formatDate(chk.timestamp)}</span>
                        </div>
                        <p className="text-[11px] text-stone-600 font-medium flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                          <span>{chk.location}</span>
                        </p>
                        {chk.remarks && (
                          <p className="text-[10px] text-stone-500 mt-0.5">{chk.remarks}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
