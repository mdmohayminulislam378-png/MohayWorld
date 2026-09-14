import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Search, Filter, RefreshCw, FileText, CheckCircle2, Clock } from 'lucide-react';
import { triggerHaptic } from '../../telegram.ts';

interface AuditLog {
  id: string;
  action: string;
  actor: string;
  targetType: string;
  targetId: string;
  details: any;
  timestamp: string;
}

interface AdminAuditLogsProps {
  headers: Record<string, string>;
}

export const AdminAuditLogs: React.FC<AdminAuditLogsProps> = ({ headers }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (actionFilter !== 'ALL') q.set('action', actionFilter);
      if (search.trim()) q.set('q', search.trim());

      const res = await fetch(`/api/admin/audit-logs?${q.toString()}`, { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.logs)) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, search, headers]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const actionTypes = [
    'ALL',
    'BALANCE_ADJUSTMENT',
    'DEPOSIT_APPROVED',
    'DEPOSIT_REJECTED',
    'ORDER_STATUS_UPDATE',
    'PRODUCT_UPDATE',
    'SETTINGS_UPDATE',
  ];

  const getActionBadgeColor = (action: string) => {
    if (action.includes('DEPOSIT_APPROVED')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('REJECTED') || action.includes('CANCEL')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (action.includes('BALANCE')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (action.includes('ORDER')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-neutral-100 text-neutral-700 border-neutral-200';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">
            Security & Activity Audit Logs
          </h3>
          <p className="text-[11px] text-neutral-500">
            Immutable server audit trail of financial actions and modifications
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            fetchLogs();
          }}
          className="p-1.5 rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-50 transition-colors"
          title="Refresh Audit Logs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-600' : ''}`} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, target ID, reason..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-neutral-200 rounded-xl text-xs focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Action type filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px] font-semibold">
          {actionTypes.map((act) => (
            <button
              key={act}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActionFilter(act);
              }}
              className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                actionFilter === act
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
              }`}
            >
              {act.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Listing */}
      <div className="space-y-2">
        {loading && logs.length === 0 ? (
          <div className="p-8 text-center bg-white border border-neutral-200 rounded-2xl text-xs text-neutral-500">
            Loading audit trail...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center bg-white border border-neutral-200 rounded-2xl text-xs text-neutral-500">
            No audit records matching criteria.
          </div>
        ) : (
          logs.map((log) => {
            const dateStr = new Date(log.timestamp).toLocaleString();
            return (
              <div
                key={log.id}
                className="bg-white border border-neutral-200 rounded-2xl p-3 shadow-2xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${getActionBadgeColor(
                      log.action
                    )}`}
                  >
                    {log.action}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{dateStr}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="text-neutral-700">
                    Actor: <span className="font-bold text-neutral-900">{log.actor}</span>
                  </span>
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {log.targetType}: {log.targetId}
                  </span>
                </div>

                {log.details && Object.keys(log.details).length > 0 && (
                  <div className="p-2 bg-neutral-50 rounded-lg text-[11px] font-mono text-neutral-600 border border-neutral-100 overflow-x-auto">
                    {Object.entries(log.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 py-0.5 border-b border-neutral-100/50 last:border-none">
                        <span className="text-neutral-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                        <span className="font-semibold text-neutral-800 text-right">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
