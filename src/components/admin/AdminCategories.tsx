import React, { useState } from 'react';
import { Category } from '../../types.ts';
import { Folder, Plus, Trash2, CheckCircle2, XCircle, Tag, ArrowUpDown } from 'lucide-react';
import { triggerHaptic } from '../../telegram.ts';

interface AdminCategoriesProps {
  categories: Category[];
  onSaveCategory: (cat: Partial<Category> & { nameEn: string }) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  showToast: (msg: string) => void;
}

export const AdminCategories: React.FC<AdminCategoriesProps> = ({
  categories,
  onSaveCategory,
  onDeleteCategory,
  showToast,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [icon, setIcon] = useState('Folder');
  const [sortOrder, setSortOrder] = useState<number>(categories.length + 1);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn.trim()) return;
    setSaving(true);
    try {
      await onSaveCategory({
        nameEn: nameEn.trim(),
        nameBn: nameBn.trim() || nameEn.trim(),
        icon: icon.trim() || 'Folder',
        sortOrder: Number(sortOrder) || 1,
        active: true,
      });
      setNameEn('');
      setNameBn('');
      setIcon('Folder');
      setIsAdding(false);
      showToast('Category created successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
            Categories Management
          </h3>
          <p className="text-[11px] text-neutral-500">
            Organize products into categories for the Telegram Mini App
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setIsAdding(!isAdding);
          }}
          className="px-2.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isAdding ? 'Cancel' : 'New Category'}</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-white border border-purple-200 rounded-2xl p-3.5 space-y-3 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-900 pb-1 border-b border-neutral-100">
            <Tag className="w-4 h-4 text-purple-600" />
            <span>Create New Product Category</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                Category Name (English) *
              </label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="e.g. Free Fire Diamonds"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                Category Name (Bangla)
              </label>
              <input
                type="text"
                value={nameBn}
                onChange={(e) => setNameBn(e.target.value)}
                placeholder="e.g. ফ্রি ফায়ার ডায়মন্ড"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                Icon Name (Lucide)
              </label>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Folder, Flame, Gamepad..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                Display Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !nameEn.trim()}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Save Category'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {categories.length === 0 ? (
          <div className="p-8 text-center bg-white border border-neutral-200 rounded-2xl text-xs text-neutral-500">
            No categories defined yet.
          </div>
        ) : (
          categories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white border border-neutral-200 rounded-2xl p-3 flex items-center justify-between shadow-2xs hover:border-neutral-300 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60 flex items-center justify-center font-bold text-xs">
                  <Folder className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-neutral-900">{cat.nameEn}</span>
                    {cat.nameBn && cat.nameBn !== cat.nameEn && (
                      <span className="text-[10px] text-neutral-500 font-medium">({cat.nameBn})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
                    <span>ID: {cat.id}</span>
                    <span>•</span>
                    <span>Order: #{cat.sortOrder ?? 0}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    cat.active !== false
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {cat.active !== false ? 'Active' : 'Hidden'}
                </span>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm(`Delete category "${cat.nameEn}"?`)) {
                      triggerHaptic('medium');
                      await onDeleteCategory(cat.id);
                      showToast('Category deleted');
                    }
                  }}
                  className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Delete category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
