import React, { useState } from 'react';
import { Product, Category, User, SystemSettings, Language, Order } from '../types.ts';
import { getT } from '../translations.ts';
import {
  Search,
  Zap,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  Plus,
  Minus,
  Sparkles,
  Copy,
} from 'lucide-react';
import { triggerHaptic } from '../telegram.ts';

interface BuyViewProps {
  products: Product[];
  categories: Category[];
  user: User | null;
  settings: SystemSettings | null;
  language: Language;
  selectedProduct: Product | null;
  onSelectProduct: (product: Product | null) => void;
  onOrderSuccess: (order: Order, newBalance: number) => void;
  onNavigateToDeposit: () => void;
}

export const BuyView: React.FC<BuyViewProps> = ({
  products,
  categories,
  user,
  settings,
  language,
  selectedProduct,
  onSelectProduct,
  onOrderSuccess,
  onNavigateToDeposit,
}) => {
  const t = getT(language);
  const currency = settings?.currencySymbol || '৳';

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [orderResult, setOrderResult] = useState<{ order: Order; newBalance: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [copiedDelivery, setCopiedDelivery] = useState<boolean>(false);

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (!p.active) return false;
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEn = p.nameEn.toLowerCase().includes(q) || p.descriptionEn.toLowerCase().includes(q);
      const matchBn = p.nameBn.toLowerCase().includes(q) || p.descriptionBn.toLowerCase().includes(q);
      return matchEn || matchBn;
    }
    return true;
  });

  const handleOpenProduct = (p: Product) => {
    triggerHaptic('light');
    onSelectProduct(p);
    setQuantity(1);
    setOrderResult(null);
    setErrorMessage('');
    setCopiedDelivery(false);
  };

  const handleConfirmPurchase = async () => {
    if (!selectedProduct || !user) return;
    const totalCost = selectedProduct.price * quantity;

    if (user.balance < totalCost) {
      triggerHaptic('error');
      setErrorMessage(t.insufficientBalance);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    triggerHaptic('medium');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user.telegramId,
          'X-Telegram-Init-Data': localStorage.getItem('tg_sim_user') || '',
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete order');
      }

      triggerHaptic('success');
      setOrderResult({ order: data.order, newBalance: data.newBalance });
      onOrderSuccess(data.order, data.newBalance);
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMessage(err.message || t.errorOccurred);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerHaptic('light');
    setCopiedDelivery(true);
    setTimeout(() => setCopiedDelivery(false), 2000);
  };

  return (
    <div className="space-y-3 pb-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-neutral-900">{t.catalogTitle}</h2>
        <p className="text-xs text-neutral-500">{t.catalogSubtitle}</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full bg-white border border-neutral-200 rounded-xl pl-9 pr-8 py-2 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setSelectedCategory('all');
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
          }`}
        >
          {t.allCategories}
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setSelectedCategory(cat.id);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {language === 'bn' ? cat.nameBn : cat.nameEn}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-8 text-center">
          <ShoppingBag className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-xs text-neutral-500">No products found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5">
          {filteredProducts.map((p) => {
            const isInstant = p.deliveryType === 'instant';
            const name = language === 'bn' ? p.nameBn : p.nameEn;
            const desc = language === 'bn' ? p.descriptionBn : p.descriptionEn;

            return (
              <div
                key={p.id}
                onClick={() => handleOpenProduct(p)}
                className="bg-white border border-neutral-200 hover:border-blue-400 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all hover:shadow-sm cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        isInstant
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {isInstant && <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />}
                      {isInstant ? t.instantDelivery : t.manualDelivery}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {p.stock === -1 ? t.unlimited : `${p.stock} in stock`}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 leading-snug">{name}</h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 mt-0.5">{desc}</p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-base font-extrabold text-blue-600">
                    {currency}
                    {p.price}
                  </div>
                  <button
                    type="button"
                    className="mt-1.5 px-3 py-1 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-2xs"
                  >
                    {t.buyNow}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PRODUCT PURCHASE MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 max-h-[90vh] overflow-y-auto space-y-4 animate-in fade-in slide-in-from-bottom duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                    selectedProduct.deliveryType === 'instant'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {selectedProduct.deliveryType === 'instant' ? t.instantDelivery : t.manualDelivery}
                </span>
                <h3 className="text-base font-bold text-neutral-900 mt-1">
                  {language === 'bn' ? selectedProduct.nameBn : selectedProduct.nameEn}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onSelectProduct(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-xl border border-neutral-200/70">
              {language === 'bn' ? selectedProduct.descriptionBn : selectedProduct.descriptionEn}
            </p>

            {/* If order is already completed */}
            {orderResult ? (
              <div className="space-y-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-1.5" />
                  <h4 className="text-sm font-bold text-emerald-950">{t.purchaseSuccess}</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Order ID: <span className="font-mono font-bold">#{orderResult.order.id}</span>
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    {t.currentBalance}: {currency}
                    {orderResult.newBalance}
                  </p>
                </div>

                {/* Instant Delivery Credentials if available */}
                {orderResult.order.deliveryData && (
                  <div className="bg-neutral-900 text-neutral-100 p-3.5 rounded-xl text-xs space-y-2">
                    <div className="flex items-center justify-between text-neutral-400 font-semibold text-[11px]">
                      <span>{t.deliveryCredentials}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCredentials(orderResult.order.deliveryData || '')}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        {copiedDelivery ? t.copied : t.copyDelivery}
                      </button>
                    </div>
                    <pre className="font-mono text-emerald-400 whitespace-pre-wrap break-all p-2 bg-neutral-800 rounded border border-neutral-700 text-[11px]">
                      {orderResult.order.deliveryData}
                    </pre>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onSelectProduct(null)}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-xs hover:bg-neutral-800 transition-colors"
                >
                  {t.close}
                </button>
              </div>
            ) : (
              /* Order Confirmation Form */
              <div className="space-y-4">
                {/* Quantity Selector */}
                <div className="flex items-center justify-between p-3 bg-white border border-neutral-200 rounded-xl">
                  <span className="text-xs font-semibold text-neutral-700">{t.quantity}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={quantity <= 1}
                      onClick={() => {
                        triggerHaptic('light');
                        setQuantity((q) => Math.max(1, q - 1));
                      }}
                      className="w-7 h-7 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 flex items-center justify-center disabled:opacity-40"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-neutral-900 min-w-4 text-center">{quantity}</span>
                    <button
                      type="button"
                      disabled={selectedProduct.stock !== -1 && quantity >= selectedProduct.stock}
                      onClick={() => {
                        triggerHaptic('light');
                        setQuantity((q) => q + 1);
                      }}
                      className="w-7 h-7 rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-700 flex items-center justify-center disabled:opacity-40"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-500">
                    <span>{t.unitPrice}</span>
                    <span>
                      {currency}
                      {selectedProduct.price}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>{t.quantity}</span>
                    <span>{quantity}</span>
                  </div>
                  <div className="flex justify-between text-neutral-900 font-bold text-sm pt-1.5 border-t border-neutral-200">
                    <span>{t.totalPrice}</span>
                    <span className="text-blue-600">
                      {currency}
                      {selectedProduct.price * quantity}
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-500 pt-1 text-[11px]">
                    <span>{t.currentBalance}</span>
                    <span className={user && user.balance < selectedProduct.price * quantity ? 'text-rose-600 font-bold' : 'text-neutral-700 font-medium'}>
                      {currency}
                      {user ? user.balance : 0}
                    </span>
                  </div>
                </div>

                {/* Balance Check Warning or Error */}
                {user && user.balance < selectedProduct.price * quantity ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-start gap-2 text-rose-800">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <div>
                        <strong className="block font-semibold">{t.insufficientBalance}</strong>
                        <span>
                          Required: {currency}
                          {selectedProduct.price * quantity} • Shortfall: {currency}
                          {selectedProduct.price * quantity - user.balance}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectProduct(null);
                        onNavigateToDeposit();
                      }}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      {t.addMoney}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : null}

                {errorMessage && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onSelectProduct(null)}
                    className="py-2.5 rounded-xl border border-neutral-200 text-neutral-700 font-semibold text-xs hover:bg-neutral-50 transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || (user ? user.balance < selectedProduct.price * quantity : true)}
                    onClick={handleConfirmPurchase}
                    className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    {isSubmitting ? t.loading : t.confirmPurchase}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
