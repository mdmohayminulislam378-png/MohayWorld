import React from 'react';
import { User, SystemSettings, Language } from '../types.ts';
import { getT } from '../translations.ts';
import {
  User as UserIcon,
  ShieldCheck,
  Globe,
  Headphones,
  Send,
  ExternalLink,
  Cpu,
  RefreshCw,
  Award,
} from 'lucide-react';
import { triggerHaptic } from '../telegram.ts';

interface ProfileViewProps {
  user: User | null;
  settings: SystemSettings | null;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenSimulator: () => void;
  onNavigateToAdmin?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  settings,
  language,
  onLanguageChange,
  onOpenSimulator,
  onNavigateToAdmin,
}) => {
  const t = getT(language);
  const currency = settings?.currencySymbol || '৳';
  const isAuthorizedAdmin = user?.role === 'admin' || user?.telegramId === '613669930';

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h2 className="text-base font-bold text-neutral-900">{t.profileTitle}</h2>
      </div>

      {/* User Info Header Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-xs">
          {user?.firstName ? user.firstName.charAt(0).toUpperCase() : 'U'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-neutral-900 truncate">
              {user ? `${user.firstName} ${user.lastName || ''}`.trim() : t.loading}
            </h3>
            {user?.role === 'admin' && (
              <span className="px-1.5 py-0.2 text-[9px] font-bold bg-purple-100 text-purple-800 rounded border border-purple-200">
                Admin
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 font-mono mt-0.5">
            {user?.username ? `@${user.username}` : `ID: ${user?.telegramId}`}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium mt-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Telegram Account</span>
          </div>
        </div>
      </div>

      {/* Financial Overview Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
        <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
          Financial Summary
        </h4>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
            <span className="text-neutral-500 text-[11px] block">{t.walletBalance}</span>
            <span className="text-base font-extrabold text-blue-600 mt-0.5 block">
              {currency}
              {user ? user.balance.toLocaleString() : '0.00'}
            </span>
          </div>
          <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
            <span className="text-neutral-500 text-[11px] block">{t.totalDeposited}</span>
            <span className="text-base font-extrabold text-neutral-900 mt-0.5 block">
              {currency}
              {user ? user.totalDeposited.toLocaleString() : '0'}
            </span>
          </div>
          <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
            <span className="text-neutral-500 text-[11px] block">{t.totalSpent}</span>
            <span className="text-base font-extrabold text-neutral-900 mt-0.5 block">
              {currency}
              {user ? user.totalSpent.toLocaleString() : '0'}
            </span>
          </div>
          <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80">
            <span className="text-neutral-500 text-[11px] block">{t.totalEarned}</span>
            <span className="text-base font-extrabold text-amber-600 mt-0.5 block">
              {currency}
              {user ? user.totalCommissionEarned.toLocaleString() : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* Language Switcher Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2 shadow-2xs">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-neutral-600" />
          <h4 className="text-xs font-bold text-neutral-900">{t.languageSelection}</h4>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onLanguageChange('en');
            }}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              language === 'en'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onLanguageChange('bn');
            }}
            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              language === 'bn'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            বাংলা (Bangla)
          </button>
        </div>
      </div>

      {/* Admin Panel Button - Visible ONLY to the authorized Admin */}
      {isAuthorizedAdmin && onNavigateToAdmin && (
        <div className="bg-purple-50/90 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-neutral-900">Admin Panel</span>
                <span className="px-1.5 py-0.5 text-[9px] font-bold bg-purple-200 text-purple-900 rounded">
                  Authorized Admin
                </span>
              </div>
              <p className="text-[11px] text-neutral-500 font-mono">Route: /admin • ID: {user?.telegramId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onNavigateToAdmin();
            }}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Open Console
          </button>
        </div>
      )}

      {/* Support & Channels */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
        <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
          {t.supportAndHelp}
        </h4>

        <div className="space-y-2">
          {settings?.supportUsername && (
            <a
              href={`https://t.me/${settings.supportUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-xs text-neutral-800 font-semibold transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Headphones className="w-4 h-4 text-blue-600" />
                <span>{t.contactSupport}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            </a>
          )}

          {settings?.supportChannel && (
            <a
              href={`https://${settings.supportChannel.replace(/^https?:\/\//, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-xs text-neutral-800 font-semibold transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Send className="w-4 h-4 text-blue-500" />
                <span>{t.joinChannel}</span>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            </a>
          )}
        </div>
      </div>

      {/* System Status & Switch Simulated User for Testing */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
        <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
          {t.appInfo}
        </h4>

        <div className="space-y-1.5 text-xs text-neutral-600">
          <div className="flex justify-between py-1 border-b border-neutral-100">
            <span>{t.connectedBot}</span>
            <span className="font-mono font-bold text-neutral-900">@{settings?.botUsername}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-neutral-100">
            <span>{t.backendStatus}</span>
            <span className="text-emerald-600 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {t.statusOnline}
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span>Telegram User ID</span>
            <span className="font-mono font-bold text-neutral-900">{user?.telegramId}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenSimulator();
          }}
          className="w-full mt-2 py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-neutral-600" />
          {t.switchSimUser}
        </button>
      </div>
    </div>
  );
};
