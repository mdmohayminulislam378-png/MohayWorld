import React, { useState } from 'react';
import { Order, SystemSettings, Language } from '../types.ts';
import { getT } from '../translations.ts';
import {
  PackageCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  ExternalLink,
  X,
  FileText,
  AlertTriangle,
  Image as ImageIcon,
  Video as VideoIcon,
} from 'lucide-react';
import { triggerHaptic } from '../telegram.ts';

interface OrdersViewProps {
  orders: Order[];
  settings: SystemSettings | null;
  language: Language;
}

export const OrdersView: React.FC<OrdersViewProps> = ({ orders, settings, language }) => {
  const t = getT(language);
  const currency = settings?.currencySymbol || '৳';

  const [statusFilter, setStatusFilter] = useState<'all' | 'Processing' | 'Completed' | 'Cancelled'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedDelivery, setCopiedDelivery] = useState<boolean>(false);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerHaptic('light');
    setCopiedDelivery(true);
    setTimeout(() => setCopiedDelivery(false), 2000);
  };

  return (
    <div className="space-y-3 pb-8">
      <div>
        <h2 className="text-base font-bold text-neutral-900">{t.ordersTitle}</h2>
        <p className="text-xs text-neutral-500">{t.ordersSubtitle}</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-semibold overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setStatusFilter('all');
          }}
          className={`flex-1 py-1 px-2.5 rounded-lg whitespace-nowrap transition-all ${
            statusFilter === 'all'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {t.allOrders} ({orders.length})
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setStatusFilter('Processing');
          }}
          className={`flex-1 py-1 px-2.5 rounded-lg whitespace-nowrap transition-all ${
            statusFilter === 'Processing'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {t.statusProcessing}
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setStatusFilter('Completed');
          }}
          className={`flex-1 py-1 px-2.5 rounded-lg whitespace-nowrap transition-all ${
            statusFilter === 'Completed'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {t.statusCompleted}
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setStatusFilter('Cancelled');
          }}
          className={`flex-1 py-1 px-2.5 rounded-lg whitespace-nowrap transition-all ${
            statusFilter === 'Cancelled'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {t.statusCancelled}
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-8 text-center">
          <PackageCheck className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-xs text-neutral-500">{t.noOrdersYet}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredOrders.map((order) => {
            const productName = language === 'bn' ? order.productNameBn : order.productNameEn;
            const isCompleted = order.status === 'Completed';
            const isProcessing = order.status === 'Processing';

            return (
              <div
                key={order.id}
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedOrder(order);
                  setCopiedDelivery(false);
                }}
                className="bg-white border border-neutral-200 hover:border-blue-400 rounded-xl p-3.5 space-y-2 transition-all hover:shadow-sm cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-neutral-400">#{order.id.slice(-6)}</span>
                      <h4 className="text-xs font-bold text-neutral-900 truncate">{productName}</h4>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {t.quantity}: {order.quantity} × {currency}
                      {order.unitPrice}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isProcessing
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {order.status === 'Completed'
                      ? t.statusCompleted
                      : order.status === 'Processing'
                      ? t.statusProcessing
                      : t.statusCancelled}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-2 border-t border-neutral-100">
                  <span>{new Date(order.createdAt).toLocaleString()}</span>
                  <div className="text-xs font-extrabold text-blue-600">
                    {currency}
                    {order.totalAmount}
                  </div>
                </div>

                {order.deliveryData && (
                  <div className="bg-emerald-50 text-emerald-800 text-[11px] font-mono p-1.5 rounded border border-emerald-200 truncate">
                    ✓ Delivered: {order.deliveryData}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 max-h-[90vh] overflow-y-auto space-y-4 animate-in fade-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-neutral-400">Order Details</span>
                <h3 className="text-base font-bold text-neutral-900 mt-0.5">
                  #{selectedOrder.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Card */}
            <div
              className={`p-3 rounded-xl border flex items-center justify-between ${
                selectedOrder.status === 'Completed'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : selectedOrder.status === 'Processing'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {selectedOrder.status === 'Completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : selectedOrder.status === 'Processing' ? (
                  <Clock className="w-5 h-5 text-blue-600 animate-spin-slow" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <div>
                  <span className="text-xs font-bold block">
                    {selectedOrder.status === 'Completed'
                      ? t.statusCompleted
                      : selectedOrder.status === 'Processing'
                      ? t.statusProcessing
                      : t.statusCancelled}
                  </span>
                  <span className="text-[10px] opacity-80">
                    {selectedOrder.status === 'Processing'
                      ? t.deliveringNotice
                      : selectedOrder.status === 'Completed'
                      ? 'Delivered to your account'
                      : selectedOrder.cancelReason || 'Order cancelled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Product & Pricing Table */}
            <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Product</span>
                <span className="font-bold text-neutral-900">
                  {language === 'bn' ? selectedOrder.productNameBn : selectedOrder.productNameEn}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>{t.quantity}</span>
                <span className="font-semibold text-neutral-800">{selectedOrder.quantity}</span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>{t.unitPrice}</span>
                <span className="font-semibold text-neutral-800">
                  {currency}
                  {selectedOrder.unitPrice}
                </span>
              </div>
              <div className="flex justify-between text-neutral-900 font-bold text-sm pt-2 border-t border-neutral-200">
                <span>{t.totalPrice}</span>
                <span className="text-blue-600">
                  {currency}
                  {selectedOrder.totalAmount}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400 text-[10px] pt-1">
                <span>{t.orderDate}</span>
                <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Delivery Data (Credentials / Codes / Photos / Videos) */}
            {selectedOrder.deliveredItems && selectedOrder.deliveredItems.length > 0 ? (
              <div className="bg-neutral-900 text-neutral-100 p-3.5 rounded-xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-neutral-400 text-[11px] font-semibold border-b border-neutral-800 pb-1.5">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t.deliveredContent}</span>
                  </span>
                  {selectedOrder.deliveryData && (
                    <button
                      type="button"
                      onClick={() => handleCopy(selectedOrder.deliveryData || '')}
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedDelivery ? t.copied : t.copyDelivery}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedOrder.deliveredItems.map((item, idx) => (
                    <div key={item.id || idx} className="space-y-1">
                      {item.type === 'text' && (
                        <div className="bg-neutral-800 rounded-lg p-2.5 border border-neutral-700">
                          <pre className="font-mono text-emerald-400 whitespace-pre-wrap break-all text-xs select-all">
                            {item.content}
                          </pre>
                        </div>
                      )}
                      {item.type === 'photo' && (
                        <div className="space-y-1">
                          <div className="rounded-lg overflow-hidden border border-neutral-700 max-h-48 bg-black flex items-center justify-center">
                            <img
                              src={item.content}
                              alt="Delivered Media"
                              className="max-h-48 object-contain w-full"
                              onError={(e) => ((e.target as any).style.display = 'none')}
                            />
                          </div>
                          {item.caption && (
                            <p className="text-[11px] text-neutral-300 italic">{item.caption}</p>
                          )}
                          <a
                            href={item.content}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open Full Image
                          </a>
                        </div>
                      )}
                      {item.type === 'video' && (
                        <div className="space-y-1">
                          <div className="rounded-lg overflow-hidden border border-neutral-700 max-h-48 bg-black">
                            <video
                              src={item.content}
                              controls
                              className="max-h-48 w-full object-contain"
                            />
                          </div>
                          {item.caption && (
                            <p className="text-[11px] text-neutral-300 italic">{item.caption}</p>
                          )}
                          <a
                            href={item.content}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Open Direct Video Link
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : selectedOrder.deliveryData ? (
              <div className="bg-neutral-900 text-neutral-100 p-3.5 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-400 text-[11px] font-semibold">
                  <span>{t.deliveredContent}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedOrder.deliveryData || '')}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedDelivery ? t.copied : t.copyDelivery}
                  </button>
                </div>
                <pre className="font-mono text-emerald-400 whitespace-pre-wrap break-all p-2.5 bg-neutral-800 rounded border border-neutral-700 text-xs select-all">
                  {selectedOrder.deliveryData}
                </pre>
              </div>
            ) : selectedOrder.status === 'Processing' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800 flex items-start gap-2">
                <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold mb-0.5">Order in Processing</strong>
                  Your order is received and will be delivered directly to your Telegram chat. Any digital credentials will also appear right here once dispatched.
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => setSelectedOrder(null)}
              className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
