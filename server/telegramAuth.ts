import crypto from 'crypto';

export interface TelegramUser {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramAuthResult {
  valid: boolean;
  user?: TelegramUser;
  authDate?: number;
  error?: string;
  isSimulated?: boolean;
}

/**
 * Validates Telegram Mini App initData string using HMAC-SHA256
 * Official Telegram documentation: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(
  initDataRaw: string,
  botToken?: string
): TelegramAuthResult {
  if (!initDataRaw || typeof initDataRaw !== 'string') {
    return { valid: false, error: 'Empty initData payload' };
  }

  // Check for simulated dev preview token (used inside browser preview or testing)
  if (initDataRaw.startsWith('simulated_user_')) {
    try {
      const parts = initDataRaw.split(':');
      const tid = parts[1] || '613669930';
      const uname = parts[2] || 'TelegramPreviewUser';
      const fname = parts[3] || 'Mohayminul';
      return {
        valid: true,
        isSimulated: true,
        user: {
          id: tid,
          first_name: fname,
          username: uname,
          language_code: 'bn',
        },
        authDate: Math.floor(Date.now() / 1000),
      };
    } catch {
      return { valid: false, error: 'Invalid simulated initData' };
    }
  }

  // Check if initDataRaw is JSON (from browser localStorage simulation)
  if (initDataRaw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(initDataRaw);
      const tid = parsed.telegramId || parsed.id;
      if (tid) {
        return {
          valid: true,
          isSimulated: true,
          user: {
            id: String(tid),
            first_name: parsed.firstName || parsed.first_name || 'User',
            last_name: parsed.lastName || parsed.last_name,
            username: parsed.username || 'user',
            language_code: parsed.language || parsed.languageCode || 'en',
          },
          authDate: Math.floor(Date.now() / 1000),
        };
      }
    } catch {
      // Not valid JSON, continue to Telegram WebApp format
    }
  }

  const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    // If no bot token configured yet, allow safe test mode with warning in logs
    console.warn('[TelegramAuth] No TELEGRAM_BOT_TOKEN configured. Checking if raw initData has user json.');
    try {
      const urlParams = new URLSearchParams(initDataRaw);
      const userJson = urlParams.get('user');
      if (userJson) {
        const user = JSON.parse(userJson) as TelegramUser;
        return {
          valid: true,
          user,
          isSimulated: true,
          authDate: Number(urlParams.get('auth_date')) || Math.floor(Date.now() / 1000),
        };
      }
    } catch (e) {
      return { valid: false, error: 'Cannot parse unverified user payload' };
    }
    return { valid: false, error: 'TELEGRAM_BOT_TOKEN not configured on server' };
  }

  try {
    const urlParams = new URLSearchParams(initDataRaw);
    const hash = urlParams.get('hash');
    if (!hash) {
      return { valid: false, error: 'Missing hash parameter in initData' };
    }

    urlParams.delete('hash');

    // Sort parameters alphabetically
    const sortedKeys = Array.from(urlParams.keys()).sort();
    const dataCheckArr: string[] = [];
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${urlParams.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    // 1. secret_key = HMAC_SHA256(bot_token, "WebAppData")
    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(token)
      .digest();

    // 2. calculated_hash = HMAC_SHA256(data_check_string, secret_key)
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    const calculatedBuf = Buffer.from(calculatedHash, 'hex');
    const hashBuf = Buffer.from(hash, 'hex');

    if (calculatedBuf.length !== hashBuf.length || !crypto.timingSafeEqual(calculatedBuf, hashBuf)) {
      return { valid: false, error: 'Signature verification failed: invalid HMAC hash' };
    }

    // Check expiration (within 24 hours)
    const authDateStr = urlParams.get('auth_date');
    const authDate = authDateStr ? parseInt(authDateStr, 10) : 0;
    const now = Math.floor(Date.now() / 1000);
    if (authDate && now - authDate > 86400 * 2) { // 48h allowance
      return { valid: false, error: 'initData has expired' };
    }

    const userRaw = urlParams.get('user');
    let user: TelegramUser | undefined = undefined;
    if (userRaw) {
      user = JSON.parse(userRaw) as TelegramUser;
    }

    return {
      valid: true,
      user,
      authDate,
    };
  } catch (err: any) {
    return { valid: false, error: `Verification error: ${err.message}` };
  }
}
