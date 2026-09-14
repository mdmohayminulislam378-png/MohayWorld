import express from 'express';
import crypto from 'crypto';
import { db } from '../db.ts';

export const adminRouter = express.Router();

/**
 * Checks if a Telegram User ID is authorized as an Admin.
 * Uses ADMIN_TELEGRAM_ID env var (defaults to 613669930) and user role in database.
 */
export function isAuthorizedAdmin(telegramId?: string | null): boolean {
  if (!telegramId) return false;
  const tid = String(telegramId).trim();
  const configuredAdminIds = (process.env.ADMIN_TELEGRAM_ID || '613669930')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (configuredAdminIds.includes(tid)) return true;

  const user = db.getUser(tid);
  return user?.role === 'admin';
}

/**
 * Creates an HMAC-signed session token using the server's ADMIN_SECRET_KEY.
 * The ADMIN_SECRET_KEY never leaves the backend.
 */
export function createAdminSessionToken(telegramId: string): string {
  const secret = process.env.ADMIN_SECRET_KEY || 'tg_admin_internal_salt_key_2026';
  const payload = JSON.stringify({
    telegramId: String(telegramId),
    role: 'admin',
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

/**
 * Validates the HMAC-signed session token against the backend's ADMIN_SECRET_KEY.
 */
export function verifyAdminSessionToken(token: string): { valid: boolean; telegramId?: string } {
  if (!token || !token.includes('.')) return { valid: false };
  const secret = process.env.ADMIN_SECRET_KEY || 'tg_admin_internal_salt_key_2026';
  const [b64, sig] = token.split('.');
  const expectedSig = crypto.createHmac('sha256', secret).update(b64).digest('base64url');
  if (sig !== expectedSig) return { valid: false };

  try {
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return { valid: false };
    if (!isAuthorizedAdmin(payload.telegramId)) return { valid: false };
    return { valid: true, telegramId: payload.telegramId };
  } catch {
    return { valid: false };
  }
}

// PUBLIC ADMIN AUTH CHECK & SESSION ISSUER (BEFORE requireAdminAuth)
adminRouter.post('/auth', (req, res) => {
  const telegramId = (req.body?.telegramId || req.headers['x-telegram-id']) as string;
  const directSecret = req.headers['x-admin-key'] as string;
  const serverAdminSecret = process.env.ADMIN_SECRET_KEY;

  // Direct secret key check for automated scripts/curl
  if (serverAdminSecret && directSecret && directSecret === serverAdminSecret) {
    const defaultAdminId = process.env.ADMIN_TELEGRAM_ID || '613669930';
    const token = createAdminSessionToken(defaultAdminId);
    return res.json({
      success: true,
      authorized: true,
      adminToken: token,
      adminId: defaultAdminId,
      user: { telegramId: defaultAdminId, role: 'admin', firstName: 'Admin' },
    });
  }

  if (!telegramId || !isAuthorizedAdmin(telegramId)) {
    return res.status(403).json({
      success: false,
      authorized: false,
      error: 'Access Denied: Telegram User ID is not authorized as an Admin for this store.',
      providedId: telegramId || 'anonymous',
    });
  }

  const token = createAdminSessionToken(telegramId);
  const user = db.getUser(telegramId);

  return res.json({
    success: true,
    authorized: true,
    adminToken: token,
    adminId: telegramId,
    user: user
      ? {
          telegramId: user.telegramId,
          firstName: user.firstName,
          username: user.username,
          role: user.role,
        }
      : { telegramId, role: 'admin', firstName: 'Admin' },
  });
});

// Middleware: Strict Server-Side Admin Authorization on every subsequent Admin API call
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const serverAdminSecret = process.env.ADMIN_SECRET_KEY;
  const adminKey = req.headers['x-admin-key'] as string;
  const adminToken =
    (req.headers['x-admin-token'] as string) ||
    (req.headers['authorization']?.replace(/^Bearer\s+/i, ''));
  const telegramId = (req.headers['x-telegram-id'] as string) || '';

  // 1. Direct server secret key check (for bot/curl/backend integrations)
  if (serverAdminSecret && adminKey && adminKey === serverAdminSecret) {
    return next();
  }

  // 2. HMAC session token verified against backend ADMIN_SECRET_KEY
  if (adminToken) {
    const tokenRes = verifyAdminSessionToken(adminToken);
    if (tokenRes.valid) {
      if (telegramId && String(telegramId) !== String(tokenRes.telegramId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: Telegram ID does not match the active admin session',
        });
      }
      return next();
    }
  }

  // 3. Telegram Admin User ID direct verification (Primary Admin Identity)
  if (telegramId && isAuthorizedAdmin(telegramId)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Access denied: Valid Telegram Admin authorization required',
    providedTelegramId: telegramId || 'none',
  });
}

adminRouter.use(requireAdminAuth);

// Admin key verification endpoint
adminRouter.get('/verify', (req, res) => {
  return res.json({ success: true, authorized: true });
});

// 1. DASHBOARD STATISTICS
adminRouter.get('/stats', (req, res) => {
  const raw = db.getRawData();

  const totalUsers = raw.users.length;
  const activeUsers = raw.users.filter((u) => u.status === 'active').length;
  const totalBalanceInWallets = raw.users.reduce((sum, u) => sum + u.balance, 0);

  const approvedDeposits = raw.deposits.filter((d) => d.status === 'Approved');
  const pendingDeposits = raw.deposits.filter((d) => d.status === 'Pending');
  const totalDepositedAmount = approvedDeposits.reduce((sum, d) => sum + d.amount, 0);

  const completedOrders = raw.orders.filter((o) => o.status === 'Completed');
  const processingOrders = raw.orders.filter((o) => o.status === 'Processing');
  const totalSalesRevenue = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const totalCommissionsPaid = raw.commissions.reduce((sum, c) => sum + c.amount, 0);

  return res.json({
    success: true,
    stats: {
      totalUsers,
      activeUsers,
      totalBalanceInWallets,
      totalDepositedAmount,
      approvedDepositsCount: approvedDeposits.length,
      pendingDepositsCount: pendingDeposits.length,
      completedOrdersCount: completedOrders.length,
      processingOrdersCount: processingOrders.length,
      totalSalesRevenue,
      totalCommissionsPaid,
      totalProducts: raw.products.length,
    },
    recentAuditLogs: raw.auditLogs.slice(0, 15),
  });
});

// 2. USERS MANAGEMENT
adminRouter.get('/users', (req, res) => {
  const raw = db.getRawData();
  const search = (req.query.q as string || '').toLowerCase();
  let users = raw.users;

  if (search) {
    users = users.filter(
      (u) =>
        u.telegramId.includes(search) ||
        (u.username && u.username.toLowerCase().includes(search)) ||
        u.firstName.toLowerCase().includes(search) ||
        u.referralCode.toLowerCase().includes(search)
    );
  }

  return res.json({ success: true, users });
});

// Direct Balance Adjustment with mandatory reason
adminRouter.post('/users/:telegramId/balance', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { amount, reason, adminName } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      return res.status(400).json({ success: false, error: 'Valid non-zero amount is required' });
    }

    if (!reason) {
      return res.status(400).json({ success: false, error: 'Reason for balance adjustment is required for audit' });
    }

    const descEn = `Admin adjustment: ${reason} (${numAmount > 0 ? '+' : ''}${numAmount})`;
    const descBn = `এডমিন এডজাস্টমেন্ট: ${reason} (${numAmount > 0 ? '+' : ''}${numAmount})`;

    const result = await db.modifyBalance({
      telegramId,
      amount: numAmount,
      type: 'admin_adjustment',
      descriptionEn: descEn,
      descriptionBn: descBn,
      actor: adminName || 'Admin',
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({ success: true, newBalance: result.newBalance, transaction: result.transaction });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/users/:telegramId/status', async (req, res) => {
  try {
    const { telegramId } = req.params;
    const { status, adminName } = req.body;

    if (status !== 'active' && status !== 'banned') {
      return res.status(400).json({ success: false, error: 'Status must be active or banned' });
    }

    const ok = await db.setUserStatus(telegramId, status, adminName || 'Admin');
    return res.json({ success: ok });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. PRODUCTS & CATEGORIES
adminRouter.get('/products', (req, res) => {
  return res.json({ success: true, products: db.getProducts(false) });
});

adminRouter.post('/products', async (req, res) => {
  try {
    const product = await db.saveProduct(req.body);
    return res.json({ success: true, product });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

adminRouter.delete('/products/:id', async (req, res) => {
  const ok = await db.deleteProduct(req.params.id);
  return res.json({ success: ok });
});

// DELIVERY INVENTORY SLOTS MANAGEMENT
adminRouter.get('/products/:id/slots', (req, res) => {
  const slots = db.getDeliverySlots(req.params.id);
  const stats = db.getDeliveryStats(req.params.id);
  return res.json({ success: true, slots, stats });
});

adminRouter.post('/products/:id/slots', async (req, res) => {
  try {
    const adminId = (req as any).adminTelegramId || req.headers['x-telegram-id'] || 'Admin';
    const result = await db.addDeliverySlot(req.params.id, {
      ...req.body,
      actor: String(adminId),
    });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    const stats = db.getDeliveryStats(req.params.id);
    return res.json({ success: true, slot: result.slot, stats });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.put('/slots/:id', async (req, res) => {
  try {
    const adminId = (req as any).adminTelegramId || req.headers['x-telegram-id'] || 'Admin';
    const result = await db.updateDeliverySlot(req.params.id, {
      ...req.body,
      actor: String(adminId),
    });
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.json({ success: true, slot: result.slot });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.delete('/slots/:id', async (req, res) => {
  try {
    const adminId = (req as any).adminTelegramId || req.headers['x-telegram-id'] || 'Admin';
    const result = await db.deleteDeliverySlot(req.params.id, String(adminId));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/products/:id/slots/reorder', async (req, res) => {
  try {
    const { slotIds } = req.body;
    if (!Array.isArray(slotIds)) {
      return res.status(400).json({ success: false, error: 'slotIds array is required' });
    }
    const adminId = (req as any).adminTelegramId || req.headers['x-telegram-id'] || 'Admin';
    const result = await db.reorderDeliverySlots(req.params.id, slotIds, String(adminId));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/slots/:id/toggle', async (req, res) => {
  try {
    const { enabled } = req.body;
    const adminId = (req as any).adminTelegramId || req.headers['x-telegram-id'] || 'Admin';
    const result = await db.toggleSlotEnabled(req.params.id, Boolean(enabled), String(adminId));
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.get('/products/:id/delivery-stats', (req, res) => {
  const stats = db.getDeliveryStats(req.params.id);
  return res.json({ success: true, stats });
});

adminRouter.get('/delivery/slots', (req, res) => {
  const productId = req.query.productId as string;
  const slots = db.getDeliverySlots(productId);
  const stats = db.getDeliveryStats(productId);
  return res.json({ success: true, slots, stats });
});

adminRouter.get('/deliveries', (req, res) => {
  const records = db.getDeliveryRecords();
  return res.json({ success: true, deliveryRecords: records });
});

adminRouter.get('/categories', (req, res) => {
  return res.json({ success: true, categories: db.getCategories(false) });
});

adminRouter.post('/categories', async (req, res) => {
  try {
    const category = await db.saveCategory(req.body);
    return res.json({ success: true, category });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

adminRouter.delete('/categories/:id', async (req, res) => {
  const ok = await db.deleteCategory(req.params.id);
  return res.json({ success: ok });
});

// Quick Batch Price Update for Prices section
adminRouter.post('/products/batch-prices', async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'updates array is required' });
    }

    const updated: any[] = [];
    for (const item of updates) {
      if (item.id && typeof item.price === 'number') {
        const existing = db.getProduct(item.id);
        if (existing) {
          const saved = await db.saveProduct({
            ...existing,
            price: item.price,
            ...(item.originalPrice !== undefined ? { originalPrice: item.originalPrice } : {}),
          });
          updated.push(saved);
        }
      }
    }
    return res.json({ success: true, products: updated, count: updated.length });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. ORDERS MANAGEMENT
adminRouter.get('/orders', (req, res) => {
  const raw = db.getRawData();
  const status = req.query.status as string;
  let orders = raw.orders;
  if (status) {
    orders = orders.filter((o) => o.status.toLowerCase() === status.toLowerCase());
  }
  return res.json({ success: true, orders });
});

adminRouter.post('/orders/:id/status', async (req, res) => {
  try {
    const { status, deliveryData, cancelReason, refundToBalance, adminName } = req.body;
    const result = await db.updateOrderStatus(req.params.id, status, {
      deliveryData,
      cancelReason,
      refundToBalance: Boolean(refundToBalance),
      adminId: adminName || 'Admin',
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({ success: true, order: result.order });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// MANUAL DELIVERY EXECUTION
adminRouter.post('/orders/:id/deliver', async (req, res) => {
  try {
    const { items, completeOrder, text, photoUrl, videoUrl } = req.body;
    const adminId = (req as any).adminTelegramId || req.headers['x-telegram-id'] || 'Admin';

    let deliveryItems = Array.isArray(items) ? [...items] : [];
    if (deliveryItems.length === 0) {
      if (text?.trim()) deliveryItems.push({ id: `item-${Date.now()}-txt`, type: 'text', content: text.trim() });
      if (photoUrl?.trim()) deliveryItems.push({ id: `item-${Date.now()}-ph`, type: 'photo', content: photoUrl.trim() });
      if (videoUrl?.trim()) deliveryItems.push({ id: `item-${Date.now()}-vd`, type: 'video', content: videoUrl.trim() });
    }

    if (deliveryItems.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one content item (text, photo, or video) is required for delivery' });
    }

    const result = await db.deliverManualOrder({
      orderId: req.params.id,
      items: deliveryItems,
      adminId: String(adminId),
      completeOrder: completeOrder !== false,
    });

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    return res.json({
      success: true,
      order: result.order,
      deliveryRecord: result.deliveryRecord,
      message: 'Delivery sent directly to buyer Telegram chat and marked as completed.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.get('/orders/:id/delivery', (req, res) => {
  const records = db.getDeliveryRecords(req.params.id);
  return res.json({ success: true, deliveryRecords: records, latest: records[0] });
});

// 5. DEPOSITS MANAGEMENT
adminRouter.get('/deposits', (req, res) => {
  const raw = db.getRawData();
  const status = req.query.status as string;
  let deposits = raw.deposits;
  if (status) {
    deposits = deposits.filter((d) => d.status.toLowerCase() === status.toLowerCase());
  }
  return res.json({ success: true, deposits });
});

adminRouter.post('/deposits/:id/approve', async (req, res) => {
  try {
    const { adminName, note } = req.body;
    const result = await db.approveDeposit(req.params.id, adminName || 'Admin', note);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.json({ success: true, deposit: result.deposit, message: 'Deposit approved and balance credited atomically!' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

adminRouter.post('/deposits/:id/reject', async (req, res) => {
  try {
    const { adminName, reason } = req.body;
    const result = await db.rejectDeposit(req.params.id, adminName || 'Admin', reason);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }
    return res.json({ success: true, deposit: result.deposit });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 6. PAYMENT METHODS
adminRouter.get('/payment-methods', (req, res) => {
  return res.json({ success: true, methods: db.getPaymentMethods(false) });
});

adminRouter.post('/payment-methods', async (req, res) => {
  try {
    const saved = await db.savePaymentMethod(req.body);
    return res.json({ success: true, method: saved });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 7. SETTINGS
adminRouter.get('/settings', (req, res) => {
  return res.json({ success: true, settings: db.getSettings() });
});

adminRouter.post('/settings', async (req, res) => {
  try {
    const { settings, adminName } = req.body;
    const updated = await db.updateSettings(settings, adminName || 'Admin');
    return res.json({ success: true, settings: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 8. MESSAGES / ANNOUNCEMENTS
adminRouter.get('/messages', (req, res) => {
  return res.json({ success: true, messages: db.getMessages(false) });
});

adminRouter.post('/messages', async (req, res) => {
  try {
    const msg = await db.saveMessage(req.body);
    return res.json({ success: true, message: msg });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

// 9. REFERRALS & COMMISSIONS
adminRouter.get('/referrals', (req, res) => {
  const raw = db.getRawData();
  return res.json({
    success: true,
    referrals: raw.referrals,
    commissions: raw.commissions,
    commissionPercent: raw.settings.referralCommissionPercent,
  });
});

// 10. BACKUPS & DATA MIGRATION
adminRouter.post('/backup', (req, res) => {
  const filename = db.createBackup('manual-admin');
  return res.json({ success: true, filename });
});

adminRouter.get('/backups', (req, res) => {
  const backups = db.listBackups();
  return res.json({ success: true, backups });
});

adminRouter.post('/migrate-bot', async (req, res) => {
  try {
    const { users, orders, deposits, adminName } = req.body;
    const result = await db.migrateExistingBotData({ users, orders, deposits }, adminName || 'Admin');
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 11. AUDIT LOGS ENDPOINT
adminRouter.get('/audit-logs', (req, res) => {
  const raw = db.getRawData();
  const action = (req.query.action as string || '').toUpperCase();
  const search = (req.query.q as string || '').toLowerCase();
  let logs = raw.auditLogs;

  if (action && action !== 'ALL') {
    logs = logs.filter((l) => l.action.toUpperCase() === action);
  }

  if (search) {
    logs = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(search) ||
        l.actor.toLowerCase().includes(search) ||
        l.targetType.toLowerCase().includes(search) ||
        JSON.stringify(l.details || {}).toLowerCase().includes(search)
    );
  }

  return res.json({
    success: true,
    logs: logs.slice(0, 200),
    totalCount: logs.length,
  });
});
