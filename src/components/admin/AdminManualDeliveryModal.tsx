import React, { useState } from 'react';
import { Order, DeliveryMediaItem } from '../../types.ts';
import {
  X,
  Send,
  Plus,
  Trash2,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { triggerHaptic } from '../../telegram.ts';

interface AdminManualDeliveryModalProps {
  order: Order | null;
  onClose: () => void;
  adminToken: string;
  onDelivered: (updatedOrder: Order) => void;
  showToast: (msg: string) => void;
  currency: string;
}

export const AdminManualDeliveryModal: React.FC<AdminManualDeliveryModalProps> = ({
  order,
  onClose,
  adminToken,
  onDelivered,
  showToast,
  currency,
}) => {
  if (!order) return null;

  const [items, setItems] = useState<DeliveryMediaItem[]>([]);
  const [completeOrder, setCompleteOrder] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [activeInputType, setActiveInputType] = useState<'text' | 'photo' | 'video' | null>('text');

  // Input fields for current item being added
  const [tempText, setTempText] = useState<string>('');
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string>('');
  const [tempVideoUrl, setTempVideoUrl] = useState<string>('');
  const [tempCaption, setTempCaption] = useState<string>('');

  // Cancellation
  const [showCancelSection, setShowCancelSection] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('Item unavailable');
  const [refundBalance, setRefundBalance] = useState<boolean>(true);

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'x-admin-token': adminToken,
  });

  const handleAddItem = (type: 'text' | 'photo' | 'video') => {
    if (type === 'text') {
      if (!tempText.trim()) return;
      setItems((prev) => [
        ...prev,
        { id: `manual-${Date.now()}-${prev.length + 1}`, type: 'text', content: tempText.trim() },
      ]);
      setTempText('');
    } else if (type === 'photo') {
      if (!tempPhotoUrl.trim()) return;
      setItems((prev) => [
        ...prev,
        {
          id: `manual-${Date.now()}-${prev.length + 1}`,
          type: 'photo',
          content: tempPhotoUrl.trim(),
          caption: tempCaption.trim() || undefined,
        },
      ]);
      setTempPhotoUrl('');
      setTempCaption('');
    } else if (type === 'video') {
      if (!tempVideoUrl.trim()) return;
      setItems((prev) => [
        ...prev,
        {
          id: `manual-${Date.now()}-${prev.length + 1}`,
          type: 'video',
          content: tempVideoUrl.trim(),
          caption: tempCaption.trim() || undefined,
        },
      ]);
      setTempVideoUrl('');
      setTempCaption('');
    }
    triggerHaptic('light');
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    triggerHaptic('light');
  };

  const handleSendDelivery = async () => {
    // If user has uncommitted text in tempText, add it automatically
    const finalItems = [...items];
    if (tempText.trim()) {
      finalItems.push({
        id: `manual-${Date.now()}-${finalItems.length + 1}`,
        type: 'text',
        content: tempText.trim(),
      });
    }
    if (tempPhotoUrl.trim()) {
      finalItems.push({
        id: `manual-${Date.now()}-${finalItems.length + 1}`,
        type: 'photo',
        content: tempPhotoUrl.trim(),
        caption: tempCaption.trim() || undefined,
      });
    }
    if (tempVideoUrl.trim()) {
      finalItems.push({
        id: `manual-${Date.now()}-${finalItems.length + 1}`,
        type: 'video',
        content: tempVideoUrl.trim(),
        caption: tempCaption.trim() || undefined,
      });
    }

    if (finalItems.length === 0) {
      alert('Please add at least one content item (text, photo, or video) before sending delivery.');
      return;
    }

    setIsSending(true);
    triggerHaptic('medium');

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/deliver`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          items: finalItems,
          completeOrder,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch delivery');
      }

      showToast('Delivery sent to Telegram chat & order completed!');
      onDelivered(data.order);
      onClose();
    } catch (err: any) {
      alert(`Delivery error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setIsSending(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          status: 'Cancelled',
          cancelReason,
          refundToBalance: refundBalance,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel order');
      }

      showToast('Order cancelled' + (refundBalance ? ' & balance refunded' : ''));
      onDelivered(data.order);
      onClose();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 max-h-[92vh] overflow-y-auto space-y-4 animate-in fade-in shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-neutral-100 px-2 py-0.5 rounded text-neutral-600">
                Order #{order.id.slice(-6)}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  order.status === 'Completed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : order.status === 'Processing'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {order.status}
              </span>
            </div>
            <h3 className="text-base font-bold text-neutral-900 mt-1">{order.productNameEn}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer & Order Summary Details */}
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs space-y-1.5 font-medium text-neutral-700">
          <div className="flex justify-between">
            <span className="text-neutral-500">Buyer Telegram ID:</span>
            <span className="font-mono font-bold text-purple-700 select-all">{order.telegramId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Quantity & Price:</span>
            <span>
              {order.quantity} × {currency}{order.unitPrice} = <strong className="text-neutral-900">{currency}{order.totalAmount}</strong>
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-500">Order Delivery Mode:</span>
            <span className="font-semibold text-blue-600 uppercase text-[11px]">
              {order.deliveryMode || 'Manual'}
            </span>
          </div>
          <div className="flex justify-between text-neutral-400 text-[10px]">
            <span>Placed At:</span>
            <span>{new Date(order.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Previous Delivery Log (if any) */}
        {order.deliveryData && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs space-y-1">
            <span className="font-bold text-emerald-900 block flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Existing Delivery Data:
            </span>
            <pre className="text-[11px] font-mono text-emerald-800 whitespace-pre-wrap select-all max-h-24 overflow-y-auto">
              {order.deliveryData}
            </pre>
          </div>
        )}

        {/* MANUAL DELIVERY COMPOSER */}
        <div className="border border-purple-200 bg-purple-50/40 rounded-2xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wide flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-purple-600" />
                Prepare Delivery Content
              </h4>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Content will be delivered directly to Telegram chat ID: <span className="font-mono font-bold text-neutral-800">{order.telegramId}</span>
              </p>
            </div>
          </div>

          {/* Type Selector Buttons: [Add Text] [Add Photo] [Add Video] */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveInputType('text');
                triggerHaptic('light');
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeInputType === 'text'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Add Text</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveInputType('photo');
                triggerHaptic('light');
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeInputType === 'photo'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Add Photo</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveInputType('video');
                triggerHaptic('light');
              }}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeInputType === 'video'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <VideoIcon className="w-3.5 h-3.5" />
              <span>Add Video</span>
            </button>
          </div>

          {/* Active Input Editor */}
          {activeInputType === 'text' && (
            <div className="bg-white border border-neutral-200 rounded-xl p-2.5 space-y-2">
              <label className="text-[11px] font-bold text-neutral-700 block">
                Text Message / Credentials / Activation Link:
              </label>
              <textarea
                rows={3}
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                placeholder="e.g. Here are your account credentials:&#10;Email: customer@stream.com&#10;Password: Secure#987"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-purple-500"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleAddItem('text')}
                  disabled={!tempText.trim()}
                  className="px-3 py-1 bg-purple-100 hover:bg-purple-200 disabled:opacity-50 text-purple-900 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to Payload
                </button>
              </div>
            </div>
          )}

          {activeInputType === 'photo' && (
            <div className="bg-white border border-neutral-200 rounded-xl p-2.5 space-y-2">
              <label className="text-[11px] font-bold text-neutral-700 block">
                Photo URL / Image Link:
              </label>
              <input
                type="url"
                value={tempPhotoUrl}
                onChange={(e) => setTempPhotoUrl(e.target.value)}
                placeholder="https://example.com/voucher-or-receipt.png"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                value={tempCaption}
                onChange={(e) => setTempCaption(e.target.value)}
                placeholder="Caption (optional)"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleAddItem('photo')}
                  disabled={!tempPhotoUrl.trim()}
                  className="px-3 py-1 bg-purple-100 hover:bg-purple-200 disabled:opacity-50 text-purple-900 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Photo to Payload
                </button>
              </div>
            </div>
          )}

          {activeInputType === 'video' && (
            <div className="bg-white border border-neutral-200 rounded-xl p-2.5 space-y-2">
              <label className="text-[11px] font-bold text-neutral-700 block">
                Video URL / Direct MP4 Link:
              </label>
              <input
                type="url"
                value={tempVideoUrl}
                onChange={(e) => setTempVideoUrl(e.target.value)}
                placeholder="https://example.com/setup-video.mp4"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-purple-500"
              />
              <input
                type="text"
                value={tempCaption}
                onChange={(e) => setTempCaption(e.target.value)}
                placeholder="Caption (optional)"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleAddItem('video')}
                  disabled={!tempVideoUrl.trim()}
                  className="px-3 py-1 bg-purple-100 hover:bg-purple-200 disabled:opacity-50 text-purple-900 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Video to Payload
                </button>
              </div>
            </div>
          )}

          {/* Staged Items Preview */}
          {items.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                Staged Items to Send ({items.length}):
              </span>
              <div className="space-y-1.5">
                {items.map((it, idx) => (
                  <div
                    key={it.id}
                    className="p-2 rounded-lg bg-white border border-neutral-200 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-purple-600 bg-purple-50 px-1.5 rounded">
                          #{idx + 1} {it.type}
                        </span>
                        {it.caption && <span className="text-[10px] text-neutral-400">({it.caption})</span>}
                      </div>
                      <p className="font-mono text-[11px] text-neutral-800 break-all whitespace-pre-wrap mt-0.5">
                        {it.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(it.id)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Complete Order checkbox */}
          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-800 cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={completeOrder}
              onChange={(e) => setCompleteOrder(e.target.checked)}
              className="w-4 h-4 rounded text-purple-600 border-neutral-300 focus:ring-purple-500"
            />
            <span>Mark Order as Completed automatically after sending</span>
          </label>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setShowCancelSection(!showCancelSection)}
            className="py-2.5 rounded-xl border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold transition-colors"
          >
            Cancel / Refund
          </button>

          <button
            type="button"
            onClick={handleSendDelivery}
            disabled={isSending || (items.length === 0 && !tempText.trim() && !tempPhotoUrl.trim() && !tempVideoUrl.trim())}
            className="py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-300 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Send className={`w-4 h-4 ${isSending ? 'animate-spin' : ''}`} />
            <span>{isSending ? 'Sending...' : 'Send Delivery'}</span>
          </button>
        </div>

        {/* Cancellation Section */}
        {showCancelSection && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-2.5 animate-in fade-in">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Cancel Order & Refund Customer</span>
            </div>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation"
              className="w-full bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 text-xs"
            />
            <label className="flex items-center gap-2 text-xs text-rose-900 font-semibold cursor-pointer">
              <input
                type="checkbox"
                checked={refundBalance}
                onChange={(e) => setRefundBalance(e.target.checked)}
                className="w-3.5 h-3.5 text-rose-600"
              />
              <span>Refund {currency}{order.totalAmount} to buyer wallet</span>
            </label>
            <button
              type="button"
              onClick={handleCancelOrder}
              disabled={isSending}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Confirm Cancellation
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
