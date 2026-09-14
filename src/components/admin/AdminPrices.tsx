import React, { useState } from 'react';
import { Product } from '../../types.ts';
import { Tag, Save, CheckCircle2, DollarSign, TrendingDown } from 'lucide-react';
import { triggerHaptic } from '../../telegram.ts';

interface AdminPricesProps {
  products: Product[];
  currency: string;
  onUpdatePrices: (updates: { id: string; price: number; originalPrice?: number }[]) => Promise<void>;
  showToast: (msg: string) => void;
}

export const AdminPrices: React.FC<AdminPricesProps> = ({
  products,
  currency,
  onUpdatePrices,
  showToast,
}) => {
  const [drafts, setDrafts] = useState<Record<string, { price: number; originalPrice?: number }>>(() => {
    const init: Record<string, { price: number; originalPrice?: number }> = {};
    products.forEach((p) => {
      init[p.id] = { price: p.price, originalPrice: p.originalPrice };
    });
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());

  const handlePriceChange = (id: string, field: 'price' | 'originalPrice', val: number) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: val,
      },
    }));
    setDirtyIds((prev) => new Set(prev).add(id));
  };

  const handleSaveAll = async () => {
    if (dirtyIds.size === 0) return;
    setSaving(true);
    triggerHaptic('medium');
    try {
      const updates = Array.from(dirtyIds).map((id) => ({
        id,
        price: drafts[id].price,
        originalPrice: drafts[id].originalPrice,
      }));
      await onUpdatePrices(updates);
      setDirtyIds(new Set());
      showToast(`Updated prices for ${updates.length} products!`);
    } catch (err: any) {
      alert(err.message || 'Failed to update prices');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
            Product Pricing & Discounts
          </h3>
          <p className="text-[11px] text-neutral-500">
            Quickly update digital product prices and discount offers
          </p>
        </div>
        <button
          type="button"
          disabled={saving || dirtyIds.size === 0}
          onClick={handleSaveAll}
          className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : `Save Changes (${dirtyIds.size})`}</span>
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-3 bg-neutral-50 border-b border-neutral-200 flex items-center justify-between text-[11px] font-bold text-neutral-600">
          <span>Product</span>
          <div className="flex items-center gap-6 pr-2">
            <span>Selling Price</span>
            <span>Original (Crossed)</span>
          </div>
        </div>

        <div className="divide-y divide-neutral-100">
          {products.map((prod) => {
            const currentDraft = drafts[prod.id] || { price: prod.price, originalPrice: prod.originalPrice };
            const isDirty = dirtyIds.has(prod.id);

            return (
              <div
                key={prod.id}
                className={`p-3 flex items-center justify-between gap-3 transition-colors ${
                  isDirty ? 'bg-purple-50/40' : 'hover:bg-neutral-50/60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-900 truncate">{prod.nameEn}</span>
                    {isDirty && (
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block" title="Unsaved change" />
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">Stock: {prod.stock === -1 ? 'Unlimited' : prod.stock}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      {currency}
                    </span>
                    <input
                      type="number"
                      value={currentDraft.price}
                      onChange={(e) => handlePriceChange(prod.id, 'price', Number(e.target.value))}
                      className="w-full pl-6 pr-2 py-1 text-xs font-bold text-neutral-900 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-purple-500 text-right"
                    />
                  </div>

                  <div className="relative w-24">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                      {currency}
                    </span>
                    <input
                      type="number"
                      value={currentDraft.originalPrice ?? ''}
                      placeholder="None"
                      onChange={(e) =>
                        handlePriceChange(
                          prod.id,
                          'originalPrice',
                          e.target.value === '' ? (undefined as any) : Number(e.target.value)
                        )
                      }
                      className="w-full pl-6 pr-2 py-1 text-xs font-semibold text-neutral-500 bg-neutral-50 border border-neutral-200 rounded-lg focus:outline-none focus:border-purple-500 text-right"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
