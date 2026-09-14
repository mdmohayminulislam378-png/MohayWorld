import React, { useState } from 'react';
import { User, Deposit, Transaction, PaymentMethod, SystemSettings, Language } from '../types.ts';
import { getT } from '../translations.ts';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  QrCode,
  ShieldAlert,
  Info,
  ChevronRight,
  PlusCircle,
  FileText,
} from 'lucide-react';
import { triggerHaptic } from '../telegram.ts';

interface WalletViewProps {
  user: User | null;
  deposits: Deposit[];
  transactions: Transaction[];
  paymentMethods: PaymentMethod[];
  settings: SystemSettings | null;
  language: Language;
  onDepositSubmitted: (deposit: Deposit) => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  user,
  deposits,
  transactions,
  paymentMethods,
  settings,
  language,
  onDepositSubmitted,
}) => {
  const t = getT(language);
  const currency = settings?.currencySymbol || '৳';

  const [activeSubTab, setActiveSubTab] = useState<'deposit' | 'history' | 'statement'>('deposit');
  const [selectedMethodId, setSelectedMethodId] = useState<string>(paymentMethods[0]?.id || '');
  const [amount, setAmount] = useState<string>('');
  const [transactionId, setTransactionId] = useState<string>('');
  const [senderNumber, setSenderNumber] = useState<string>('');
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const selectedMethod = paymentMethods.find((m) => m.id === selectedMethodId) || paymentMethods[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    triggerHaptic('light');
    setCopiedNumber(true);
    setTimeout(() => setCopiedNumber(false), 2000);
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMethod) return;

    const numAmount = Number(amount);
    const min = selectedMethod.minAmount || settings?.minDepositAmount || 50;

    if (isNaN(numAmount) || numAmount < min) {
      triggerHaptic('error');
      setErrorMessage(`${t.minDeposit}: ${currency}${min}`);
      return;
    }

    if (!transactionId.trim()) {
      triggerHaptic('error');
      setErrorMessage('Transaction ID is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    triggerHaptic('medium');

    try {
      const res = await fetch('/api/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Telegram-Id': user.telegramId,
          'X-Telegram-Init-Data': localStorage.getItem('tg_sim_user') || '',
        },
        body: JSON.stringify({
          methodId: selectedMethod.id,
          amount: numAmount,
          transactionId: transactionId.trim(),
          senderNumber: senderNumber.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit deposit');
      }

      triggerHaptic('success');
      setSuccessMessage(t.depositSubmitted);
      setAmount('');
      setTransactionId('');
      setSenderNumber('');
      onDepositSubmitted(data.deposit);
    } catch (err: any) {
      triggerHaptic('error');
      setErrorMessage(err.message || t.errorOccurred);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Wallet Balance Hero Card */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between text-blue-100 text-xs">
          <div className="flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-blue-300" />
            <span className="font-semibold">{t.currentBalance}</span>
          </div>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full border border-white/20">
            ID: {user?.telegramId}
          </span>
        </div>

        <div className="mt-2 text-3xl font-extrabold tracking-tight">
          {currency}
          {user ? user.balance.toLocaleString() : '0.00'}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-blue-600/60 text-xs">
          <div>
            <span className="text-blue-200 text-[11px] block">{t.totalDeposited}</span>
            <span className="font-semibold text-white">
              {currency}
              {user ? user.totalDeposited.toLocaleString() : '0'}
            </span>
          </div>
          <div>
            <span className="text-blue-200 text-[11px] block">{t.totalSpent}</span>
            <span className="font-semibold text-white">
              {currency}
              {user ? user.totalSpent.toLocaleString() : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-tab Switcher */}
      <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveSubTab('deposit');
          }}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeSubTab === 'deposit'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {t.depositTitle}
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveSubTab('history');
          }}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeSubTab === 'history'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {t.depositHistory}
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setActiveSubTab('statement');
          }}
          className={`flex-1 py-1.5 rounded-lg transition-all ${
            activeSubTab === 'statement'
              ? 'bg-white text-blue-600 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          {t.viewStatement}
        </button>
      </div>

      {/* SUBTAB 1: DEPOSIT FORM */}
      {activeSubTab === 'deposit' && (
        <div className="space-y-4">
          {/* Method selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-800">{t.selectMethod}</label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((m) => {
                const isSelected = (selectedMethod?.id || '') === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSelectedMethodId(m.id);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-1 ring-blue-600 shadow-2xs'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300'
                    }`}
                  >
                    <div className="text-xs font-bold truncate">
                      {language === 'bn' ? m.nameBn : m.nameEn}
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{m.accountType}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Method Details Card */}
          {selectedMethod && (
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100">
                <div>
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    {t.accountNumber}
                  </span>
                  <div className="font-mono text-base font-extrabold text-neutral-900 mt-0.5 select-all">
                    {selectedMethod.accountNumber}
                  </div>
                  <span className="text-[11px] text-blue-600 font-medium">
                    {selectedMethod.accountType} Account
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(selectedMethod.accountNumber)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedNumber ? t.copied : t.copyNumber}
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold mb-0.5">{t.paymentInstructions}</strong>
                  {language === 'bn' ? selectedMethod.instructionsBn : selectedMethod.instructionsEn}
                </div>
              </div>

              {/* Limits */}
              <div className="flex justify-between text-[11px] text-neutral-500 pt-1">
                <span>
                  {t.minDeposit}: {currency}
                  {selectedMethod.minAmount}
                </span>
                <span>
                  {t.maxDeposit}: {currency}
                  {selectedMethod.maxAmount}
                </span>
              </div>
            </div>
          )}

          {/* Deposit Submission Form */}
          <form onSubmit={handleSubmitDeposit} className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3 shadow-2xs">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
              {t.depositTitle} Form
            </h4>

            {/* Amount */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">{t.enterDepositAmount}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-neutral-400">
                  {currency}
                </span>
                <input
                  type="number"
                  min={selectedMethod?.minAmount || 50}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min ${currency}${selectedMethod?.minAmount || 50}`}
                  required
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Transaction ID */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">{t.transactionId}</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. BL99182374 or TXN8877112"
                required
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold uppercase text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[10px] text-neutral-400 block">
                {language === 'bn' ? 'সঠিক TrxID দিন। ডুপ্লিকেট সাবমিশন প্রতিরোধ করা হয়।' : 'Enter exact TrxID. Duplicate transaction IDs are prevented.'}
              </span>
            </div>

            {/* Sender Number */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-neutral-700">{t.senderNumber}</label>
              <input
                type="text"
                value={senderNumber}
                onChange={(e) => setSenderNumber(e.target.value)}
                placeholder="e.g. 017XXXXXXXX"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs text-neutral-900 placeholder-neutral-400 focus:bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Alerts */}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              {isSubmitting ? t.loading : t.submitDeposit}
            </button>
          </form>
        </div>
      )}

      {/* SUBTAB 2: DEPOSIT HISTORY */}
      {activeSubTab === 'history' && (
        <div className="space-y-2.5">
          {deposits.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-8 text-center">
              <Wallet className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs text-neutral-500">{t.noDeposits}</p>
            </div>
          ) : (
            deposits.map((dep) => {
              const isApproved = dep.status === 'Approved';
              const isPending = dep.status === 'Pending';

              return (
                <div
                  key={dep.id}
                  className="bg-white border border-neutral-200 rounded-xl p-3 space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-neutral-900">{dep.methodName}</span>
                      <div className="text-[11px] font-mono text-neutral-500 mt-0.5">
                        Trx: {dep.transactionId}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-sm font-extrabold text-blue-600">
                        +{currency}
                        {dep.amount}
                      </span>
                      <div className="mt-0.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isPending
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {dep.status === 'Approved'
                            ? t.statusApproved
                            : dep.status === 'Pending'
                            ? t.statusPending
                            : t.statusRejected}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1.5 border-t border-neutral-100">
                    <span>{new Date(dep.createdAt).toLocaleString()}</span>
                    {dep.adminNote && (
                      <span className="text-neutral-500 italic max-w-[200px] truncate">
                        Note: {dep.adminNote}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUBTAB 3: STATEMENT / TRANSACTIONS */}
      {activeSubTab === 'statement' && (
        <div className="space-y-2.5">
          {transactions.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-8 text-center">
              <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-xs text-neutral-500">No transactions recorded yet.</p>
            </div>
          ) : (
            transactions.map((tx) => {
              const isPositive = tx.amount > 0;
              const desc = language === 'bn' ? tx.descriptionBn : tx.descriptionEn;

              return (
                <div
                  key={tx.id}
                  className="bg-white border border-neutral-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isPositive ? (
                          <ArrowDownLeft className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        )}
                      </span>
                      <span className="text-xs font-bold text-neutral-900 truncate">{desc}</span>
                    </div>

                    <div className="text-[10px] text-neutral-400 mt-1 pl-7.5">
                      {new Date(tx.createdAt).toLocaleString()} • {t.previousBalanceLabel}: {currency}
                      {tx.previousBalance} → {t.newBalanceLabel}: {currency}
                      {tx.newBalance}
                    </div>
                  </div>

                  <div
                    className={`text-xs font-extrabold shrink-0 ${
                      isPositive ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {currency}
                    {Math.abs(tx.amount)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
