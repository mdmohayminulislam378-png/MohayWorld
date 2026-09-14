import React from 'react';
import { User } from '../types.ts';
import { ShieldAlert, ArrowLeft, RefreshCw, Lock, AlertTriangle } from 'lucide-react';
import { triggerHaptic } from '../telegram.ts';

interface AccessDeniedViewProps {
  user: User | null;
  onReturnHome: () => void;
  onOpenSimulator: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  user,
  onReturnHome,
  onOpenSimulator,
}) => {
  return (
    <div className="py-8 px-2 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Visual Error Header */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-9 h-9" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold tracking-wide uppercase">
          <Lock className="w-3 h-3" />
          HTTP 403 Forbidden
        </div>
        <h2 className="text-xl font-extrabold text-neutral-900 tracking-tight">Access Denied</h2>
        <p className="text-xs text-neutral-600 max-w-xs mx-auto leading-relaxed">
          The route <code className="px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-800 font-mono text-[11px]">/admin</code> is restricted. Only authorized Telegram Admin User IDs can enter this portal.
        </p>
      </div>

      {/* Security Audit Detail Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-4 space-y-3 shadow-2xs text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <span className="font-bold text-neutral-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Security Audit Details
          </span>
          <span className="text-[10px] font-mono text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">
            UNAUTHORIZED
          </span>
        </div>

        <div className="space-y-2 text-neutral-600">
          <div className="flex justify-between items-center py-1 border-b border-neutral-50">
            <span>Attempted Route:</span>
            <span className="font-mono font-bold text-neutral-900">/admin</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-neutral-50">
            <span>Your Telegram ID:</span>
            <span className="font-mono font-bold text-neutral-900">{user?.telegramId || 'Anonymous'}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-neutral-50">
            <span>User Name:</span>
            <span className="font-semibold text-neutral-900">{user?.firstName || 'Guest'} {user?.lastName || ''}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-neutral-50">
            <span>Account Role:</span>
            <span className="font-bold text-rose-600 capitalize">{user?.role || 'user'}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span>Server-side Verification:</span>
            <span className="font-semibold text-rose-600">Rejected (Non-Admin ID)</span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-[11px] text-neutral-500 leading-relaxed">
          Admin access requires the authorized Telegram Admin ID (configured in <code className="font-mono text-neutral-700">ADMIN_TELEGRAM_ID</code>). Server-side authorization blocks all regular customer accounts from accessing administrative APIs.
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2 pt-2">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            onReturnHome();
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Store Home</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenSimulator();
          }}
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
          <span>Switch Account (Test Admin in Preview)</span>
        </button>
      </div>
    </div>
  );
};
