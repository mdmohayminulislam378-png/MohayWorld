import React from 'react';
import { User, Language, SystemSettings, ActiveTab } from '../types.ts';
import { getT } from '../translations.ts';
import { Wallet, Shield, Globe, Users, Sparkles } from 'lucide-react';
import { triggerHaptic } from '../telegram.ts';

interface NavbarProps {
  user: User | null;
  settings: SystemSettings | null;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenSimulator: () => void;
  isSimulated?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  settings,
  language,
  onLanguageChange,
  activeTab,
  onTabChange,
  onOpenSimulator,
  isSimulated = false,
}) => {
  const t = getT(language);
  const currency = settings?.currencySymbol || '৳';
  const isAuthorizedAdmin = user?.role === 'admin' || user?.telegramId === '613669930';

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-200">
      <div className="max-w-md mx-auto px-3 py-2.5 flex items-center justify-between gap-2">
        {/* Brand / Title */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
            TG
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-bold text-neutral-900 leading-tight">
                {language === 'bn' ? 'টেলিগ্রাম স্টোর' : 'Telegram Store'}
              </h1>
              {isSimulated && (
                <button
                  type="button"
                  onClick={onOpenSimulator}
                  className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-800 rounded border border-amber-300 hover:bg-amber-200 transition-colors"
                  title="Click to switch simulated Telegram user"
                >
                  Sim Test
                </button>
              )}
            </div>
            <p className="text-[11px] text-neutral-500 font-medium">
              {user?.username ? `@${user.username}` : user ? `ID: ${user.telegramId}` : t.loading}
            </p>
          </div>
        </div>

        {/* Right action controls */}
        <div className="flex items-center gap-1.5">
          {/* Central Balance Pill */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onTabChange('wallet');
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
              activeTab === 'wallet'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>
              {currency}
              {user ? user.balance.toLocaleString() : '0'}
            </span>
          </button>

          {/* Language Switcher */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onLanguageChange('en');
              }}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                language === 'en' ? 'bg-white text-neutral-900 shadow-xs font-bold' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onLanguageChange('bn');
              }}
              className={`px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                language === 'bn' ? 'bg-white text-neutral-900 shadow-xs font-bold' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              বাং
            </button>
          </div>

          {/* Admin Switcher Button - Visible ONLY to Authorized Admin */}
          {isAuthorizedAdmin && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                onTabChange(activeTab === 'admin' ? 'home' : 'admin');
              }}
              className={`p-1.5 rounded-lg text-xs font-medium border transition-colors ${
                activeTab === 'admin'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-xs'
                  : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
              }`}
              title={activeTab === 'admin' ? t.userMode : t.openAdmin}
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
