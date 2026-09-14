import React from 'react';
import { ActiveTab, Language } from '../types.ts';
import { getT } from '../translations.ts';
import { Home, ShoppingBag, Wallet, PackageCheck, Gift, User as UserIcon } from 'lucide-react';
import { triggerHaptic } from '../telegram.ts';

interface BottomNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  language: Language;
  pendingOrdersCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  language,
  pendingOrdersCount = 0,
}) => {
  const t = getT(language);

  const tabs = [
    { id: 'home' as ActiveTab, label: t.navHome, icon: Home },
    { id: 'buy' as ActiveTab, label: t.navBuy, icon: ShoppingBag },
    { id: 'wallet' as ActiveTab, label: t.navWallet, icon: Wallet },
    {
      id: 'orders' as ActiveTab,
      label: t.navOrders,
      icon: PackageCheck,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    { id: 'referral' as ActiveTab, label: t.navReferral, icon: Gift },
    { id: 'profile' as ActiveTab, label: t.navProfile, icon: UserIcon },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-neutral-200 safe-area-pb">
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onTabChange(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-2 min-w-[52px] rounded-xl transition-all ${
                isActive ? 'text-blue-600 font-bold' : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-4 text-center leading-tight">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
