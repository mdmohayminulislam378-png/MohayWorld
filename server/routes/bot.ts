import express from 'express';
import { db } from '../db.ts';

export const botRouter = express.Router();

// Middleware to verify Bot API Key / Token
function verifyBotAccess(req: express.Request, res: express.Response, next: express.NextFunction) {
  const incomingKey =
    req.headers['x-bot-token'] ||
    req.headers['x-admin-key'] ||
    req.query.token;

  const adminSecret = process.env.ADMIN_SECRET_KEY;
  const configuredBotToken = process.env.TELEGRAM_BOT_TOKEN;

  // Allow if matches server ADMIN_SECRET_KEY or bot token
  if (
    (adminSecret && incomingKey === adminSecret) ||
    (configuredBotToken && incomingKey === configuredBotToken) ||
    (!configuredBotToken && !adminSecret)
  ) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Unauthorized: Valid Bot Token or ADMIN_SECRET_KEY required in X-Bot-Token / X-Admin-Key header',
  });
}

// 1. SYNC OR REGISTER USER FROM EXISTING TELEGRAM BOT
botRouter.post('/sync-user', verifyBotAccess, async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName, language, referredByCode } = req.body;

    if (!telegramId) {
      return res.status(400).json({ success: false, error: 'telegramId is required' });
    }

    const { user, isNew } = await db.syncOrRegisterUser({
      telegramId: String(telegramId),
      username,
      firstName: firstName || 'Bot User',
      lastName,
      language: language === 'bn' ? 'bn' : 'en',
      referredByCode,
    });

    return res.json({
      success: true,
      isNew,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        balance: user.balance,
        language: user.language,
        status: user.status,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
      },
      message: isNew ? 'New user registered and connected to central DB' : 'Existing user synced without altering balance or history',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET USER PROFILE AND BALANCE FROM BOT
botRouter.get('/user/:telegramId', verifyBotAccess, (req, res) => {
  try {
    const { telegramId } = req.params;
    const user = db.getUser(String(telegramId));

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found in central database' });
    }

    const raw = db.getRawData();
    const recentOrders = raw.orders.filter((o) => o.telegramId === user.telegramId).slice(0, 5);
    const pendingDeposits = raw.deposits.filter((d) => d.telegramId === user.telegramId && d.status === 'Pending');

    return res.json({
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username,
        firstName: user.firstName,
        balance: user.balance,
        status: user.status,
        language: user.language,
        referralCode: user.referralCode,
        totalDeposited: user.totalDeposited,
        totalSpent: user.totalSpent,
        totalCommissionEarned: user.totalCommissionEarned,
      },
      recentOrders,
      pendingDepositsCount: pendingDeposits.length,
      settings: {
        currencySymbol: raw.settings.currencySymbol,
        botUsername: raw.settings.botUsername,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. PLACE AN ORDER FROM BOT (Atomic Balance deduction)
botRouter.post('/order', verifyBotAccess, async (req, res) => {
  try {
    const { telegramId, productId, quantity } = req.body;

    if (!telegramId || !productId) {
      return res.status(400).json({ success: false, error: 'telegramId and productId are required' });
    }

    const result = await db.createOrder({
      telegramId: String(telegramId),
      productId,
      quantity: Number(quantity) || 1,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    const user = db.getUser(String(telegramId));
    return res.json({
      success: true,
      order: result.order,
      newBalance: user?.balance ?? 0,
      message: 'Order created successfully and synchronized with central system',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. SUBMIT DEPOSIT FROM BOT
botRouter.post('/deposit', verifyBotAccess, async (req, res) => {
  try {
    const { telegramId, methodId, amount, transactionId, senderNumber } = req.body;

    if (!telegramId || !methodId || !amount || !transactionId) {
      return res.status(400).json({
        success: false,
        error: 'telegramId, methodId, amount, and transactionId are required',
      });
    }

    const result = await db.submitDeposit({
      telegramId: String(telegramId),
      methodId,
      amount: Number(amount),
      transactionId,
      senderNumber,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      deposit: result.deposit,
      message: 'Deposit submitted and queued for Admin verification',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 5. GET PRODUCTS FOR BOT COMMAND / CATALOG
botRouter.get('/products', (req, res) => {
  try {
    const products = db.getProducts(true);
    const categories = db.getCategories(true);
    const settings = db.getSettings();

    return res.json({
      success: true,
      products,
      categories,
      currencySymbol: settings.currencySymbol,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. BULK MIGRATION FROM EXISTING BOT
botRouter.post('/migrate', verifyBotAccess, async (req, res) => {
  try {
    const { users, orders, deposits, adminId } = req.body;

    const migrationResult = await db.migrateExistingBotData(
      { users, orders, deposits },
      adminId || 'BotMigrationAPI'
    );

    return res.json({
      success: true,
      ...migrationResult,
      message: 'Migration completed safely. Pre-migration backup created.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 7. DIRECT TELEGRAM WEBHOOK HANDLER FOR BOT COMMANDS
botRouter.post('/webhook', async (req, res) => {
  // Acknowledge Telegram webhook quickly
  res.status(200).send('OK');

  try {
    const update = req.body;
    if (!update || !update.message) return;

    const message = update.message;
    const text: string = message.text || '';
    const from = message.from;
    if (!from) return;

    const telegramId = String(from.id);
    const username = from.username;
    const firstName = from.first_name || 'Friend';
    const lastName = from.last_name;

    // Parse referral code from /start ref_XYZ
    let refCode: string | undefined = undefined;
    if (text.startsWith('/start ref_')) {
      refCode = text.replace('/start ref_', '').trim();
    }

    // Sync or register user automatically on every interaction
    const { user } = await db.syncOrRegisterUser({
      telegramId,
      username,
      firstName,
      lastName,
      referredByCode: refCode,
    });

    const settings = db.getSettings();
    const appUrl = process.env.APP_URL || '';

    // If bot token is available in environment, send response back to Telegram!
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.log(`[Bot Webhook] Received command "${text}" from ${telegramId} (@${username}). Bot token not set for sending message.`);
      return;
    }

    // Format Bot Messages
    let responseText = '';
    let replyMarkup: any = undefined;

    if (text.startsWith('/start')) {
      const isBn = user.language === 'bn';
      responseText = isBn
        ? `👋 স্বাগতম, *${firstName}*!\n\n` +
          `💰 আপনার বর্তমান ওয়ালেট ব্যালেন্স: *${settings.currencySymbol}${user.balance}*\n\n` +
          `${settings.welcomeMessageBn}\n\n` +
          `🚀 আমাদের সরাসরি টেলিগ্রাম মিনি অ্যাপ ব্যবহার করে সহজেই কেনাকাটা ও ব্যালেন্স ডিপোজিট করুন:`
        : `👋 Welcome, *${firstName}*!\n\n` +
          `💰 Your Current Balance: *${settings.currencySymbol}${user.balance}*\n\n` +
          `${settings.welcomeMessageEn}\n\n` +
          `🚀 Open our Telegram Mini App for the best seamless shopping & instant top-up experience:`;

      replyMarkup = {
        inline_keyboard: [
          [
            {
              text: isBn ? '🛍️ মিনি অ্যাপ খুলুন' : '🛍️ Open Mini App',
              web_app: { url: appUrl || 'https://t.me' },
            },
          ],
          [
            { text: isBn ? '💰 ব্যালেন্স' : '💰 Balance', callback_data: 'cmd_balance' },
            { text: isBn ? '🛒 প্রোডাক্ট লিস্ট' : '🛒 Products', callback_data: 'cmd_products' },
          ],
          [
            { text: isBn ? '💳 ডিপোজিট' : '💳 Deposit', callback_data: 'cmd_deposit' },
            { text: isBn ? '🎁 রেফারেল লিংক' : '🎁 Referral', callback_data: 'cmd_referral' },
          ],
        ],
      };
    } else if (text === '/balance') {
      responseText = `💰 *Wallet Balance Details*\n\nUser: ${user.firstName} (@${user.username || user.telegramId})\nBalance: *${settings.currencySymbol}${user.balance}*\nTotal Deposited: ${settings.currencySymbol}${user.totalDeposited}\nTotal Spent: ${settings.currencySymbol}${user.totalSpent}`;
    } else if (text === '/referral') {
      const refLink = `https://t.me/${settings.botUsername}?start=ref_${user.referralCode}`;
      responseText = `🎁 *Your Referral Program*\n\nInvite friends and earn *${settings.referralCommissionPercent}%* commission on all their purchases!\n\nYour Referral Code: \`${user.referralCode}\`\nYour Link: ${refLink}\n\nTotal Commission Earned: *${settings.currencySymbol}${user.totalCommissionEarned}*`;
    }

    if (responseText) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: message.chat.id,
          text: responseText,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup,
        }),
      }).catch((e) => console.error('Error sending Telegram message:', e));
    }
  } catch (err) {
    console.error('Bot webhook error:', err);
  }
});
