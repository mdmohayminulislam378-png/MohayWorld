import React, { useState, useEffect } from 'react';
import { User, SystemSettings, Language } from '../types.ts';
import { getT } from '../translations.ts';
import { Gift, Copy, Check, Users, DollarSign, Award, ArrowUpRight, Share2 } from 'lucide-react';
import { triggerHaptic } from '../telegram.ts';

interface ReferralViewProps {
  user: User | null;
  settings: SystemSettings | null;
  language: Language;
}

export const ReferralView: React.FC<ReferralViewProps> = ({ user, settings, language }) => {
  const t = getT(language);
  const currency = settings?.currencySymbol || '৳';
  const commissionRate = settings?.referralCommissionPercent || 10;

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [referralData, setReferralData] = useState<{
    referredUsers: any[];
    commissions: any[];
  }>({ referredUsers: [], commissions: [] });
  const [loading, setLoading] = useState(false);

  const refCode = user?.referralCode || `REF${user?.telegramId?.slice(-6) || '000000'}`;
  const botUsername = settings?.botUsername || 'OfficialStoreBot';
  const referralLink = `https://t.me/${botUsername}?start=ref_${refCode}`;

  useEffect(() => {
    if (!user) return;
    const fetchReferrals = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/referrals', {
          headers: {
            'X-Telegram-Id': user.telegramId,
            'X-Telegram-Init-Data': localStorage.getItem('tg_sim_user') || '',
          },
        });
        const data = await res.json();
        if (data.success) {
          setReferralData({
            referredUsers: data.referredUsers || [],
            commissions: data.commissions || [],
          });
        }
      } catch (err) {
        console.error('Error fetching referral data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, [user]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    triggerHaptic('light');
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(refCode);
    triggerHaptic('light');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-4 pb-8">
      <div>
        <h2 className="text-base font-bold text-neutral-900">{t.referralTitle}</h2>
        <p className="text-xs text-neutral-500">{t.referralSubtitle}</p>
      </div>

      {/* Hero Commission Card */}
      <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
        <div className="flex items-center justify-between text-amber-100 text-xs">
          <div className="flex items-center gap-1.5">
            <Gift className="w-4 h-4 text-amber-200" />
            <span className="font-semibold">{t.commissionRate}</span>
          </div>
          <span className="text-[11px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
            {commissionRate}% Lifetime
          </span>
        </div>

        <div className="mt-2.5">
          <span className="text-[11px] text-amber-100 block">{t.totalEarned}</span>
          <span className="text-3xl font-extrabold tracking-tight">
            {currency}
            {user ? user.totalCommissionEarned.toLocaleString() : '0.00'}
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-amber-400/50 flex items-center justify-between text-xs text-amber-100">
          <span>{t.totalReferred}:</span>
          <span className="font-bold text-white text-sm">
            {referralData.referredUsers.length} Friends
          </span>
        </div>
      </div>

      {/* Referral Link & Code Copy Box */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3 shadow-2xs">
        {/* Referral Code */}
        <div className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-xl border border-neutral-200">
          <div>
            <span className="text-[10px] text-neutral-500 block uppercase font-semibold">
              {t.yourReferralCode}
            </span>
            <span className="text-sm font-mono font-extrabold text-neutral-900">{refCode}</span>
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-100 text-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCode ? t.copied : t.copyNumber}
          </button>
        </div>

        {/* Full Link */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-neutral-700">{t.yourReferralLink}</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-xs font-mono text-neutral-700 select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              {copiedLink ? t.copied : t.copyLink}
            </button>
          </div>
        </div>
      </div>

      {/* How It Works Guide */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
        <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
          {t.howItWorks}
        </h4>
        <div className="space-y-2 text-xs text-neutral-600 leading-relaxed">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 text-[11px]">
              1
            </span>
            <p>{t.step1}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 text-[11px]">
              2
            </span>
            <p>{t.step2}</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 text-[11px]">
              3
            </span>
            <p>{t.step3}</p>
          </div>
        </div>
      </div>

      {/* Invited Friends List */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
          {t.referredFriends} ({referralData.referredUsers.length})
        </h4>

        {referralData.referredUsers.length === 0 ? (
          <div className="bg-white border border-dashed border-neutral-200 rounded-2xl p-6 text-center">
            <Users className="w-7 h-7 text-neutral-300 mx-auto mb-1.5" />
            <p className="text-xs text-neutral-500">{t.noReferredFriends}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referralData.referredUsers.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-neutral-200 rounded-xl p-3 flex items-center justify-between text-xs shadow-2xs"
              >
                <div>
                  <span className="font-bold text-neutral-900 block">{item.referredUserName}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Joined: {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-emerald-600 font-bold block">
                    +{currency}
                    {item.commissionsGenerated}
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    Spent: {currency}
                    {item.totalPurchases}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
