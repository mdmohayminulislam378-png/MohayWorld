/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Product,
  Category,
  Order,
  Deposit,
  Transaction,
  PaymentMethod,
  SystemSettings,
  Language,
  ActiveTab,
  MessageAnnouncement,
} from './types.ts';
import { getTelegramUser, initTelegramWebApp } from './telegram.ts';
import { Navbar } from './components/Navbar.tsx';
import { BottomNav } from './components/BottomNav.tsx';
import { HomeView } from './components/HomeView.tsx';
import { BuyView } from './components/BuyView.tsx';
import { WalletView } from './components/WalletView.tsx';
import { OrdersView } from './components/OrdersView.tsx';
import { ReferralView } from './components/ReferralView.tsx';
import { ProfileView } from './components/ProfileView.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { UserSimulatorModal } from './components/UserSimulatorModal.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'en';
  });

  // Data states
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [messages, setMessages] = useState<MessageAnnouncement[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // UI helpers
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize Telegram & load user
  const initUser = useCallback(async (simulatedUser?: Partial<User>) => {
    try {
      initTelegramWebApp();
      const tgUser = simulatedUser || getTelegramUser();

      // Register or fetch user
      const initData = localStorage.getItem('tg_sim_user') || '';
      const res = await fetch('/api/user/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Init-Data': initData,
          'X-Telegram-Id': tgUser.telegramId || '613669930',
        },
        body: JSON.stringify({
          telegramId: tgUser.telegramId || '613669930',
          username: tgUser.username || 'user',
          firstName: tgUser.firstName || 'Telegram',
          lastName: tgUser.lastName || 'User',
          languageCode: language,
        }),
      });

      if (!res.ok) {
        console.warn('User sync returned non-OK status:', res.status);
        return;
      }

      const data = await res.json().catch(() => null);
      if (data && data.success && data.user) {
        setUser(data.user);
        if (data.user.language && ['en', 'bn'].includes(data.user.language)) {
          setLanguage(data.user.language as Language);
        }
      }
    } catch (err) {
      console.error('Failed to sync user:', err);
    }
  }, [language]);

  // Load app data
  const loadAppData = useCallback(async () => {
    try {
      const [prodRes, payRes, setRes, msgRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/payment-methods'),
        fetch('/api/settings'),
        fetch('/api/messages'),
      ]);

      const [prodData, payData, setData, msgData] = await Promise.all<any>([
        prodRes.ok ? prodRes.json().catch(() => ({})) : Promise.resolve({}),
        payRes.ok ? payRes.json().catch(() => ({})) : Promise.resolve({}),
        setRes.ok ? setRes.json().catch(() => ({})) : Promise.resolve({}),
        msgRes.ok ? msgRes.json().catch(() => ({})) : Promise.resolve({}),
      ]);

      if (prodData.success) {
        setProducts(prodData.products || []);
        setCategories(prodData.categories || []);
      }
      if (payData.success) {
        setPaymentMethods(payData.methods || []);
      }
      if (setData.success) {
        setSettings(setData.settings || null);
      }
      if (msgData.success) {
        setMessages(msgData.messages || []);
      }
    } catch (err) {
      console.error('Error fetching global app data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load user specific orders, deposits & transactions
  const loadUserData = useCallback(async (telegramId: string) => {
    try {
      const headers = {
        'X-Telegram-Id': telegramId,
        'X-Telegram-Init-Data': localStorage.getItem('tg_sim_user') || '',
      };

      const [orderRes, depRes, txRes, userRes] = await Promise.all([
        fetch('/api/orders', { headers }),
        fetch('/api/deposits', { headers }),
        fetch('/api/transactions', { headers }),
        fetch('/api/user/me', { headers }),
      ]);

      const [orderData, depData, txData, userData] = await Promise.all<any>([
        orderRes.ok ? orderRes.json().catch(() => ({})) : Promise.resolve({}),
        depRes.ok ? depRes.json().catch(() => ({})) : Promise.resolve({}),
        txRes.ok ? txRes.json().catch(() => ({})) : Promise.resolve({}),
        userRes.ok ? userRes.json().catch(() => ({})) : Promise.resolve({}),
      ]);

      if (orderData.success) setOrders(orderData.orders || []);
      if (depData.success) setDeposits(depData.deposits || []);
      if (txData.success) setTransactions(txData.transactions || []);
      if (userData.success && userData.user) setUser(userData.user);
    } catch (err) {
      console.error('Error fetching user private data:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    initUser();
    loadAppData();
  }, [initUser, loadAppData]);

  // When user is set, fetch their specific data
  useEffect(() => {
    if (user?.telegramId) {
      loadUserData(user.telegramId);
    }
  }, [user?.telegramId, loadUserData]);

  // Real-time EventSource listener
  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        // Balance updated event
        if (payload.type === 'BALANCE_UPDATED' && user && payload.telegramId === user.telegramId) {
          setUser((prev) => (prev ? { ...prev, balance: payload.balance } : null));
          loadUserData(user.telegramId);
        }

        // Deposit approved event
        if (payload.type === 'DEPOSIT_APPROVED' && user && payload.telegramId === user.telegramId) {
          setUser((prev) => (prev ? { ...prev, balance: payload.balance } : null));
          loadUserData(user.telegramId);
        }

        // Order updated event
        if (payload.type === 'ORDER_UPDATED' && user) {
          loadUserData(user.telegramId);
        }

        // Products or settings updated
        if (payload.type === 'PRODUCTS_UPDATED' || payload.type === 'SETTINGS_UPDATED') {
          loadAppData();
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    eventSource.onerror = () => {
      // EventSource auto-reconnects
    };

    return () => {
      eventSource.close();
    };
  }, [user, loadUserData, loadAppData]);

  const handleLanguageToggle = async (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('app_lang', newLang);

    if (user) {
      try {
        await fetch('/api/user/language', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Telegram-Id': user.telegramId,
          },
          body: JSON.stringify({ language: newLang }),
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSelectSimulatedUser = async (u: Partial<User>) => {
    if (u.telegramId) {
      localStorage.setItem('tg_sim_user', JSON.stringify(u));
      await initUser(u);
    }
  };

  const handleOrderSuccess = (order: Order, newBalance: number) => {
    setUser((prev) => (prev ? { ...prev, balance: newBalance } : null));
    setOrders((prev) => [order, ...prev]);
    if (user?.telegramId) {
      loadUserData(user.telegramId);
    }
  };

  const handleDepositSubmitted = (deposit: Deposit) => {
    setDeposits((prev) => [deposit, ...prev]);
    if (user?.telegramId) {
      loadUserData(user.telegramId);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100/90 text-neutral-900 flex justify-center selection:bg-blue-500 selection:text-white antialiased">
      {/* Container constrained to mobile phone/Mini App width */}
      <div className="w-full max-w-md bg-neutral-50/50 min-h-screen flex flex-col shadow-xl relative border-x border-neutral-200/80 pb-20">
        {/* Top Navigation */}
        <Navbar
          user={user}
          language={language}
          activeTab={activeTab}
          settings={settings}
          onLanguageToggle={() => handleLanguageToggle(language === 'en' ? 'bn' : 'en')}
          onOpenAdmin={() => setActiveTab('admin')}
          onOpenSimulator={() => setIsSimulatorOpen(true)}
        />

        {/* Main Content Area */}
        <main className="flex-1 px-4 pt-3 overflow-y-auto">
          {activeTab === 'home' && (
            <HomeView
              user={user}
              products={products}
              orders={orders}
              messages={messages}
              settings={settings}
              language={language}
              onNavigate={(tab) => setActiveTab(tab)}
              onSelectProduct={(product) => {
                setSelectedProductForModal(product);
                setActiveTab('buy');
              }}
            />
          )}

          {activeTab === 'buy' && (
            <BuyView
              products={products}
              categories={categories}
              user={user}
              settings={settings}
              language={language}
              selectedProduct={selectedProductForModal}
              onSelectProduct={(p) => setSelectedProductForModal(p)}
              onOrderSuccess={handleOrderSuccess}
              onNavigateToDeposit={() => setActiveTab('wallet')}
            />
          )}

          {activeTab === 'wallet' && (
            <WalletView
              user={user}
              deposits={deposits}
              transactions={transactions}
              paymentMethods={paymentMethods}
              settings={settings}
              language={language}
              onDepositSubmitted={handleDepositSubmitted}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersView orders={orders} settings={settings} language={language} />
          )}

          {activeTab === 'referral' && (
            <ReferralView user={user} settings={settings} language={language} />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              user={user}
              settings={settings}
              language={language}
              onLanguageChange={handleLanguageToggle}
              onOpenSimulator={() => setIsSimulatorOpen(true)}
            />
          )}

          {activeTab === 'admin' && (
            <AdminPanel
              currentUser={user}
              settings={settings}
              language={language}
              onRefreshData={() => {
                loadAppData();
                if (user?.telegramId) loadUserData(user.telegramId);
              }}
              onExitAdmin={() => setActiveTab('home')}
            />
          )}
        </main>

        {/* Persistent Bottom Tab Bar */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          language={language}
          isAdmin={user?.role === 'admin'}
        />

        {/* User Switcher Simulator Modal */}
        <UserSimulatorModal
          currentUser={user}
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          onSelectUser={handleSelectSimulatedUser}
        />
      </div>
    </div>
  );
}
