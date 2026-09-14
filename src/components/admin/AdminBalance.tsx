import React, { useState } from 'react';
import { User } from '../../types.ts';
import { Wallet, ArrowUpRight, ArrowDownRight, Search, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { triggerHaptic } from '../../telegram.ts';

interface AdminBalanceProps {
  users: User[];
  currency: string;
  onAdjustBalance: (params: {
    telegramId: string;
    amount: number;
    reason: string;
  }) => Promise<void>;
  showToast: (msg: string) => void;
}

export const AdminBalance: React.FC<AdminBalanceProps> = ({
  users,
  currency,
  onAdjustBalance,
  showToast,
}) => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [mode, setMode] = useState<'credit' | 'debit'>('credit');
  const [reason, setReason] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const totalWalletLiability = users.reduce((sum, u) => sum + (u.balance || 0), 0);

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      u.telegramId.includes(s) ||
      u.firstName.toLowerCase().includes(s) ||
      (u.username && u.username.toLowerCase().includes(s))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const num = Number(amount);
    if (isNaN(num) || num <= 0) {
      alert('Please enter a valid positive amount');
      return;
    }
    if (!reason.trim()) {
      alert('A reason is strictly mandatory for the security audit log');
      return;
    }

    setSubmitting(true);
    triggerHaptic('medium');
    try {
      const finalAmount = mode === 'credit' ? num : -num;
      await onAdjustBalance({
        telegramId: selectedUser.telegramId,
        amount: finalAmount,
        reason: reason.trim(),
      });
      showToast(
        `Balance ${mode === 'credit' ? 'credited' : 'debited'} ${currency}${num} for ${selectedUser.firstName}!`
      );
      setAmount('');
      setReason('');
      setSelectedUser(null);
    } catch (err: any) {
      alert(err.message || 'Balance adjustment failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Wallet Liabilities Card */}
      <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white p-4 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] text-neutral-400 block font-medium">
            Total In User Wallets (System Liability)
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-0.5">
            {currency}
            {totalWalletLiability.toLocaleString()}
          </div>
          <p className="text-[10px] text-neutral-400 mt-1">
            Across {users.length} registered Telegram accounts
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 border border-white/10">
          <Wallet className="w-6 h-6" />
        </div>
      </div>

      {/* Direct Balance Adjustment Panel */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
            Atomic Balance Adjustment
          </h3>
          <span className="text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded">
            Audited
          </span>
        </div>

        {selectedUser ? (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="p-3 bg-neutral-50 rounded-xl flex items-center justify-between border border-neutral-200">
              <div>
                <span className="text-xs font-bold text-neutral-900">{selectedUser.firstName}</span>
                <span className="text-[11px] text-neutral-500 font-mono block">
                  ID: {selectedUser.telegramId} {selectedUser.username && `@${selectedUser.username}`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 block">Current Balance</span>
                <span className="text-xs font-bold text-emerald-600">
                  {currency}
                  {selectedUser.balance}
                </span>
              </div>
            </div>

            {/* Credit or Debit selector */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('credit')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  mode === 'credit'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>Credit (+)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('debit')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  mode === 'debit'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-neutral-50 text-neutral-700 border-neutral-200'
                }`}
              >
                <ArrowDownRight className="w-4 h-4" />
                <span>Debit (-)</span>
              </button>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                Amount ({currency}) *
              </label>
              <input
                type="number"
                required
                min="1"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 250"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-bold text-neutral-900 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-neutral-700 block mb-1">
                Mandatory Audit Reason *
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Manual payment verification / Compensation"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setAmount('');
                  setReason('');
                }}
                className="flex-1 py-2 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !amount}
                className={`flex-1 py-2 rounded-xl text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
                  mode === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Applying...' : `Execute ${mode === 'credit' ? 'Credit' : 'Debit'}`}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user by Telegram ID or name to adjust balance..."
                className="w-full pl-8 pr-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-neutral-100 border border-neutral-200 rounded-xl">
              {filteredUsers.slice(0, 15).map((u) => (
                <div
                  key={u.telegramId}
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedUser(u);
                  }}
                  className="p-2.5 flex items-center justify-between hover:bg-purple-50/50 cursor-pointer transition-colors"
                >
                  <div>
                    <span className="text-xs font-bold text-neutral-900">{u.firstName}</span>
                    <span className="text-[10px] text-neutral-400 font-mono block">
                      ID: {u.telegramId} {u.username && `@${u.username}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600">
                      {currency}
                      {u.balance}
                    </span>
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded">
                      Select
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Balances Overview Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
            User Wallet Balances (Top 20)
          </h4>
          <span className="text-[11px] text-neutral-400">Sorted by Balance</span>
        </div>

        <div className="divide-y divide-neutral-100 text-xs">
          {[...users]
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 20)
            .map((u) => (
              <div key={u.telegramId} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-neutral-900">{u.firstName}</span>
                  <span className="text-[10px] text-neutral-400 font-mono ml-2">ID: {u.telegramId}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-neutral-900">
                    {currency}
                    {u.balance}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedUser(u);
                    }}
                    className="text-[10px] text-purple-600 hover:text-purple-800 font-bold underline cursor-pointer"
                  >
                    Adjust
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
