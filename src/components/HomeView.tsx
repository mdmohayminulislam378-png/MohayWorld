import React from 'react';
import { User, Product, Order, SystemSettings, Language, ActiveTab, MessageAnnouncement } from '../types.ts';
import { getT } from '../translations.ts';
import {
  Wallet,
  ArrowUpRight,
  ShoppingBag,
  Gift,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  ChevronRight,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';
import { triggerHaptic } from '../telegram.ts';

interface HomeViewProps {
  user: User | null;
  products: Product[];
  orders: Order[];
  messages: MessageAnnouncement[];
  settings: SystemSettings | null;
  language: Language;
  onNavigate: (tab: ActiveTab) => void;
  onSelectProduct: (product: Product) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  user,
  products,
  orders,
  messages,
  settings,
  language,
  onNavigate,
  onSelectProduct,
}) => {
  const t = getT(language);
  const currency = settings?.currencySymbol || '৳';

  const activeAnnouncements = messages.filter((m) => m.active);
  const featuredProducts = products.slice(0, 4);
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-4 pb-4">
      {/* Announcements Banner if any */}
      {activeAnnouncements.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-blue-600 text-white rounded-lg shrink-0 mt-0.5">
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-blue-950">
                {language === 'bn' ? activeAnnouncements[0].titleBn : activeAnnouncements[0].titleEn}
              </h4>
              <p className="text-xs text-blue-800/90 mt-0.5 leading-relaxed">
                {language === 'bn' ? activeAnnouncements[0].contentBn : activeAnnouncements[0].contentEn}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Central Balance & Wallet Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-800 to-blue-950 rounded-2xl p-4 text-white shadow-md">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between text-neutral-300 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-blue-400" />
            <span>{t.walletBalance}</span>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t.statusOnline}
          </span>
        </div>

        {/* Balance Display */}
        <div className="mt-2.5 flex items-baseline gap-1">
          <span className="text-3xl font-extrabold tracking-tight text-white">
            {currency}
            {user ? user.balance.toLocaleString() : '0.00'}
          </span>
        </div>

        {/* User stats summary */}
        <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-neutral-700/60 text-xs">
          <div>
            <span className="text-neutral-400 text-[11px] block">{t.totalDeposited}</span>
            <span className="font-semibold text-neutral-200">
              {currency}
              {user ? user.totalDeposited.toLocaleString() : '0'}
            </span>
          </div>
          <div>
            <span className="text-neutral-400 text-[11px] block">{t.totalSpent}</span>
            <span className="font-semibold text-neutral-200">
              {currency}
              {user ? user.totalSpent.toLocaleString() : '0'}
            </span>
          </div>
        </div>

        {/* Quick actions inside wallet card */}
        <div className="mt-3.5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onNavigate('wallet');
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            {t.addMoney}
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onNavigate('buy');
            }}
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 font-semibold text-xs transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-blue-400" />
            {t.navBuy}
          </button>
        </div>
      </div>

      {/* Quick Action Category Grid */}
      <div className="grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onNavigate('buy');
          }}
          className="flex flex-col items-center justify-center p-2.5 bg-white border border-neutral-200 rounded-xl hover:border-blue-400 transition-colors shadow-2xs"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-neutral-800">{t.navBuy}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onNavigate('wallet');
          }}
          className="flex flex-col items-center justify-center p-2.5 bg-white border border-neutral-200 rounded-xl hover:border-blue-400 transition-colors shadow-2xs"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-neutral-800">{t.depositTitle.split(' ')[0]}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onNavigate('orders');
          }}
          className="flex flex-col items-center justify-center p-2.5 bg-white border border-neutral-200 rounded-xl hover:border-blue-400 transition-colors shadow-2xs"
        >
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-1">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-neutral-800">{t.navOrders}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onNavigate('referral');
          }}
          className="flex flex-col items-center justify-center p-2.5 bg-white border border-neutral-200 rounded-xl hover:border-blue-400 transition-colors shadow-2xs"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-1">
            <Gift className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-neutral-800">{t.navReferral}</span>
        </button>
      </div>

      {/* Featured Products Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-900 tracking-wide uppercase">
            {t.featuredProducts}
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('buy')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            {t.seeAll}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {featuredProducts.map((product) => {
            const isInstant = product.deliveryType === 'instant';
            const name = language === 'bn' ? product.nameBn : product.nameEn;
            const desc = language === 'bn' ? product.descriptionBn : product.descriptionEn;

            return (
              <div
                key={product.id}
                onClick={() => {
                  triggerHaptic('light');
                  onSelectProduct(product);
                }}
                className="bg-white border border-neutral-200 hover:border-blue-400 rounded-xl p-3 flex flex-col justify-between transition-all hover:shadow-sm cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
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
                    <span className="text-[10px] text-neutral-500">
                      {product.stock === -1 ? t.unlimited : `${product.stock} left`}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-neutral-900 line-clamp-2 leading-snug">
                    {name}
                  </h4>
                  <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">{desc}</p>
                </div>

                <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-blue-600">
                    {currency}
                    {product.price}
                  </span>
                  <button
                    type="button"
                    className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-[11px] font-semibold transition-colors"
                  >
                    {t.buyNow}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-900 tracking-wide uppercase">
            {t.recentOrders}
          </h3>
          {recentOrders.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
            >
              {t.seeAll}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <div className="bg-white border border-dashed border-neutral-200 rounded-xl p-4 text-center">
            <p className="text-xs text-neutral-500">{t.noOrdersYet}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentOrders.map((order) => {
              const productName = language === 'bn' ? order.productNameBn : order.productNameEn;
              const isDone = order.status === 'Completed';
              const isProc = order.status === 'Processing';

              return (
                <div
                  key={order.id}
                  onClick={() => {
                    triggerHaptic('light');
                    onNavigate('orders');
                  }}
                  className="bg-white border border-neutral-200 rounded-xl p-3 flex items-center justify-between hover:border-neutral-300 transition-colors cursor-pointer shadow-2xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-neutral-400 font-mono">#{order.id.slice(-6)}</span>
                      <span className="text-xs font-bold text-neutral-800 truncate">{productName}</span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      Qty: {order.quantity} • {currency}
                      {order.totalAmount}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      isDone
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isProc
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
              );
            })}
          </div>
        )}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="bg-neutral-100 rounded-xl p-3 flex items-center gap-3 border border-neutral-200/80">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <div className="text-[11px] text-neutral-600 leading-tight">
          <strong className="text-neutral-900 block font-semibold mb-0.5">
            {language === 'bn' ? 'নিরাপদ ও রিয়েল-টাইম ওয়ালেট' : 'Secure Unified Central Balance'}
          </strong>
          {language === 'bn'
            ? 'টেলিগ্রাম বট এবং মিনি অ্যাপের ব্যালেন্স স্বয়ংক্রিয়ভাবে রিয়েল-টাইমে সিঙ্ক থাকে।'
            : 'Same wallet balance synchronized in real-time across your Telegram bot and Mini App.'}
        </div>
      </div>
    </div>
  );
};
