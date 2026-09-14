import React, { useState, useEffect } from 'react';
import { Product, DeliverySlot, DeliveryMediaItem } from '../../types.ts';
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock,
  Send,
  Eye,
  X,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { triggerHaptic } from '../../telegram.ts';

interface AdminDeliveryInventoryProps {
  products: Product[];
  adminToken: string;
  showToast: (msg: string) => void;
  currency: string;
}

export const AdminDeliveryInventory: React.FC<AdminDeliveryInventoryProps> = ({
  products,
  adminToken,
  showToast,
  currency,
}) => {
  const autoProducts = products.filter(
    (p) => p.deliveryMode === 'auto' || p.deliveryType === 'instant'
  );

  const [selectedProductId, setSelectedProductId] = useState<string>(
    autoProducts[0]?.id || ''
  );
  const [slots, setSlots] = useState<DeliverySlot[]>([]);
  const [stats, setStats] = useState<{
    total: number;
    available: number;
    reserved: number;
    delivered: number;
    disabled: number;
  }>({ total: 0, available: 0, reserved: 0, delivered: 0, disabled: 0 });

  const [loading, setLoading] = useState<boolean>(false);
  const [isAddingSlot, setIsAddingSlot] = useState<boolean>(false);
  const [editingSlot, setEditingSlot] = useState<DeliverySlot | null>(null);

  // Slot Builder State
  const [slotText, setSlotText] = useState<string>('');
  const [slotPhotoUrl, setSlotPhotoUrl] = useState<string>('');
  const [slotVideoUrl, setSlotVideoUrl] = useState<string>('');
  const [slotItems, setSlotItems] = useState<DeliveryMediaItem[]>([]);
  const [slotEnabled, setSlotEnabled] = useState<boolean>(true);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-admin-token': adminToken,
  });

  const fetchSlots = async (prodId: string) => {
    if (!prodId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${prodId}/slots`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setSlots(data.slots || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching delivery slots:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedProductId) {
      fetchSlots(selectedProductId);
    }
  }, [selectedProductId]);

  const resetForm = () => {
    setSlotText('');
    setSlotPhotoUrl('');
    setSlotVideoUrl('');
    setSlotItems([]);
    setSlotEnabled(true);
    setIsAddingSlot(false);
    setEditingSlot(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddingSlot(true);
    triggerHaptic('light');
  };

  const handleOpenEdit = (slot: DeliverySlot) => {
    setEditingSlot(slot);
    setSlotText(slot.text || slot.items?.find((i) => i.type === 'text')?.content || '');
    setSlotPhotoUrl(slot.photoUrl || slot.items?.find((i) => i.type === 'photo')?.content || '');
    setSlotVideoUrl(slot.videoUrl || slot.items?.find((i) => i.type === 'video')?.content || '');
    setSlotItems(slot.items ? [...slot.items] : []);
    setSlotEnabled(slot.enabled !== false);
    setIsAddingSlot(true);
    triggerHaptic('light');
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    // Validate that at least one item or content is provided
    const items: DeliveryMediaItem[] = [];
    if (slotText.trim()) {
      items.push({ id: `item-${Date.now()}-txt`, type: 'text', content: slotText.trim() });
    }
    if (slotPhotoUrl.trim()) {
      items.push({ id: `item-${Date.now()}-ph`, type: 'photo', content: slotPhotoUrl.trim() });
    }
    if (slotVideoUrl.trim()) {
      items.push({ id: `item-${Date.now()}-vd`, type: 'video', content: slotVideoUrl.trim() });
    }

    if (items.length === 0 && slotItems.length === 0) {
      alert('Please provide at least text, a photo URL, or a video URL for this slot.');
      return;
    }

    const payload = {
      items: items.length > 0 ? items : slotItems,
      text: slotText.trim(),
      photoUrl: slotPhotoUrl.trim() || undefined,
      videoUrl: slotVideoUrl.trim() || undefined,
      enabled: slotEnabled,
    };

    try {
      if (editingSlot) {
        const res = await fetch(`/api/admin/slots/${editingSlot.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Delivery slot updated');
          resetForm();
          fetchSlots(selectedProductId);
        } else {
          alert(data.error || 'Failed to update slot');
        }
      } else {
        const res = await fetch(`/api/admin/products/${selectedProductId}/slots`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Delivery slot added to inventory');
          resetForm();
          fetchSlots(selectedProductId);
        } else {
          alert(data.error || 'Failed to add slot');
        }
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to delete this delivery slot?')) return;
    try {
      const res = await fetch(`/api/admin/slots/${slotId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Slot deleted');
        fetchSlots(selectedProductId);
      } else {
        alert(data.error || 'Failed to delete slot');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleEnabled = async (slot: DeliverySlot) => {
    try {
      const res = await fetch(`/api/admin/slots/${slot.id}/toggle`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ enabled: !slot.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        triggerHaptic('light');
        fetchSlots(selectedProductId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= slots.length) return;

    const newSlots = [...slots];
    const [moved] = newSlots.splice(index, 1);
    newSlots.splice(targetIndex, 0, moved);

    setSlots(newSlots);
    triggerHaptic('light');

    try {
      await fetch(`/api/admin/products/${selectedProductId}/slots/reorder`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ slotIds: newSlots.map((s) => s.id) }),
      });
    } catch (err) {
      console.error('Failed to save slot order:', err);
    }
  };

  const currentProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-4">
      {/* Header & Product Switcher */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-purple-100 text-purple-700">
                <Package className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-neutral-900">
                Telegram Auto Delivery Inventory
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Each slot contains Telegram-ready content (Text, Photo, Video) sent atomically upon buyer checkout.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchSlots(selectedProductId)}
              className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-600 transition-colors"
              title="Refresh slots"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              disabled={!selectedProductId}
              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Delivery Slot</span>
            </button>
          </div>
        </div>

        {/* Product Selector Filter */}
        <div className="pt-2 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-xs font-semibold text-neutral-700 whitespace-nowrap">
            Select Product:
          </label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full sm:max-w-md bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-900 focus:outline-none focus:border-purple-500"
          >
            {autoProducts.length === 0 && (
              <option value="">No Auto-Delivery Products found</option>
            )}
            {autoProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nameEn} ({currency}{p.price}) — {p.availableSlotsCount ?? 0} Available
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory KPI Badges */}
      {selectedProductId && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 bg-white border border-neutral-200 rounded-xl text-center shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">
              Total Slots
            </span>
            <span className="text-lg font-extrabold text-neutral-900">{stats.total}</span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block tracking-wider">
              Available
            </span>
            <span className="text-lg font-extrabold text-emerald-700">{stats.available}</span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-amber-700 block tracking-wider">
              Reserved / Locked
            </span>
            <span className="text-lg font-extrabold text-amber-700">{stats.reserved}</span>
          </div>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-blue-700 block tracking-wider">
              Delivered
            </span>
            <span className="text-lg font-extrabold text-blue-700">{stats.delivered}</span>
          </div>
        </div>
      )}

      {/* Slots List */}
      <div className="space-y-2">
        {slots.length === 0 ? (
          <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-neutral-900">No Delivery Slots Found</h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Add delivery slots with text, photos, or videos to enable automatic Telegram delivery.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              Add First Slot
            </button>
          </div>
        ) : (
          slots.map((slot, index) => {
            const isAvailable = slot.status === 'available' && slot.enabled !== false;
            const isDelivered = slot.status === 'delivered';
            const isReserved = slot.status === 'reserved';
            const isDisabled = slot.enabled === false;

            return (
              <div
                key={slot.id}
                className={`bg-white border rounded-xl p-3.5 space-y-2.5 transition-all ${
                  isDisabled
                    ? 'border-neutral-200 opacity-60 bg-neutral-50'
                    : isAvailable
                    ? 'border-emerald-200 shadow-2xs'
                    : isDelivered
                    ? 'border-blue-100'
                    : 'border-amber-200'
                }`}
              >
                {/* Slot Top Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-neutral-100 text-neutral-700">
                      Slot #{slot.slotNumber || index + 1}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isDisabled
                          ? 'bg-neutral-200 text-neutral-700'
                          : isAvailable
                          ? 'bg-emerald-100 text-emerald-800'
                          : isReserved
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isDisabled ? 'Disabled' : slot.status}
                    </span>
                  </div>

                  {/* Reorder and Action Tools */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 text-neutral-500 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === slots.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className="p-1 rounded hover:bg-neutral-100 disabled:opacity-30 text-neutral-500 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(slot)}
                      className="p-1 rounded hover:bg-neutral-100 text-neutral-600 cursor-pointer"
                      title={slot.enabled ? 'Disable slot' : 'Enable slot'}
                    >
                      {slot.enabled !== false ? (
                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-neutral-400" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(slot)}
                      className="p-1 rounded hover:bg-neutral-100 text-neutral-600 cursor-pointer"
                      title="Edit slot"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="p-1 rounded hover:bg-rose-50 text-rose-600 cursor-pointer"
                      title="Delete slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content Previews: Text, Photo, Video */}
                <div className="space-y-1.5 text-xs">
                  {slot.text && (
                    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-2 font-mono text-[11px] text-neutral-800 break-all select-all flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                      <span className="flex-1 whitespace-pre-wrap">{slot.text}</span>
                    </div>
                  )}

                  {slot.photoUrl && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-[11px]">
                      <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="truncate flex-1 font-mono">{slot.photoUrl}</span>
                      <a
                        href={slot.photoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-purple-600 hover:text-purple-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {slot.videoUrl && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px]">
                      <VideoIcon className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate flex-1 font-mono">{slot.videoUrl}</span>
                      <a
                        href={slot.videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Delivered Information Audit Log */}
                {isDelivered && (
                  <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-500 font-mono">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Delivered to TG ID: {slot.deliveredToTelegramId || 'User'}
                    </span>
                    {slot.orderId && <span>Order: #{slot.orderId.slice(-6)}</span>}
                    {slot.deliveredAt && (
                      <span>Time: {new Date(slot.deliveredAt).toLocaleTimeString()}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ADD / EDIT SLOT MODAL */}
      {isAddingSlot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSlot}
            className="bg-white rounded-2xl p-5 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                  Auto Delivery
                </span>
                <h3 className="text-sm font-bold text-neutral-900">
                  {editingSlot ? `Edit Slot #${editingSlot.slotNumber}` : 'Add New Delivery Slot'}
                </h3>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Configure the content of this slot. You can add <b>Text</b> (credentials/code), a <b>Photo</b> URL, and a <b>Video</b> URL. All items in this slot will be dispatched to the buyer's Telegram chat.
            </p>

            {/* 1. Text Content */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-neutral-500" />
                <span>Text Content (Credentials, Code, Secret Key, Instructions)</span>
              </label>
              <textarea
                rows={3}
                value={slotText}
                onChange={(e) => setSlotText(e.target.value)}
                placeholder="e.g. Email: vip@domain.com | Password: Secret#123&#10;Or Telegram Gift Link: https://t.me/giftcode/..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs font-mono focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* 2. Photo URL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-purple-600" />
                <span>Photo URL (Optional)</span>
              </label>
              <input
                type="url"
                value={slotPhotoUrl}
                onChange={(e) => setSlotPhotoUrl(e.target.value)}
                placeholder="https://example.com/voucher-image.png"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
              />
              {slotPhotoUrl.trim() && (
                <div className="mt-1 max-h-24 overflow-hidden rounded-lg border border-neutral-200">
                  <img
                    src={slotPhotoUrl.trim()}
                    alt="Preview"
                    className="w-full h-24 object-cover"
                    onError={(e) => ((e.target as any).style.display = 'none')}
                  />
                </div>
              )}
            </div>

            {/* 3. Video URL */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1">
                <VideoIcon className="w-3.5 h-3.5 text-blue-600" />
                <span>Video URL (Optional)</span>
              </label>
              <input
                type="url"
                value={slotVideoUrl}
                onChange={(e) => setSlotVideoUrl(e.target.value)}
                placeholder="https://example.com/guide-video.mp4"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Enable / Disable switch */}
            <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <span className="text-xs font-semibold text-neutral-800">
                Slot Active & Deliverable
              </span>
              <button
                type="button"
                onClick={() => setSlotEnabled(!slotEnabled)}
                className="cursor-pointer"
              >
                {slotEnabled ? (
                  <ToggleRight className="w-6 h-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-neutral-400" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                {editingSlot ? 'Save Changes' : 'Add Slot'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
