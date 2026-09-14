import React, { useState } from 'react';
import { User } from '../types.ts';
import { X, UserCheck, Shield, PlusCircle } from 'lucide-react';
import { triggerHaptic } from '../telegram.ts';

interface UserSimulatorModalProps {
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: Partial<User>) => void;
}

const PRESET_USERS = [
  {
    telegramId: '613669930',
    username: 'official_admin',
    firstName: 'Admin',
    lastName: 'Manager',
    role: 'admin',
    language: 'en',
    note: 'Master Admin Account (Full access to Admin Panel & Balance control)',
  },
  {
    telegramId: '987654321',
    username: 'rahim_tech',
    firstName: 'Rahim',
    lastName: 'Ahmed',
    role: 'user',
    language: 'bn',
    note: 'Regular Customer (Bangla language, active balance)',
  },
  {
    telegramId: '112233445',
    username: 'samiul_gamer',
    firstName: 'Samiul',
    lastName: 'Islam',
    role: 'user',
    language: 'en',
    note: 'Gamer Customer (English language)',
  },
];

export const UserSimulatorModal: React.FC<UserSimulatorModalProps> = ({
  currentUser,
  isOpen,
  onClose,
  onSelectUser,
}) => {
  const [customId, setCustomId] = useState('');
  const [customName, setCustomName] = useState('');

  if (!isOpen) return null;

  const handleSelect = (u: any) => {
    triggerHaptic('light');
    onSelectUser(u);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customId.trim() || !customName.trim()) return;
    triggerHaptic('medium');
    onSelectUser({
      telegramId: customId.trim(),
      firstName: customName.trim(),
      username: customName.trim().toLowerCase().replace(/\s+/g, '_'),
      role: 'user',
      language: 'en',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-xl animate-in fade-in">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-neutral-900">Telegram Account Simulator</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-500">
          Select or create a Telegram user to test wallet balance sync, instant purchases, and the admin panel:
        </p>

        <div className="space-y-2">
          {PRESET_USERS.map((u) => {
            const isSelected = currentUser?.telegramId === u.telegramId;
            return (
              <div
                key={u.telegramId}
                onClick={() => handleSelect(u)}
                className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-500'
                    : 'border-neutral-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-neutral-900">
                  <div className="flex items-center gap-1.5">
                    {u.role === 'admin' ? (
                      <Shield className="w-3.5 h-3.5 text-purple-600" />
                    ) : (
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    )}
                    <span>{u.firstName} {u.lastName}</span>
                    {u.role === 'admin' && (
                      <span className="text-[9px] bg-purple-100 text-purple-800 px-1 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-mono">ID: {u.telegramId}</span>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1 leading-snug">{u.note}</p>
              </div>
            );
          })}
        </div>

        {/* Custom User Form */}
        <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-neutral-100 space-y-2">
          <span className="text-[11px] font-bold text-neutral-700 uppercase tracking-wide block">
            Or enter custom Telegram ID
          </span>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              placeholder="Telegram ID"
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
            />
            <input
              type="text"
              required
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="First Name"
              className="bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs"
            />
          </div>
          <button
            type="submit"
            className="w-full py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800"
          >
            Switch to Custom User
          </button>
        </form>
      </div>
    </div>
  );
};
