import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Product,
  Category,
  Order,
  Deposit,
  PaymentMethod,
  SystemSettings,
  Language,
} from '../types.ts';
import {
  Shield,
  Users,
  ShoppingBag,
  PackageCheck,
  Wallet,
  Settings,
  CreditCard,
  Gift,
  Megaphone,
  Database,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Copy,
  Upload,
  Download,
  Key,
  Folder,
  Tag,
  BarChart3,
  FileText,
  DollarSign,
  Package,
  Send,
} from 'lucide-react';
import { triggerHaptic } from '../telegram.ts';
import { AccessDeniedView } from './AccessDeniedView.tsx';
import { AdminCategories } from './admin/AdminCategories.tsx';
import { AdminPrices } from './admin/AdminPrices.tsx';
import { AdminBalance } from './admin/AdminBalance.tsx';
import { AdminStatistics } from './admin/AdminStatistics.tsx';
import { AdminAuditLogs } from './admin/AdminAuditLogs.tsx';
import { AdminDeliveryInventory } from './admin/AdminDeliveryInventory.tsx';
import { AdminManualDeliveryModal } from './admin/AdminManualDeliveryModal.tsx';

interface AdminPanelProps {
  currentUser: User | null;
  settings: SystemSettings | null;
  language: Language;
  onRefreshData: () => void;
  onExitAdmin: () => void;
  onOpenSimulator?: () => void;
}

type AdminSection =
  | 'dashboard'
  | 'users'
  | 'products'
  | 'categories'
  | 'orders'
  | 'delivery_inventory'
  | 'deposits'
  | 'balance'
  | 'referrals'
  | 'payments'
  | 'prices'
  | 'messages'
  | 'settings'
  | 'statistics'
  | 'audit_logs'
  | 'bot_sync';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  settings,
  language,
  onRefreshData,
  onExitAdmin,
  onOpenSimulator,
}) => {
  const currency = settings?.currencySymbol || '৳';
  const [adminToken, setAdminToken] = useState<string>(
    () => sessionStorage.getItem('admin_token') || ''
  );
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [activeSection, setActiveSection] = useState<AdminSection>('dashboard');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [referralsData, setReferralsData] = useState<any>({ referrals: [], commissions: [] });
  const [messages, setMessages] = useState<any[]>([]);
  const [searchUser, setSearchUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Modals state
  const [balanceModalUser, setBalanceModalUser] = useState<User | null>(null);
  const [balanceAmount, setBalanceAmount] = useState<string>('');
  const [balanceReason, setBalanceReason] = useState<string>('');

  // Order status modal
  const [orderModal, setOrderModal] = useState<Order | null>(null);
  const [deliveryOrderModal, setDeliveryOrderModal] = useState<Order | null>(null);
  const [orderNewStatus, setOrderNewStatus] = useState<'Completed' | 'Cancelled'>('Completed');
  const [orderDeliveryData, setOrderDeliveryData] = useState<string>('');
  const [orderRefundCheck, setOrderRefundCheck] = useState<boolean>(true);

  // Product modal
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [autoDeliveryKeysText, setAutoDeliveryKeysText] = useState<string>('');

  // Payment Method modal
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<Partial<PaymentMethod> | null>(null);

  // Bot Migration
  const [migrationJson, setMigrationJson] = useState<string>('');
  const [migrationStatus, setMigrationStatus] = useState<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const getHeaders = useCallback(
    (tokenOverride?: string) => {
      const token = tokenOverride || adminToken || sessionStorage.getItem('admin_token') || '';
      return {
        'Content-Type': 'application/json',
        'X-Telegram-Id': currentUser?.telegramId || '',
        'X-Admin-Token': token,
      };
    },
    [adminToken, currentUser?.telegramId]
  );

  const fetchAdminData = useCallback(
    async (tokenToUse?: string) => {
      const headers = getHeaders(tokenToUse);
      setLoading(true);
      try {
        const statsRes = await fetch('/api/admin/stats', { headers });

        if (statsRes.status === 403 || statsRes.status === 401) {
          setIsAuthenticated(false);
          setAuthError('Access Denied: Telegram User ID is not authorized as Admin');
          sessionStorage.removeItem('admin_token');
          return;
        }

        if (!statsRes.ok) {
          const errJson = await statsRes.json().catch(() => ({}));
          setIsAuthenticated(false);
          setAuthError(errJson.error || 'Server error verifying Admin authorization');
          return;
        }

        const sData = await statsRes.json();
        if (sData.success) {
          setStats(sData.stats);
          setIsAuthenticated(true);
          setAuthError('');
        }

        const [
          usersRes,
          productsRes,
          ordersRes,
          depositsRes,
          paymentsRes,
          categoriesRes,
          referralsRes,
          messagesRes,
        ] = await Promise.all([
          fetch('/api/admin/users', { headers }),
          fetch('/api/admin/products', { headers }),
          fetch('/api/admin/orders', { headers }),
          fetch('/api/admin/deposits', { headers }),
          fetch('/api/admin/payment-methods', { headers }),
          fetch('/api/admin/categories', { headers }),
          fetch('/api/admin/referrals', { headers }),
          fetch('/api/admin/messages', { headers }),
        ]);

        const [uData, pData, oData, dData, payData, cData, rData, mData] = await Promise.all([
          usersRes.json().catch(() => ({})),
          productsRes.json().catch(() => ({})),
          ordersRes.json().catch(() => ({})),
          depositsRes.json().catch(() => ({})),
          paymentsRes.json().catch(() => ({})),
          categoriesRes.json().catch(() => ({})),
          referralsRes.json().catch(() => ({})),
          messagesRes.json().catch(() => ({})),
        ]);

        if (uData.success) setUsers(uData.users);
        if (pData.success) setProducts(pData.products);
        if (oData.success) setOrders(oData.orders);
        if (dData.success) setDeposits(dData.deposits);
        if (payData.success) setPaymentMethods(payData.methods);
        if (cData.success) setCategories(cData.categories);
        if (rData.success) setReferralsData(rData);
        if (mData.success) setMessages(mData.messages);
      } catch (err) {
        console.error('Error fetching admin data:', err);
        setAuthError('Failed to connect to server. Please check your network.');
      } finally {
        setLoading(false);
        setAuthLoading(false);
      }
    },
    [getHeaders]
  );

  const verifyAdminAccess = useCallback(async () => {
    if (!currentUser?.telegramId) {
      setIsAuthenticated(false);
      setAuthLoading(false);
      setAuthError('No active Telegram account detected');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': currentUser.telegramId,
        },
        body: JSON.stringify({ telegramId: currentUser.telegramId }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.authorized) {
        setIsAuthenticated(true);
        setAdminToken(data.adminToken);
        sessionStorage.setItem('admin_token', data.adminToken);
        setAuthError('');
        await fetchAdminData(data.adminToken);
      } else {
        setIsAuthenticated(false);
        setAuthError(data.error || 'Access Denied: Telegram User ID is not authorized as Admin');
      }
    } catch (err) {
      setIsAuthenticated(false);
      setAuthError('Connection error during admin authorization check');
    } finally {
      setAuthLoading(false);
    }
  }, [currentUser?.telegramId, fetchAdminData]);

  useEffect(() => {
    verifyAdminAccess();
  }, [verifyAdminAccess]);

  const handleSaveCategory = async (cat: Partial<Category> & { nameEn: string }) => {
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(cat),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save category');
    }
    await fetchAdminData();
    onRefreshData();
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to delete category');
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
    onRefreshData();
  };

  const handleBatchPrices = async (updates: { id: string; price: number; originalPrice?: number }[]) => {
    const res = await fetch('/api/admin/products/batch-prices', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ updates }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to batch update prices');
    }
    await fetchAdminData();
    onRefreshData();
  };

  const handleDirectBalanceAdjustment = async (params: {
    telegramId: string;
    amount: number;
    reason: string;
  }) => {
    const res = await fetch(`/api/admin/users/${params.telegramId}/balance`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ amount: params.amount, reason: params.reason }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to adjust balance');
    }
    await fetchAdminData();
    onRefreshData();
  };

  // Balance Adjustment
  const handleAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceModalUser) return;

    try {
      const res = await fetch(`/api/admin/users/${balanceModalUser.telegramId}/balance`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          amount: Number(balanceAmount),
          reason: balanceReason.trim(),
          adminName: currentUser?.username || 'Admin',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');

      showToast(`Balance updated to ${currency}${data.newBalance}`);
      setBalanceModalUser(null);
      setBalanceAmount('');
      setBalanceReason('');
      fetchAdminData();
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Toggle user status
  const handleToggleUserStatus = async (user: User) => {
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    try {
      const res = await fetch(`/api/admin/users/${user.telegramId}/status`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          status: newStatus,
          adminName: currentUser?.username || 'Admin',
        }),
      });
      if (res.ok) {
        showToast(`User ${user.telegramId} marked as ${newStatus}`);
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Approve Deposit
  const handleApproveDeposit = async (dep: Deposit) => {
    triggerHaptic('medium');
    try {
      const res = await fetch(`/api/admin/deposits/${dep.id}/approve`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          adminName: currentUser?.username || 'Admin',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');

      showToast(`Deposit approved! ${currency}${dep.amount} credited to user.`);
      fetchAdminData();
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Reject Deposit
  const handleRejectDeposit = async (dep: Deposit) => {
    const reason = prompt('Enter rejection reason (e.g. Invalid TrxID):', 'Invalid transaction details');
    if (!reason) return;

    try {
      const res = await fetch(`/api/admin/deposits/${dep.id}/reject`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          adminName: currentUser?.username || 'Admin',
          reason,
        }),
      });
      if (res.ok) {
        showToast('Deposit rejected');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Order Update
  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderModal) return;

    try {
      const res = await fetch(`/api/admin/orders/${orderModal.id}/status`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          status: orderNewStatus,
          deliveryData: orderDeliveryData.trim() || undefined,
          refundToBalance: orderRefundCheck,
          adminName: currentUser?.username || 'Admin',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');

      showToast(`Order status updated to ${orderNewStatus}`);
      setOrderModal(null);
      setOrderDeliveryData('');
      fetchAdminData();
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const keys = autoDeliveryKeysText
      .split('\n')
      .map((k) => k.trim())
      .filter(Boolean);

    const isAuto = editingProduct.deliveryMode === 'auto' || editingProduct.deliveryType === 'instant';

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          ...editingProduct,
          deliveryMode: isAuto ? 'auto' : 'manual',
          deliveryType: isAuto ? 'instant' : 'manual',
          autoDeliveryItems: keys,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed');

      showToast('Product saved successfully');
      setEditingProduct(null);
      fetchAdminData();
      onRefreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (res.ok) {
        showToast('Product deleted');
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Payment Method
  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentMethod) return;

    try {
      const res = await fetch('/api/admin/payment-methods', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(editingPaymentMethod),
      });
      if (res.ok) {
        showToast('Payment method saved');
        setEditingPaymentMethod(null);
        fetchAdminData();
        onRefreshData();
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Bot Migration
  const handleRunMigration = async () => {
    try {
      const parsed = JSON.parse(migrationJson);
      const res = await fetch('/api/admin/migrate-bot', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          users: parsed.users || parsed,
          adminName: currentUser?.username || 'AdminMigration',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Migration failed');

      setMigrationStatus(data);
      showToast(`Migration complete! ${data.usersSynced} synced, ${data.usersPreserved} preserved.`);
      fetchAdminData();
      onRefreshData();
    } catch (err: any) {
      alert(`Migration error: ${err.message}`);
    }
  };

  // Loading state while verifying with server
  if (authLoading) {
    return (
      <div className="py-16 text-center space-y-3 animate-in fade-in">
        <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center mx-auto shadow-xs">
          <Shield className="w-7 h-7 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-neutral-900">Verifying Admin Authorization</h3>
          <p className="text-xs text-neutral-500 mt-1">Checking Telegram ID against server security configuration...</p>
        </div>
        <div className="inline-block px-2.5 py-1 rounded-lg bg-neutral-100 font-mono text-[11px] text-neutral-600">
          User ID: {currentUser?.telegramId || 'None'}
        </div>
      </div>
    );
  }

  // If not authorized, display strict Access Denied screen
  if (!isAuthenticated) {
    return (
      <AccessDeniedView
        user={currentUser}
        onReturnHome={onExitAdmin}
        onOpenSimulator={onOpenSimulator || (() => {})}
      />
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Admin Top Header */}
      <div className="bg-purple-950 text-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-700/80 uppercase tracking-wider">
              Admin Console
            </span>
            <span className="text-xs text-purple-300 font-mono">ID: {currentUser?.telegramId}</span>
          </div>
          <h2 className="text-base font-extrabold text-white mt-1">
            Central Management System
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('admin_token');
              setAdminToken('');
              setIsAuthenticated(false);
              triggerHaptic('medium');
            }}
            className="px-2.5 py-1.5 rounded-xl bg-purple-900/90 hover:bg-purple-800 text-purple-200 text-xs font-medium transition-colors border border-purple-700/60 cursor-pointer"
            title="Lock admin session"
          >
            Lock
          </button>
          <button
            type="button"
            onClick={onExitAdmin}
            className="px-3 py-1.5 rounded-xl bg-purple-800 hover:bg-purple-700 text-white text-xs font-semibold transition-colors border border-purple-600 cursor-pointer"
          >
            Exit Admin
          </button>
        </div>
      </div>

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Admin Navigation Scrollbar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Shield },
          { id: 'users', label: `Users (${users.length})`, icon: Users },
          { id: 'products', label: `Products (${products.length})`, icon: ShoppingBag },
          { id: 'delivery_inventory', label: 'Delivery Inventory', icon: Package },
          { id: 'categories', label: `Categories (${categories.length})`, icon: Folder },
          { id: 'orders', label: `Orders (${orders.filter((o) => o.status === 'Processing').length})`, icon: PackageCheck },
          { id: 'deposits', label: `Deposits (${deposits.filter((d) => d.status === 'Pending').length})`, icon: Wallet },
          { id: 'balance', label: 'Balance Mgmt', icon: DollarSign },
          { id: 'referrals', label: 'Referrals', icon: Gift },
          { id: 'payments', label: 'Payment Methods', icon: CreditCard },
          { id: 'prices', label: 'Prices', icon: Tag },
          { id: 'messages', label: 'Messages', icon: Megaphone },
          { id: 'settings', label: 'Settings', icon: Settings },
          { id: 'statistics', label: 'Statistics', icon: BarChart3 },
          { id: 'audit_logs', label: 'Audit Logs', icon: FileText },
          { id: 'bot_sync', label: 'Bot Sync & API', icon: Database },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveSection(tab.id as AdminSection);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. DASHBOARD OVERVIEW */}
      {activeSection === 'dashboard' && stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-white border border-neutral-200 rounded-xl shadow-2xs">
              <span className="text-neutral-500 text-[11px] block">Sales Revenue</span>
              <span className="text-lg font-extrabold text-blue-600">
                {currency}
                {stats.totalSalesRevenue.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-white border border-neutral-200 rounded-xl shadow-2xs">
              <span className="text-neutral-500 text-[11px] block">Total Deposited</span>
              <span className="text-lg font-extrabold text-emerald-600">
                {currency}
                {stats.totalDepositedAmount.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-white border border-neutral-200 rounded-xl shadow-2xs">
              <span className="text-neutral-500 text-[11px] block">In User Wallets</span>
              <span className="text-lg font-extrabold text-neutral-900">
                {currency}
                {stats.totalBalanceInWallets.toLocaleString()}
              </span>
            </div>
            <div className="p-3 bg-white border border-neutral-200 rounded-xl shadow-2xs">
              <span className="text-neutral-500 text-[11px] block">Commissions Paid</span>
              <span className="text-lg font-extrabold text-amber-600">
                {currency}
                {stats.totalCommissionsPaid.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Quick Action Alerts */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setActiveSection('users')}
              className="p-2.5 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl text-center transition-colors cursor-pointer"
            >
              <span className="text-[10px] text-neutral-500 block">Total Users</span>
              <span className="text-sm font-bold text-neutral-900">{stats.totalUsers}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('deposits')}
              className="p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-center transition-colors cursor-pointer"
            >
              <span className="text-[10px] text-amber-700 block">Pending Deposits</span>
              <span className="text-sm font-bold text-amber-800">{stats.pendingDepositsCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('orders')}
              className="p-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-center transition-colors cursor-pointer"
            >
              <span className="text-[10px] text-blue-700 block">Processing Orders</span>
              <span className="text-sm font-bold text-blue-800">{stats.processingOrdersCount}</span>
            </button>
          </div>

          {/* Direct module shortcuts */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
            <span className="text-xs font-bold text-neutral-900 uppercase tracking-wide block">
              Quick Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveSection('balance')}
                className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Balance Mgmt</span>
                <DollarSign className="w-3.5 h-3.5 text-purple-600" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('prices')}
                className="p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-800 font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Manage Prices</span>
                <Tag className="w-3.5 h-3.5 text-neutral-600" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('categories')}
                className="p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-800 font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Categories</span>
                <Folder className="w-3.5 h-3.5 text-neutral-600" />
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('audit_logs')}
                className="p-2.5 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-800 font-semibold flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Audit Logs</span>
                <FileText className="w-3.5 h-3.5 text-neutral-600" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DEPOSITS APPROVAL SECTION */}
      {activeSection === 'deposits' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-900 uppercase">Deposit Verification</h3>
            <span className="text-xs text-neutral-500">
              {deposits.filter((d) => d.status === 'Pending').length} Pending
            </span>
          </div>

          {deposits.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">No deposit requests.</p>
          ) : (
            <div className="space-y-2">
              {deposits.map((dep) => {
                const isPending = dep.status === 'Pending';
                return (
                  <div
                    key={dep.id}
                    className={`bg-white border rounded-xl p-3 space-y-2 ${
                      isPending ? 'border-amber-300 ring-1 ring-amber-200' : 'border-neutral-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-neutral-900">{dep.methodName}</span>
                          <span className="text-[10px] font-mono text-neutral-500">User: {dep.telegramId}</span>
                        </div>
                        <div className="text-xs font-mono font-bold text-neutral-800 mt-0.5">
                          TrxID: {dep.transactionId}
                        </div>
                        {dep.senderNumber && (
                          <div className="text-[11px] text-neutral-500">Sender: {dep.senderNumber}</div>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="text-base font-extrabold text-blue-600">
                          +{currency}
                          {dep.amount}
                        </span>
                        <div className="text-[10px] font-semibold mt-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-full ${
                              dep.status === 'Approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : dep.status === 'Pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {dep.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isPending && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => handleRejectDeposit(dep)}
                          className="py-1.5 rounded-lg border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-50"
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApproveDeposit(dep)}
                          className="py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
                        >
                          Approve & Credit
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. ORDERS MANAGEMENT */}
      {activeSection === 'orders' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-900 uppercase">Customer Orders</h3>
            <span className="text-xs text-neutral-500">
              {orders.filter((o) => o.status === 'Processing').length} Processing
            </span>
          </div>

          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="bg-white border border-neutral-200 rounded-xl p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-neutral-400">#{o.id.slice(-6)}</span>
                      <h4 className="text-xs font-bold text-neutral-900">{o.productNameEn}</h4>
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      User: {o.telegramId} • Qty: {o.quantity} • {currency}
                      {o.totalAmount}
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      o.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : o.status === 'Processing'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {o.status}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-neutral-500">
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-neutral-100 text-neutral-700">
                    Mode: {o.deliveryMode || 'manual'}
                  </span>
                  {o.deliverySlotId && (
                    <span className="text-[10px] text-purple-600 font-mono">
                      Slot: {o.deliverySlotId.slice(-6)}
                    </span>
                  )}
                </div>

                {o.deliveryData && (
                  <div className="text-[11px] font-mono bg-neutral-50 p-1.5 rounded border border-neutral-200 truncate">
                    Delivered: {o.deliveryData}
                  </div>
                )}

                <div className="pt-2 border-t border-neutral-100 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryOrderModal(o);
                      triggerHaptic('light');
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{o.status === 'Processing' ? 'Open Order & Deliver' : 'View Delivery / Details'}</span>
                  </button>
                  {o.status === 'Processing' && (
                    <button
                      type="button"
                      onClick={() => {
                        setOrderModal(o);
                        setOrderNewStatus('Cancelled');
                      }}
                      className="py-1.5 px-3 rounded-lg border border-neutral-200 text-neutral-700 text-xs font-semibold hover:bg-neutral-50 cursor-pointer"
                    >
                      Cancel / Refund
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. USERS MANAGEMENT */}
      {activeSection === 'users' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                placeholder="Search user by ID or name..."
                className="w-full bg-white border border-neutral-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            {users
              .filter(
                (u) =>
                  !searchUser ||
                  u.telegramId.includes(searchUser) ||
                  u.firstName.toLowerCase().includes(searchUser.toLowerCase()) ||
                  (u.username && u.username.toLowerCase().includes(searchUser.toLowerCase()))
              )
              .map((u) => (
                <div key={u.id} className="bg-white border border-neutral-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-neutral-900">{u.firstName}</span>
                        {u.username && <span className="text-xs text-neutral-500">@{u.username}</span>}
                        {u.role === 'admin' && (
                          <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 rounded font-bold">
                            Admin
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">TG ID: {u.telegramId}</div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-blue-600">
                        {currency}
                        {u.balance}
                      </span>
                      <span
                        className={`block text-[10px] font-semibold ${
                          u.status === 'active' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {u.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-2 border-t border-neutral-100">
                    <span>Deposited: {currency}{u.totalDeposited} • Spent: {currency}{u.totalSpent}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(u)}
                        className={`px-2 py-1 rounded text-[10px] font-semibold border ${
                          u.status === 'active'
                            ? 'text-rose-700 border-rose-200 hover:bg-rose-50'
                            : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                        }`}
                      >
                        {u.status === 'active' ? 'Ban' : 'Unban'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBalanceModalUser(u);
                          setBalanceAmount('');
                          setBalanceReason('');
                        }}
                        className="px-2.5 py-1 rounded bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 text-[10px] font-semibold"
                      >
                        Adjust Balance
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 5. PRODUCTS MANAGEMENT */}
      {activeSection === 'products' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-900 uppercase">Product Catalog</h3>
            <button
              type="button"
              onClick={() => {
                setEditingProduct({
                  nameEn: '',
                  nameBn: '',
                  descriptionEn: '',
                  descriptionBn: '',
                  price: 100,
                  stock: 10,
                  categoryId: categories[0]?.id || 'cat-telegram',
                  deliveryType: 'manual',
                  active: true,
                });
                setAutoDeliveryKeysText('');
              }}
              className="px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Product
            </button>
          </div>

          <div className="space-y-2">
            {products.map((p) => {
              const isAuto = p.deliveryMode === 'auto' || p.deliveryType === 'instant';
              return (
                <div key={p.id} className="bg-white border border-neutral-200 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-neutral-900">{p.nameEn}</h4>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            isAuto
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isAuto ? '⚡ Auto Delivery' : '📦 Manual Delivery'}
                        </span>
                      </div>
                      <span className="text-[11px] text-neutral-500">{p.nameBn}</span>
                      <div className="text-[10px] text-neutral-400 mt-0.5">
                        {isAuto ? (
                          <span className="text-emerald-600 font-semibold">
                            Available Inventory Slots: {p.availableSlotsCount ?? 0}
                          </span>
                        ) : (
                          <span>Stock: {p.stock === -1 ? 'Unlimited' : p.stock}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-blue-600">
                        {currency}
                        {p.price}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 justify-end">
                        {isAuto && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSection('delivery_inventory');
                              triggerHaptic('light');
                            }}
                            className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-semibold cursor-pointer border border-purple-200 flex items-center gap-1"
                            title="Manage Delivery Slots"
                          >
                            <Package className="w-3 h-3" />
                            Slots
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p);
                            setAutoDeliveryKeysText((p.autoDeliveryItems || []).join('\n'));
                          }}
                          className="p-1 rounded bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1 rounded bg-rose-50 text-rose-600 hover:bg-rose-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. BOT SYNC & MIGRATION & API DOCS */}
      {activeSection === 'bot_sync' && (
        <div className="space-y-4">
          {/* API Endpoints documentation */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
              Central REST API for Telegram Bot
            </h4>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Connect your existing Python (python-telegram-bot, aiogram), Node.js (telegraf, grammy), or PHP bot directly using the endpoints below.
            </p>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 bg-neutral-900 text-neutral-100 rounded-xl space-y-1">
                <span className="text-emerald-400 font-bold">POST /api/bot/sync-user</span>
                <p className="text-[10px] text-neutral-400 font-sans">
                  Idempotently syncs existing or new users without resetting their balance!
                </p>
                <pre className="text-[10px] text-neutral-300 select-all overflow-x-auto">
{`Headers: { "X-Bot-Token": "YOUR_ADMIN_SECRET_KEY" }
Body: { "telegramId": "123456", "username": "user", "firstName": "John" }`}
                </pre>
              </div>

              <div className="p-2 bg-neutral-900 text-neutral-100 rounded-xl space-y-1">
                <span className="text-emerald-400 font-bold">GET /api/bot/user/:telegramId</span>
                <p className="text-[10px] text-neutral-400 font-sans">
                  Retrieves live wallet balance & profile for bot commands like /balance.
                </p>
              </div>

              <div className="p-2 bg-neutral-900 text-neutral-100 rounded-xl space-y-1">
                <span className="text-emerald-400 font-bold">POST /api/bot/order</span>
                <p className="text-[10px] text-neutral-400 font-sans">
                  Creates order and atomically deducts wallet balance.
                </p>
              </div>
            </div>
          </div>

          {/* Bulk Bot Migration Tool */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-1.5">
              <Database className="w-4 h-4 text-purple-600" />
              Existing Bot Data Migration & Import
            </h4>
            <p className="text-xs text-neutral-600">
              Paste your existing bot user data JSON below. A pre-migration backup will be automatically saved, and valid balances and records will be preserved.
            </p>

            <textarea
              rows={6}
              value={migrationJson}
              onChange={(e) => setMigrationJson(e.target.value)}
              placeholder={`[
  { "telegramId": "99887766", "username": "old_user", "firstName": "Karim", "balance": 450 },
  { "telegramId": "55443322", "username": "pro_gamer", "firstName": "Sabbir", "balance": 1200 }
]`}
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-purple-500"
            />

            <button
              type="button"
              onClick={handleRunMigration}
              disabled={!migrationJson.trim()}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-300 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Run Safe Migration & Backup
            </button>

            {migrationStatus && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                <strong>Migration Finished Successfully:</strong>
                <div>• Pre-migration Backup: {migrationStatus.backupFilename}</div>
                <div>• Users Synced / Created: {migrationStatus.usersSynced}</div>
                <div>• Existing Users Preserved: {migrationStatus.usersPreserved}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CATEGORIES SECTION */}
      {activeSection === 'categories' && (
        <AdminCategories
          categories={categories}
          onSaveCategory={handleSaveCategory}
          onDeleteCategory={handleDeleteCategory}
          showToast={showToast}
        />
      )}

      {/* PRICES MANAGEMENT SECTION */}
      {activeSection === 'prices' && (
        <AdminPrices
          products={products}
          currency={currency}
          onUpdatePrices={handleBatchPrices}
          showToast={showToast}
        />
      )}

      {/* BALANCE MANAGEMENT SECTION */}
      {activeSection === 'balance' && (
        <AdminBalance
          users={users}
          currency={currency}
          onAdjustBalance={handleDirectBalanceAdjustment}
          showToast={showToast}
        />
      )}

      {/* DETAILED STATISTICS SECTION */}
      {activeSection === 'statistics' && (
        <AdminStatistics
          stats={stats}
          products={products}
          orders={orders}
          deposits={deposits}
          users={users}
          currency={currency}
        />
      )}

      {/* AUDIT LOGS SECTION */}
      {activeSection === 'audit_logs' && (
        <AdminAuditLogs headers={getHeaders()} />
      )}

      {/* DELIVERY INVENTORY MANAGEMENT SECTION */}
      {activeSection === 'delivery_inventory' && (
        <AdminDeliveryInventory
          products={products}
          adminToken={adminToken || sessionStorage.getItem('admin_token') || ''}
          showToast={showToast}
          currency={currency}
        />
      )}

      {/* 7. BALANCE ADJUSTMENT MODAL */}
      {balanceModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleAdjustBalance}
            className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 animate-in fade-in"
          >
            <h3 className="text-sm font-bold text-neutral-900">
              Adjust Balance for {balanceModalUser.firstName}
            </h3>
            <p className="text-xs text-neutral-500 font-mono">
              TG ID: {balanceModalUser.telegramId} • Current: {currency}
              {balanceModalUser.balance}
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Amount to Add or Subtract</label>
              <input
                type="number"
                step="any"
                required
                value={balanceAmount}
                onChange={(e) => setBalanceAmount(e.target.value)}
                placeholder="e.g. 500 or -200"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900"
              />
              <span className="text-[10px] text-neutral-400">
                Use positive value to credit, negative to debit.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Audit Reason (Required)</label>
              <input
                type="text"
                required
                value={balanceReason}
                onChange={(e) => setBalanceReason(e.target.value)}
                placeholder="e.g. Manual payment verified, compensation"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBalanceModalUser(null)}
                className="py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
              >
                Apply Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 8. ORDER COMPLETION MODAL */}
      {orderModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleUpdateOrder}
            className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 animate-in fade-in"
          >
            <h3 className="text-sm font-bold text-neutral-900">
              Update Order #{orderModal.id.slice(-6)}
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Status</label>
              <select
                value={orderNewStatus}
                onChange={(e) => setOrderNewStatus(e.target.value as any)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {orderNewStatus === 'Completed' ? (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700">
                  Delivered Items / Secret Key / Link
                </label>
                <textarea
                  rows={3}
                  value={orderDeliveryData}
                  onChange={(e) => setOrderDeliveryData(e.target.value)}
                  placeholder="e.g. https://t.me/giftcode/... or Account info"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs font-mono"
                />
              </div>
            ) : (
              <label className="flex items-center gap-2 text-xs text-neutral-700 pt-1">
                <input
                  type="checkbox"
                  checked={orderRefundCheck}
                  onChange={(e) => setOrderRefundCheck(e.target.checked)}
                  className="rounded text-purple-600"
                />
                <span>Refund full amount ({currency}{orderModal.totalAmount}) to user wallet atomically</span>
              </label>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOrderModal(null)}
                className="py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
              >
                Save Status
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 9. PRODUCT EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveProduct}
            className="bg-white rounded-2xl p-5 max-w-md w-full space-y-3 max-h-[90vh] overflow-y-auto animate-in fade-in"
          >
            <h3 className="text-sm font-bold text-neutral-900">
              {editingProduct.id ? 'Edit Product' : 'Add New Product'}
            </h3>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Product Name (EN)</label>
              <input
                type="text"
                required
                value={editingProduct.nameEn || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, nameEn: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">Product Name (BN)</label>
              <input
                type="text"
                value={editingProduct.nameBn || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, nameBn: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-neutral-700">Price ({currency})</label>
                <input
                  type="number"
                  required
                  value={editingProduct.price ?? 100}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-bold"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-700">Stock (-1 for unlimited)</label>
                <input
                  type="number"
                  required
                  value={editingProduct.stock ?? -1}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-1.5 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-neutral-700">Category</label>
                <select
                  value={editingProduct.categoryId}
                  onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value })}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-1.5 text-xs"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-neutral-700">Delivery Mode</label>
                <select
                  value={editingProduct.deliveryMode || (editingProduct.deliveryType === 'instant' ? 'auto' : 'manual')}
                  onChange={(e) => {
                    const mode = e.target.value as 'auto' | 'manual';
                    setEditingProduct({
                      ...editingProduct,
                      deliveryMode: mode,
                      deliveryType: mode === 'auto' ? 'instant' : 'manual',
                    });
                  }}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-neutral-900"
                >
                  <option value="auto">⚡ Auto Delivery (Bot Instant Auto-Send)</option>
                  <option value="manual">📦 Manual Delivery (Admin Dispatches)</option>
                </select>
              </div>
            </div>

            {(editingProduct.deliveryMode === 'auto' || editingProduct.deliveryType === 'instant') ? (
              <div className="space-y-2 p-3 bg-purple-50/70 border border-purple-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                    <Package className="w-3.5 h-3.5 text-purple-600" />
                    <span>Auto Delivery Inventory</span>
                  </div>
                  {editingProduct.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setActiveSection('delivery_inventory');
                      }}
                      className="text-[10px] bg-purple-600 hover:bg-purple-700 text-white font-semibold px-2 py-1 rounded-lg cursor-pointer transition-colors"
                    >
                      Open Full Slot Manager →
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-purple-800 leading-relaxed">
                  Each slot supports <b>Text</b> (keys/credentials), <b>Photos</b>, and <b>Videos</b>. The bot automatically reserves and sends the next unused slot atomically to the buyer.
                </p>

                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-neutral-700 block">
                    Quick Text Slots Pool (1 credential/key per line)
                  </label>
                  <textarea
                    rows={3}
                    value={autoDeliveryKeysText}
                    onChange={(e) => setAutoDeliveryKeysText(e.target.value)}
                    placeholder="Key-12345&#10;Key-67890&#10;Email: test@domain.com | Pass: secret"
                    className="w-full bg-white border border-neutral-200 rounded-lg p-2 text-xs font-mono"
                  />
                  <span className="text-[10px] text-neutral-500">
                    Lines entered here will be added as text delivery slots.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
                <div className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-blue-600" />
                  <span>Manual Delivery Mode</span>
                </div>
                <p className="text-[11px] text-blue-800">
                  When a customer purchases this product, the order is placed in <b>Processing</b>. You can then open the order in the <b>Orders</b> tab to prepare custom Text, Photo, and Video to send to the buyer's Telegram chat.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 10. MANUAL DELIVERY MODAL */}
      {deliveryOrderModal && (
        <AdminManualDeliveryModal
          order={deliveryOrderModal}
          onClose={() => setDeliveryOrderModal(null)}
          adminToken={adminToken || sessionStorage.getItem('admin_token') || ''}
          onDelivered={(_updated) => {
            fetchAdminData();
            onRefreshData();
          }}
          showToast={showToast}
          currency={currency}
        />
      )}
    </div>
  );
};
