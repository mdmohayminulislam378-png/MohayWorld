// Telegram WebApp SDK Wrapper & Browser Simulator

export interface TelegramWebAppUser {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export function getTelegramWebApp(): any {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp;
  }
  return null;
}

export function isInsideTelegram(): boolean {
  const tg = getTelegramWebApp();
  return Boolean(tg && tg.initData && tg.initData.length > 0);
}

export function getTelegramInitData(): string {
  const tg = getTelegramWebApp();
  if (tg && tg.initData) {
    return tg.initData;
  }

  // Fallback for browser preview / testing
  const savedSim = localStorage.getItem('tg_sim_user');
  if (savedSim) {
    return savedSim;
  }

  // Default simulated user (Matches demo admin user)
  return 'simulated_user_:613669930:DemoTrader:Mohayminul';
}

export function getTelegramUser(): {
  telegramId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
} {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.user) {
    const u = tg.initDataUnsafe.user;
    return {
      telegramId: String(u.id),
      username: u.username,
      firstName: u.first_name,
      lastName: u.last_name,
    };
  }

  // Fallback to local simulated user or default admin user
  const savedSim = localStorage.getItem('tg_sim_user');
  if (savedSim) {
    try {
      const parsed = JSON.parse(savedSim);
      if (parsed.telegramId) {
        return {
          telegramId: String(parsed.telegramId),
          username: parsed.username,
          firstName: parsed.firstName,
          lastName: parsed.lastName,
        };
      }
    } catch {
      // Not JSON format
    }
  }

  return {
    telegramId: '613669930',
    username: 'official_admin',
    firstName: 'Admin',
    lastName: 'Manager',
  };
}

export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor?.('#ffffff');
      tg.setBackgroundColor?.('#f8fafc');
      tg.enableClosingConfirmation?.();
    } catch (e) {
      console.warn('Could not initialize full Telegram WebApp properties:', e);
    }
  }
}

export const initTelegramWebApp = initTelegramApp;

export function triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') {
  const tg = getTelegramWebApp();
  if (!tg?.HapticFeedback) return;

  try {
    if (type === 'light' || type === 'medium' || type === 'heavy') {
      tg.HapticFeedback.impactOccurred(type);
    } else {
      tg.HapticFeedback.notificationOccurred(type);
    }
  } catch (e) {
    // Ignore haptic failures
  }
}
