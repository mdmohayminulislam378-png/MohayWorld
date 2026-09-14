import express from 'express';
import { db } from '../db.ts';
import { verifyTelegramInitData } from '../telegramAuth.ts';

export const apiRouter = express.Router();

// Middleware to extract and verify user from Telegram WebApp initData header or token
async function authenticateUser(req: express.Request, res: express.Response, next: express.NextFunction) {
  const initData = req.headers['x-telegram-init-data'] as string;
  const directTid = req.headers['x-telegram-id'] as string;

  if (initData) {
    const authResult = verifyTelegramInitData(initData);
    if (authResult.valid && authResult.user) {
      const tid = String(authResult.user.id);
      let user = db.getUser(tid);
      if (!user) {
        const syncRes = await db.syncOrRegisterUser({
          telegramId: tid,
          username: authResult.user.username,
          firstName: authResult.user.first_name || 'Telegram User',
          lastName: authResult.user.last_name,
          language: authResult.user.language_code?.toLowerCase().startsWith('bn') ? 'bn' : 'en',
        });
        user = syncRes.user;
      }
      (req as any).user = user;
      return next();
    }
  }

  // Fallback for development simulator or client with direct Telegram ID header
  if (directTid) {
    const tid = String(directTid);
    let user = db.getUser(tid);
    if (!user) {
      const syncRes = await db.syncOrRegisterUser({
        telegramId: tid,
        username: 'user',
        firstName: 'Telegram User',
      });
      user = syncRes.user;
    }
    (req as any).user = user;
    return next();
  }

  return res.status(401).json({ success: false, error: 'Authentication required: Missing x-telegram-id or initData' });
}

// 1. SYNC USER (From Mini App or simulator)
apiRouter.post('/user/sync', async (req, res) => {
  try {
    const { telegramId, username, firstName, lastName, languageCode, referredByCode } = req.body || {};
    const initData = req.headers['x-telegram-init-data'] as string;
    const directTid = (req.headers['x-telegram-id'] as string) || telegramId || '613669930';

    let tid = String(directTid);
    let uName = username;
    let fName = firstName;
    let lName = lastName;
    let lang = languageCode;

    if (initData) {
      const verified = verifyTelegramInitData(initData);
      if (verified.valid && verified.user) {
        tid = String(verified.user.id);
        if (verified.user.username) uName = verified.user.username;
        if (verified.user.first_name) fName = verified.user.first_name;
        if (verified.user.last_name) lName = verified.user.last_name;
        if (verified.user.language_code) lang = verified.user.language_code;
      }
    }

    const { user, isNew } = await db.syncOrRegisterUser({
      telegramId: tid,
      username: uName || 'user',
      firstName: fName || 'Telegram User',
      lastName: lName,
      language: lang?.toLowerCase().startsWith('bn') ? 'bn' : 'en',
      referredByCode,
    });

    const settings = db.getSettings();

    return res.json({
      success: true,
      user,
      isNew,
      settings: {
        currencySymbol: settings.currencySymbol,
        currencyCode: settings.currencyCode,
        supportUsername: settings.supportUsername,
        supportChannel: settings.supportChannel,
        botUsername: settings.botUsername,
        referralCommissionPercent: settings.referralCommissionPercent,
        minDepositAmount: settings.minDepositAmount,
        maintenanceMode: settings.maintenanceMode,
      },
    });
  } catch (err: any) {
    console.error('[API /user/sync Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to sync user' });
  }
});

// 2. AUTHENTICATE / SYNC VIA TELEGRAM WEBAPP INIT DATA
apiRouter.post('/auth/telegram-webapp', async (req, res) => {
  try {
    const { initData, startParam } = req.body;

    if (!initData) {
      return res.status(400).json({ success: false, error: 'initData is required' });
    }

    const verification = verifyTelegramInitData(initData);
    if (!verification.valid || !verification.user) {
      return res.status(401).json({ success: false, error: verification.error || 'Authentication signature failed' });
    }

    const tgUser = verification.user;
    const tid = String(tgUser.id);

    // Check if startParam carries referral code (e.g. ref_123456 or REF123456)
    let refCode = startParam;
    if (refCode && refCode.startsWith('ref_')) {
      refCode = refCode.replace('ref_', '');
    }

    // Sync or Register user idempotently without resetting balance!
    const { user, isNew } = await db.syncOrRegisterUser({
      telegramId: tid,
      username: tgUser.username,
      firstName: tgUser.first_name,
      lastName: tgUser.last_name,
      language: tgUser.language_code?.toLowerCase().startsWith('bn') ? 'bn' : 'en',
      referredByCode: refCode,
    });

    const settings = db.getSettings();

    return res.json({
      success: true,
      user,
      isNew,
      isSimulated: Boolean(verification.isSimulated),
      settings: {
        currencySymbol: settings.currencySymbol,
        currencyCode: settings.currencyCode,
        supportUsername: settings.supportUsername,
        supportChannel: settings.supportChannel,
        botUsername: settings.botUsername,
        referralCommissionPercent: settings.referralCommissionPercent,
        minDepositAmount: settings.minDepositAmount,
        maintenanceMode: settings.maintenanceMode,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. GET CURRENT USER PROFILE
apiRouter.get(['/user/me', '/user/profile'], authenticateUser, (req, res) => {
  const user = (req as any).user;
  const current = db.getUser(user.telegramId);
  return res.json({ success: true, user: current || user });
});

// 3. SWITCH LANGUAGE
apiRouter.post('/user/language', authenticateUser, async (req, res) => {
  const user = (req as any).user;
  const { language } = req.body;
  if (language !== 'en' && language !== 'bn') {
    return res.status(400).json({ success: false, error: 'Language must be "en" or "bn"' });
  }
  await db.updateUserLanguage(user.telegramId, language);
  return res.json({ success: true, language });
});

// 4. GET PRODUCTS & CATEGORIES
apiRouter.get('/products', (req, res) => {
  const products = db.getProducts(true);
  const categories = db.getCategories(true);
  const settings = db.getSettings();
  return res.json({ success: true, products, categories, currencySymbol: settings.currencySymbol });
});

// 5. CREATE ORDER (Atomic Wallet Checkout)
apiRouter.post('/orders', authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { productId, quantity } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Product ID is required' });
    }

    const result = await db.createOrder({
      telegramId: user.telegramId,
      productId,
      quantity: Number(quantity) || 1,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    const updatedUser = db.getUser(user.telegramId);
    return res.json({
      success: true,
      order: result.order,
      newBalance: updatedUser?.balance ?? 0,
      message: 'Order placed successfully!',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. GET MY ORDERS
apiRouter.get('/orders', authenticateUser, (req, res) => {
  const user = (req as any).user;
  const raw = db.getRawData();
  const orders = raw.orders
    .filter((o) => o.telegramId === user.telegramId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ success: true, orders });
});

apiRouter.get('/orders/:id/delivery', authenticateUser, (req, res) => {
  const user = (req as any).user;
  const raw = db.getRawData();
  const order = raw.orders.find((o) => o.id === req.params.id && o.telegramId === user.telegramId);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
  const records = db.getDeliveryRecords(order.id);
  return res.json({ success: true, order, deliveryRecord: records[0] });
});

// 7. SUBMIT DEPOSIT
apiRouter.post('/deposits', authenticateUser, async (req, res) => {
  try {
    const user = (req as any).user;
    const { methodId, amount, transactionId, senderNumber } = req.body;

    if (!methodId || !amount || !transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Method, amount, and transaction ID are required',
      });
    }

    const result = await db.submitDeposit({
      telegramId: user.telegramId,
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
      message: 'Deposit request submitted successfully! Pending admin approval.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GET MY DEPOSITS
apiRouter.get('/deposits', authenticateUser, (req, res) => {
  const user = (req as any).user;
  const raw = db.getRawData();
  const deposits = raw.deposits
    .filter((d) => d.telegramId === user.telegramId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ success: true, deposits });
});

// 9. GET MY TRANSACTIONS
apiRouter.get('/transactions', authenticateUser, (req, res) => {
  const user = (req as any).user;
  const raw = db.getRawData();
  const transactions = raw.transactions
    .filter((t) => t.telegramId === user.telegramId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return res.json({ success: true, transactions });
});

// 10. GET REFERRAL DETAILS
apiRouter.get('/referrals', authenticateUser, (req, res) => {
  const user = (req as any).user;
  const raw = db.getRawData();
  const settings = db.getSettings();

  const referredUsers = raw.referrals.filter((r) => r.referrerTelegramId === user.telegramId);
  const commissions = raw.commissions
    .filter((c) => c.referrerTelegramId === user.telegramId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const refLink = `https://t.me/${settings.botUsername}?start=ref_${user.referralCode}`;

  return res.json({
    success: true,
    referralCode: user.referralCode,
    referralLink: refLink,
    commissionRate: settings.referralCommissionPercent,
    totalReferred: referredUsers.length,
    totalCommissionEarned: user.totalCommissionEarned,
    referredUsers,
    commissions,
  });
});

// 11. GET PAYMENT METHODS
apiRouter.get('/payment-methods', (req, res) => {
  const methods = db.getPaymentMethods(true);
  return res.json({ success: true, methods });
});

// 12. GET MESSAGES & SYSTEM ANNOUNCEMENTS
apiRouter.get('/messages', (req, res) => {
  const messages = db.getMessages(true);
  return res.json({ success: true, messages });
});

// 13. GET PUBLIC SETTINGS
apiRouter.get('/settings', (req, res) => {
  const settings = db.getSettings();
  return res.json({
    success: true,
    settings: {
      currencySymbol: settings.currencySymbol,
      currencyCode: settings.currencyCode,
      minDepositAmount: settings.minDepositAmount,
      supportUsername: settings.supportUsername,
      supportChannel: settings.supportChannel,
      botUsername: settings.botUsername,
      maintenanceMode: settings.maintenanceMode,
      referralCommissionPercent: settings.referralCommissionPercent,
      welcomeMessageEn: settings.welcomeMessageEn,
      welcomeMessageBn: settings.welcomeMessageBn,
    },
  });
});
