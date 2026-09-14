import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DatabaseSchema,
  User,
  Category,
  Product,
  Order,
  Deposit,
  Transaction,
  Referral,
  Commission,
  PaymentMethod,
  MessageAnnouncement,
  SystemSettings,
  AuditLog,
  DeliverySlot,
  DeliveryRecord,
  DeliveryMediaItem,
  DeliveryMode,
} from './types.ts';
import { sendTelegramOrderDelivery, sendTelegramTextMessage } from './telegramDelivery.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

function ensureDirectories() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

const DEFAULT_SETTINGS: SystemSettings = {
  currencySymbol: '৳',
  currencyCode: 'BDT',
  referralCommissionPercent: 10,
  minDepositAmount: 50,
  supportUsername: 'TelegramSupportAdmin',
  supportChannel: 't.me/OfficialUpdates',
  botUsername: 'OfficialStoreBot',
  maintenanceMode: false,
  welcomeMessageEn: 'Welcome to our Official Store! Top up your wallet and start purchasing premium digital products instantly.',
  welcomeMessageBn: 'আমাদের অফিসিয়াল স্টোরে স্বাগতম! ওয়ালেট টপআপ করুন এবং নিমেষেই প্রিমিয়াম ডিজিটাল পণ্য কিনুন।',
};

const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'cat-telegram',
    nameEn: 'Telegram Services',
    nameBn: 'টেলিগ্রাম সার্ভিসেস',
    icon: 'Send',
    sortOrder: 1,
    active: true,
  },
  {
    id: 'cat-gaming',
    nameEn: 'Gaming Topup',
    nameBn: 'গেমিং টপআপ',
    icon: 'Gamepad2',
    sortOrder: 2,
    active: true,
  },
  {
    id: 'cat-subs',
    nameEn: 'Subscriptions & OTT',
    nameBn: 'সাবস্ক্রিপশন ও ওটিটি',
    icon: 'Tv',
    sortOrder: 3,
    active: true,
  },
  {
    id: 'cat-tools',
    nameEn: 'Software & AI Tools',
    nameBn: 'সফটওয়্যার ও এআই টুলস',
    icon: 'Cpu',
    sortOrder: 4,
    active: true,
  },
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod-tg-prem-3m',
    categoryId: 'cat-telegram',
    nameEn: 'Telegram Premium (3 Months Gift)',
    nameBn: 'টেলিগ্রাম প্রিমিয়াম (৩ মাস গিফট)',
    descriptionEn: 'Official Telegram Premium 3 months subscription gift link activated directly on your handle.',
    descriptionBn: 'অফিসিয়াল টেলিগ্রাম প্রিমিয়াম ৩ মাসের সাবস্ক্রিপশন গিফট লিংক সরাসরি আপনার অ্যাকাউন্টে।',
    price: 1350,
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
    active: true,
    deliveryType: 'instant',
    autoDeliveryItems: [
      'https://t.me/giftcode/TG-PREM-3M-DEMO-A1938274',
      'https://t.me/giftcode/TG-PREM-3M-DEMO-B8827419',
      'https://t.me/giftcode/TG-PREM-3M-DEMO-C3391024',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-tg-stars-100',
    categoryId: 'cat-telegram',
    nameEn: 'Telegram Stars (100 Stars)',
    nameBn: 'টেলিগ্রাম স্টারস (১০০ স্টার)',
    descriptionEn: 'Official Telegram Stars package for bots, mini-apps, and channel gifts.',
    descriptionBn: 'বট, মিনি অ্যাপ এবং চ্যানেল গিফটের জন্য অফিসিয়াল টেলিগ্রাম স্টার প্যাকেজ।',
    price: 240,
    stock: 200,
    imageUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=500&auto=format&fit=crop&q=60',
    active: true,
    deliveryType: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-ff-diamonds-1000',
    categoryId: 'cat-gaming',
    nameEn: 'Free Fire 1000 + 100 Diamonds',
    nameBn: 'ফ্রি ফায়ার ১০০০ + ১০০ ডায়মন্ড',
    descriptionEn: 'UID Direct Top-up within 5-15 minutes.',
    descriptionBn: 'ইউজার আইডি (UID) ডিরেক্ট টপআপ ৫-১৫ মিনিটের মধ্যে সম্পন্ন হবে।',
    price: 850,
    stock: 100,
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=500&auto=format&fit=crop&q=60',
    active: true,
    deliveryType: 'manual',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod-netflix-1m',
    categoryId: 'cat-subs',
    nameEn: 'Netflix 4K UHD 1 Month (Private Profile)',
    nameBn: 'নেটফ্লিক্স ৪কে ইউএইচডি ১ মাস (প্রাইভেট প্রোফাইল)',
    descriptionEn: 'Private PIN-protected profile with 4K Ultra HD streaming on all devices.',
    descriptionBn: 'সকল ডিভাইসে ৪কে আল্ট্রা এইচডি স্ট্রিমিং সহ ব্যক্তিগত পিন-সুরক্ষিত প্রোফাইল।',
    price: 320,
    stock: 35,
    imageUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=60',
    active: true,
    deliveryType: 'instant',
    autoDeliveryItems: [
      'Email: ott_vip01@streammail.com | Pass: StreamPass#992 | Profile: Pin 4410',
      'Email: ott_vip02@streammail.com | Pass: StreamPass#118 | Profile: Pin 8933',
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const DEFAULT_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm-bkash',
    nameEn: 'bKash Send Money',
    nameBn: 'বিকাশ সেন্ড মানি',
    type: 'bkash',
    accountNumber: '01712-345678',
    accountType: 'Personal',
    minAmount: 50,
    maxAmount: 25000,
    instructionsEn: 'Send Money to the bKash personal number above. Enter the Transaction ID (TrxID) and sender number below.',
    instructionsBn: 'উপরের বিকাশ পার্সোনাল নাম্বারে সেন্ড মানি করুন। নিচে ট্রানজেকশন আইডি (TrxID) এবং প্রেরক নাম্বার দিন।',
    active: true,
  },
  {
    id: 'pm-nagad',
    nameEn: 'Nagad Send Money',
    nameBn: 'নগদ সেন্ড মানি',
    type: 'nagad',
    accountNumber: '01898-765432',
    accountType: 'Personal',
    minAmount: 50,
    maxAmount: 25000,
    instructionsEn: 'Send Money to the Nagad personal number above. Enter your 8-character Transaction ID (TxnID) below.',
    instructionsBn: 'উপরের নগদ পার্সোনাল নাম্বারে সেন্ড মানি করুন। নিচে আপনার ট্রানজেকশন আইডি (TxnID) দিন।',
    active: true,
  },
  {
    id: 'pm-usdt',
    nameEn: 'Crypto USDT (TRC-20 / BEP-20)',
    nameBn: 'ক্রিপ্টো ইউএসডিটি (TRC-20 / BEP-20)',
    type: 'crypto_usdt',
    accountNumber: 'TKj98XmP8sLL7q2VwZ10p98KjmnTRC20addr',
    accountType: 'Merchant',
    minAmount: 500,
    maxAmount: 100000,
    instructionsEn: 'Transfer USDT to TRC20 address. 1 USDT = 125 BDT. Paste the TXID / Hash below.',
    instructionsBn: 'টিআরসি২০ এড্রেসে ইউএসডিটি পাঠান। ১ ইউএসডিটি = ১২৫ টাকা। নিচে ট্রানজেকশন হ্যাশ (TXID) দিন।',
    active: true,
  },
];

const DEFAULT_USERS: User[] = [
  {
    id: 'user-sample-01',
    telegramId: '613669930',
    username: 'DemoTrader',
    firstName: 'Mohayminul',
    lastName: 'Islam',
    language: 'bn',
    balance: 1500,
    status: 'active',
    role: 'admin',
    referralCode: 'REF613669',
    referredBy: null,
    totalDeposited: 3000,
    totalSpent: 1500,
    totalCommissionEarned: 135,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  {
    id: 'user-sample-02',
    telegramId: '778899001',
    username: 'rahim_tech',
    firstName: 'Rahim',
    lastName: 'Ahmed',
    language: 'en',
    balance: 450,
    status: 'active',
    role: 'user',
    referralCode: 'REF778899',
    referredBy: '613669930',
    totalDeposited: 800,
    totalSpent: 350,
    totalCommissionEarned: 0,
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
];

const DEFAULT_MESSAGES: MessageAnnouncement[] = [
  {
    id: 'msg-01',
    titleEn: '⚡ Instant Auto Delivery Active',
    titleBn: '⚡ ইন্সট্যান্ট অটো ডেলিভারি চালু আছে',
    contentEn: 'Telegram Premium and OTT subscriptions now deliver immediately upon balance deduction.',
    contentBn: 'টেলিগ্রাম প্রিমিয়াম ও ওটিটি সাবস্ক্রিপশন এখন ব্যালেন্স কাটার সাথে সাথে স্বয়ংক্রিয়ভাবে ডেলিভারি হয়।',
    target: 'all',
    type: 'announcement',
    active: true,
    createdAt: new Date().toISOString(),
  },
];

class DatabaseManager {
  private schema: DatabaseSchema;
  private isWriting = false;
  private writeQueue: (() => void)[] = [];

  constructor() {
    ensureDirectories();
    this.schema = this.loadDatabase();
  }

  private loadDatabase(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        // Ensure all arrays and required structures exist in case schema was upgraded
        const schema: DatabaseSchema = {
          users: parsed.users || [],
          categories: parsed.categories || DEFAULT_CATEGORIES,
          products: parsed.products || DEFAULT_PRODUCTS,
          orders: parsed.orders || [],
          deposits: parsed.deposits || [],
          transactions: parsed.transactions || [],
          referrals: parsed.referrals || [],
          commissions: parsed.commissions || [],
          paymentMethods: parsed.paymentMethods || DEFAULT_PAYMENT_METHODS,
          messages: parsed.messages || DEFAULT_MESSAGES,
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          auditLogs: parsed.auditLogs || [],
          deliverySlots: parsed.deliverySlots || [],
          deliveryRecords: parsed.deliveryRecords || [],
        };

        // Seed initial delivery slots from products if empty
        if (!schema.deliverySlots || schema.deliverySlots.length === 0) {
          schema.deliverySlots = [];
          for (const prod of schema.products) {
            const isAuto = prod.deliveryMode === 'auto' || prod.deliveryType === 'instant';
            if (isAuto && prod.autoDeliveryItems && prod.autoDeliveryItems.length > 0) {
              prod.autoDeliveryItems.forEach((content, idx) => {
                schema.deliverySlots.push({
                  id: `slot-${prod.id}-${idx + 1}`,
                  productId: prod.id,
                  slotNumber: idx + 1,
                  items: [{ id: `item-${prod.id}-${idx + 1}-1`, type: 'text', content }],
                  text: content,
                  status: 'available',
                  enabled: true,
                  sortOrder: idx + 1,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              });
            }
          }
        }
        return schema;
      }
    } catch (err) {
      console.error('Error reading database file, using defaults with backup:', err);
    }

    // Default initial seed
    const initialSchema: DatabaseSchema = {
      users: DEFAULT_USERS,
      categories: DEFAULT_CATEGORIES,
      products: DEFAULT_PRODUCTS,
      orders: [
        {
          id: 'ord-initial-01',
          telegramId: '613669930',
          productId: 'prod-tg-prem-3m',
          productNameEn: 'Telegram Premium (3 Months Gift)',
          productNameBn: 'টেলিগ্রাম প্রিমিয়াম (৩ মাস গিফট)',
          quantity: 1,
          unitPrice: 1350,
          totalAmount: 1350,
          status: 'Completed',
          deliveryData: 'https://t.me/giftcode/TG-PREM-3M-DEMO-A1938274',
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
      ],
      deposits: [
        {
          id: 'dep-initial-01',
          telegramId: '613669930',
          methodId: 'pm-bkash',
          methodName: 'bKash Send Money',
          amount: 2000,
          transactionId: 'BL19283749',
          senderNumber: '01711-000000',
          status: 'Approved',
          adminNote: 'Verified bKash transaction',
          reviewedBy: 'Admin',
          createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        },
      ],
      transactions: [
        {
          id: 'tx-initial-01',
          telegramId: '613669930',
          type: 'deposit',
          amount: 2000,
          previousBalance: 0,
          newBalance: 2000,
          referenceId: 'dep-initial-01',
          descriptionEn: 'Deposit via bKash Send Money (Trx: BL19283749)',
          descriptionBn: 'বিকাশ সেন্ড মানি ডিপোজিট (ট্রানজেকশন: BL19283749)',
          createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        },
        {
          id: 'tx-initial-02',
          telegramId: '613669930',
          type: 'purchase',
          amount: -1350,
          previousBalance: 2000,
          newBalance: 650,
          referenceId: 'ord-initial-01',
          descriptionEn: 'Purchased Telegram Premium (3 Months Gift) x1',
          descriptionBn: 'টেলিগ্রাম প্রিমিয়াম (৩ মাস গিফট) ক্রয় x১',
          createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        },
        {
          id: 'tx-initial-03',
          telegramId: '613669930',
          type: 'deposit',
          amount: 850,
          previousBalance: 650,
          newBalance: 1500,
          referenceId: 'dep-initial-02',
          descriptionEn: 'Deposit via Nagad (Trx: NG88771122)',
          descriptionBn: 'নগদ ডিপোজিট (ট্রানজেকশন: NG88771122)',
          createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
        },
      ],
      referrals: [
        {
          id: 'ref-01',
          referrerTelegramId: '613669930',
          referredTelegramId: '778899001',
          referredUserName: 'Rahim Ahmed',
          totalPurchases: 1350,
          commissionsGenerated: 135,
          createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        },
      ],
      commissions: [
        {
          id: 'comm-01',
          referrerTelegramId: '613669930',
          buyerTelegramId: '778899001',
          orderId: 'ord-ref-demo',
          purchaseAmount: 1350,
          ratePercent: 10,
          amount: 135,
          createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        },
      ],
      paymentMethods: DEFAULT_PAYMENT_METHODS,
      messages: DEFAULT_MESSAGES,
      settings: DEFAULT_SETTINGS,
      auditLogs: [
        {
          id: 'audit-01',
          actor: 'System',
          action: 'INIT_DATABASE',
          targetType: 'SYSTEM',
          details: { message: 'Database initialized with central tables and integrity checks.' },
          timestamp: new Date().toISOString(),
        },
      ],
      deliverySlots: [
        {
          id: 'slot-tg-prem-1',
          productId: 'prod-tg-prem-3m',
          slotNumber: 1,
          items: [
            {
              id: 'item-tg-prem-1',
              type: 'text',
              content: 'https://t.me/giftcode/TG-PREM-3M-DEMO-B8827419',
            },
          ],
          text: 'https://t.me/giftcode/TG-PREM-3M-DEMO-B8827419',
          status: 'available',
          enabled: true,
          sortOrder: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'slot-tg-prem-2',
          productId: 'prod-tg-prem-3m',
          slotNumber: 2,
          items: [
            {
              id: 'item-tg-prem-2',
              type: 'text',
              content: 'https://t.me/giftcode/TG-PREM-3M-DEMO-C3391024',
            },
          ],
          text: 'https://t.me/giftcode/TG-PREM-3M-DEMO-C3391024',
          status: 'available',
          enabled: true,
          sortOrder: 2,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'slot-netflix-1',
          productId: 'prod-netflix-1m',
          slotNumber: 1,
          items: [
            {
              id: 'item-netflix-1',
              type: 'text',
              content: 'Email: ott_vip01@streammail.com | Pass: StreamPass#992 | Profile: Pin 4410',
            },
          ],
          text: 'Email: ott_vip01@streammail.com | Pass: StreamPass#992 | Profile: Pin 4410',
          status: 'available',
          enabled: true,
          sortOrder: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      deliveryRecords: [],
    };

    this.saveDatabaseSync(initialSchema);
    return initialSchema;
  }

  // Atomic write to prevent file corruption
  public saveDatabase(): Promise<void> {
    return new Promise((resolve) => {
      const executeWrite = () => {
        this.isWriting = true;
        try {
          const serialized = JSON.stringify(this.schema, null, 2);
          const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
          fs.writeFileSync(tempFile, serialized, 'utf8');
          fs.renameSync(tempFile, DB_FILE);
        } catch (err) {
          console.error('Error saving database to file:', err);
        } finally {
          this.isWriting = false;
          resolve();
          const next = this.writeQueue.shift();
          if (next) next();
        }
      };

      if (this.isWriting) {
        this.writeQueue.push(executeWrite);
      } else {
        executeWrite();
      }
    });
  }

  private saveDatabaseSync(data: DatabaseSchema) {
    try {
      const serialized = JSON.stringify(data, null, 2);
      const tempFile = `${DB_FILE}.${Date.now()}.tmp`;
      fs.writeFileSync(tempFile, serialized, 'utf8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to write database synchronously:', err);
    }
  }

  // Safe backup snapshot creator
  public createBackup(tag = 'manual'): string {
    ensureDirectories();
    const filename = `backup-${tag}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const backupPath = path.join(BACKUPS_DIR, filename);
    fs.writeFileSync(backupPath, JSON.stringify(this.schema, null, 2), 'utf8');
    this.addAuditLog('System', 'CREATE_BACKUP', 'DATABASE', { filename });
    return filename;
  }

  public listBackups(): string[] {
    ensureDirectories();
    return fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.json')).reverse();
  }

  public getRawData(): DatabaseSchema {
    return this.schema;
  }

  // Audit Logger
  public addAuditLog(actor: string, action: string, targetType: string, details: Record<string, unknown> = {}, targetId?: string) {
    const log: AuditLog = {
      id: `audit-${crypto.randomBytes(6).toString('hex')}`,
      actor,
      action,
      targetType,
      targetId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.schema.auditLogs.unshift(log);
    // Keep max 500 audit logs
    if (this.schema.auditLogs.length > 500) {
      this.schema.auditLogs = this.schema.auditLogs.slice(0, 500);
    }
  }

  // User Management
  public getUser(telegramId: string): User | undefined {
    return this.schema.users.find((u) => String(u.telegramId) === String(telegramId));
  }

  public getUserByReferralCode(code: string): User | undefined {
    if (!code) return undefined;
    const clean = code.trim().toUpperCase();
    return this.schema.users.find((u) => u.referralCode.toUpperCase() === clean);
  }

  /**
   * Idempotent user synchronization for existing bot and Mini App.
   * If the user already exists:
   *   - NEVER resets or modifies their existing balance or history.
   *   - Updates username, name, last active, language if provided.
   * If new user:
   *   - Creates user with initial balance 0, generates referral code, links referrer if provided.
   */
  public async syncOrRegisterUser(params: {
    telegramId: string;
    username?: string;
    firstName: string;
    lastName?: string;
    language?: 'en' | 'bn';
    referredByCode?: string;
  }): Promise<{ user: User; isNew: boolean }> {
    const telegramId = String(params.telegramId);
    let existing = this.getUser(telegramId);

    if (existing) {
      // Update mutable info only, PRESERVE balance & historical data!
      if (params.username) existing.username = params.username;
      if (params.firstName) existing.firstName = params.firstName;
      if (params.lastName !== undefined) existing.lastName = params.lastName;
      if (params.language) existing.language = params.language;
      existing.lastActiveAt = new Date().toISOString();

      await this.saveDatabase();
      return { user: existing, isNew: false };
    }

    // New User Registration
    let referredByTelegramId: string | null = null;
    if (params.referredByCode) {
      const referrer = this.getUserByReferralCode(params.referredByCode);
      if (referrer && String(referrer.telegramId) !== telegramId) {
        referredByTelegramId = referrer.telegramId;
      }
    }

    const newUser: User = {
      id: `usr-${crypto.randomBytes(6).toString('hex')}`,
      telegramId,
      username: params.username,
      firstName: params.firstName || 'Telegram User',
      lastName: params.lastName,
      language: params.language || 'en',
      balance: 0,
      status: 'active',
      role: 'user',
      referralCode: `REF${telegramId.slice(-6).toUpperCase()}`,
      referredBy: referredByTelegramId,
      totalDeposited: 0,
      totalSpent: 0,
      totalCommissionEarned: 0,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };

    this.schema.users.push(newUser);

    if (referredByTelegramId) {
      const refRecord: Referral = {
        id: `ref-${crypto.randomBytes(6).toString('hex')}`,
        referrerTelegramId: referredByTelegramId,
        referredTelegramId: telegramId,
        referredUserName: `${params.firstName} ${params.lastName || ''}`.trim(),
        totalPurchases: 0,
        commissionsGenerated: 0,
        createdAt: new Date().toISOString(),
      };
      this.schema.referrals.push(refRecord);
    }

    this.addAuditLog('Auth', 'REGISTER_USER', 'USER', { telegramId, username: params.username }, newUser.id);
    await this.saveDatabase();
    return { user: newUser, isNew: true };
  }

  public async updateUserLanguage(telegramId: string, language: 'en' | 'bn'): Promise<boolean> {
    const user = this.getUser(telegramId);
    if (!user) return false;
    user.language = language;
    await this.saveDatabase();
    return true;
  }

  public async setUserStatus(telegramId: string, status: 'active' | 'banned', adminId: string): Promise<boolean> {
    const user = this.getUser(telegramId);
    if (!user) return false;
    user.status = status;
    this.addAuditLog(adminId, 'CHANGE_USER_STATUS', 'USER', { telegramId, status }, user.id);
    await this.saveDatabase();
    return true;
  }

  // ATOMIC WALLET BALANCE ENGINE
  /**
   * Modifies a user's wallet balance atomically.
   * Guarantees:
   * - Never allows negative balance
   * - Produces a permanent transaction audit record
   * - Updates user totalDeposited or totalSpent counters
   */
  public async modifyBalance(params: {
    telegramId: string;
    amount: number; // positive for addition, negative for deduction
    type: 'deposit' | 'purchase' | 'refund' | 'referral_commission' | 'admin_adjustment';
    referenceId?: string;
    descriptionEn: string;
    descriptionBn: string;
    actor?: string;
  }): Promise<{ success: boolean; newBalance: number; error?: string; transaction?: Transaction }> {
    const user = this.getUser(params.telegramId);
    if (!user) {
      return { success: false, newBalance: 0, error: 'User not found' };
    }

    if (user.status === 'banned') {
      return { success: false, newBalance: user.balance, error: 'User account is restricted' };
    }

    const previousBalance = user.balance;
    const newBalance = Math.round((previousBalance + params.amount) * 100) / 100;

    if (newBalance < 0) {
      return {
        success: false,
        newBalance: previousBalance,
        error: 'Insufficient wallet balance',
      };
    }

    // Apply new balance
    user.balance = newBalance;

    if (params.type === 'deposit') {
      user.totalDeposited += params.amount;
    } else if (params.type === 'purchase') {
      user.totalSpent += Math.abs(params.amount);
    } else if (params.type === 'referral_commission') {
      user.totalCommissionEarned += params.amount;
    }

    const tx: Transaction = {
      id: `tx-${crypto.randomBytes(8).toString('hex')}`,
      telegramId: params.telegramId,
      type: params.type,
      amount: params.amount,
      previousBalance,
      newBalance,
      referenceId: params.referenceId,
      descriptionEn: params.descriptionEn,
      descriptionBn: params.descriptionBn,
      createdAt: new Date().toISOString(),
    };

    this.schema.transactions.unshift(tx);

    this.addAuditLog(
      params.actor || 'System',
      'MODIFY_BALANCE',
      'WALLET',
      {
        telegramId: params.telegramId,
        type: params.type,
        amount: params.amount,
        previousBalance,
        newBalance,
        referenceId: params.referenceId,
      },
      tx.id
    );

    await this.saveDatabase();
    return { success: true, newBalance, transaction: tx };
  }

  // PRODUCTS & CATEGORIES
  public getProducts(onlyActive = true): Product[] {
    const list = onlyActive ? this.schema.products.filter((p) => p.active) : this.schema.products;
    const slots = this.schema.deliverySlots || [];
    return list.map((p) => {
      const mode = p.deliveryMode || (p.deliveryType === 'instant' ? 'auto' : 'manual');
      const prodSlots = slots.filter((s) => s.productId === p.id);
      const availableCount = prodSlots.filter((s) => s.status === 'available' && s.enabled !== false).length;
      return {
        ...p,
        deliveryMode: mode,
        totalSlotsCount: prodSlots.length,
        availableSlotsCount: availableCount,
      };
    });
  }

  public getProduct(id: string): Product | undefined {
    const p = this.schema.products.find((item) => item.id === id);
    if (!p) return undefined;
    const slots = (this.schema.deliverySlots || []).filter((s) => s.productId === p.id);
    const availableCount = slots.filter((s) => s.status === 'available' && s.enabled !== false).length;
    return {
      ...p,
      deliveryMode: p.deliveryMode || (p.deliveryType === 'instant' ? 'auto' : 'manual'),
      totalSlotsCount: slots.length,
      availableSlotsCount: availableCount,
    };
  }

  public getCategories(onlyActive = true): Category[] {
    if (onlyActive) {
      return this.schema.categories.filter((c) => c.active).sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return this.schema.categories.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  public async saveProduct(product: Partial<Product> & { nameEn: string; price: number; categoryId: string }): Promise<Product> {
    const isEdit = Boolean(product.id);
    let p: Product;

    const deliveryMode: DeliveryMode = product.deliveryMode || (product.deliveryType === 'instant' ? 'auto' : 'manual');
    const deliveryType = deliveryMode === 'auto' ? 'instant' : 'manual';

    if (isEdit && product.id) {
      const existing = this.getProduct(product.id);
      if (!existing) throw new Error('Product not found');
      p = {
        ...existing,
        ...product,
        deliveryMode,
        deliveryType,
        updatedAt: new Date().toISOString(),
      };
      const idx = this.schema.products.findIndex((item) => item.id === product.id);
      this.schema.products[idx] = p;
    } else {
      p = {
        id: `prod-${crypto.randomBytes(6).toString('hex')}`,
        categoryId: product.categoryId,
        nameEn: product.nameEn,
        nameBn: product.nameBn || product.nameEn,
        descriptionEn: product.descriptionEn || '',
        descriptionBn: product.descriptionBn || product.descriptionEn || '',
        price: product.price,
        stock: product.stock ?? -1,
        imageUrl: product.imageUrl,
        active: product.active ?? true,
        deliveryType,
        deliveryMode,
        autoDeliveryItems: product.autoDeliveryItems || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.schema.products.push(p);
    }

    await this.saveDatabase();
    return this.getProduct(p.id)!;
  }

  public async deleteProduct(id: string): Promise<boolean> {
    const idx = this.schema.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.schema.products.splice(idx, 1);
    await this.saveDatabase();
    return true;
  }

  public async saveCategory(cat: Partial<Category> & { nameEn: string }): Promise<Category> {
    let c: Category;
    if (cat.id) {
      const idx = this.schema.categories.findIndex((item) => item.id === cat.id);
      if (idx !== -1) {
        c = { ...this.schema.categories[idx], ...cat };
        this.schema.categories[idx] = c;
      } else {
        throw new Error('Category not found');
      }
    } else {
      c = {
        id: `cat-${crypto.randomBytes(5).toString('hex')}`,
        nameEn: cat.nameEn,
        nameBn: cat.nameBn || cat.nameEn,
        icon: cat.icon || 'Folder',
        sortOrder: cat.sortOrder || this.schema.categories.length + 1,
        active: cat.active ?? true,
      };
      this.schema.categories.push(c);
    }
    await this.saveDatabase();
    return c;
  }

  public async deleteCategory(id: string): Promise<boolean> {
    const idx = this.schema.categories.findIndex((item) => item.id === id);
    if (idx !== -1) {
      this.schema.categories.splice(idx, 1);
      await this.saveDatabase();
      return true;
    }
    return false;
  }

  // ORDERS & ATOMIC PURCHASE
  // ==========================================
  // DELIVERY SLOTS & INVENTORY ENGINE
  // ==========================================
  public getDeliverySlots(productId?: string): DeliverySlot[] {
    if (!this.schema.deliverySlots) this.schema.deliverySlots = [];
    if (productId) {
      return this.schema.deliverySlots
        .filter((s) => s.productId === productId)
        .sort((a, b) => (a.sortOrder ?? a.slotNumber) - (b.sortOrder ?? b.slotNumber));
    }
    return [...this.schema.deliverySlots].sort((a, b) => (a.sortOrder ?? a.slotNumber) - (b.sortOrder ?? b.slotNumber));
  }

  public getAvailableSlots(productId: string): DeliverySlot[] {
    if (!this.schema.deliverySlots) this.schema.deliverySlots = [];
    return this.schema.deliverySlots
      .filter((s) => s.productId === productId && s.status === 'available' && s.enabled !== false)
      .sort((a, b) => (a.sortOrder ?? a.slotNumber) - (b.sortOrder ?? b.slotNumber));
  }

  public getDeliveryStats(productId?: string): {
    total: number;
    available: number;
    reserved: number;
    delivered: number;
    disabled: number;
  } {
    const slots = this.getDeliverySlots(productId);
    return {
      total: slots.length,
      available: slots.filter((s) => s.status === 'available' && s.enabled !== false).length,
      reserved: slots.filter((s) => s.status === 'reserved').length,
      delivered: slots.filter((s) => s.status === 'delivered').length,
      disabled: slots.filter((s) => s.enabled === false).length,
    };
  }

  public async addDeliverySlot(
    productId: string,
    data: {
      items?: DeliveryMediaItem[];
      text?: string;
      photoUrl?: string;
      videoUrl?: string;
      enabled?: boolean;
      actor?: string;
    }
  ): Promise<{ success: boolean; slot?: DeliverySlot; error?: string }> {
    const product = this.getProduct(productId);
    if (!product) return { success: false, error: 'Product not found' };

    if (!this.schema.deliverySlots) this.schema.deliverySlots = [];
    const productSlots = this.schema.deliverySlots.filter((s) => s.productId === productId);
    const nextSlotNum = productSlots.length > 0 ? Math.max(...productSlots.map((s) => s.slotNumber || 0)) + 1 : 1;

    // Normalizing media items
    const items: DeliveryMediaItem[] = data.items && data.items.length > 0 ? [...data.items] : [];
    if (items.length === 0) {
      if (data.text?.trim()) {
        items.push({ id: `item-${Date.now()}-1`, type: 'text', content: data.text.trim() });
      }
      if (data.photoUrl?.trim()) {
        items.push({ id: `item-${Date.now()}-2`, type: 'photo', content: data.photoUrl.trim() });
      }
      if (data.videoUrl?.trim()) {
        items.push({ id: `item-${Date.now()}-3`, type: 'video', content: data.videoUrl.trim() });
      }
    }

    if (items.length === 0) {
      return { success: false, error: 'At least one content item (text, photo, or video) is required for a slot' };
    }

    const newSlot: DeliverySlot = {
      id: `slot-${crypto.randomBytes(6).toString('hex')}`,
      productId,
      slotNumber: nextSlotNum,
      items,
      text: data.text || items.find((i) => i.type === 'text')?.content || '',
      photoUrl: data.photoUrl || items.find((i) => i.type === 'photo')?.content,
      videoUrl: data.videoUrl || items.find((i) => i.type === 'video')?.content,
      status: 'available',
      enabled: data.enabled ?? true,
      sortOrder: nextSlotNum,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.schema.deliverySlots.push(newSlot);
    this.addAuditLog(data.actor || 'Admin', 'ADD_DELIVERY_SLOT', 'DELIVERY_SLOT', {
      productId,
      slotId: newSlot.id,
      itemsCount: items.length,
    });

    await this.saveDatabase();
    return { success: true, slot: newSlot };
  }

  public async updateDeliverySlot(
    slotId: string,
    updates: Partial<DeliverySlot> & { actor?: string }
  ): Promise<{ success: boolean; slot?: DeliverySlot; error?: string }> {
    if (!this.schema.deliverySlots) this.schema.deliverySlots = [];
    const slot = this.schema.deliverySlots.find((s) => s.id === slotId);
    if (!slot) return { success: false, error: 'Slot not found' };

    if (updates.items && updates.items.length > 0) {
      slot.items = updates.items;
      slot.text = updates.text ?? updates.items.find((i) => i.type === 'text')?.content;
      slot.photoUrl = updates.photoUrl ?? updates.items.find((i) => i.type === 'photo')?.content;
      slot.videoUrl = updates.videoUrl ?? updates.items.find((i) => i.type === 'video')?.content;
    } else if (updates.text !== undefined || updates.photoUrl !== undefined || updates.videoUrl !== undefined) {
      const items: DeliveryMediaItem[] = [];
      if (updates.text?.trim()) items.push({ id: `item-${Date.now()}-1`, type: 'text', content: updates.text.trim() });
      if (updates.photoUrl?.trim()) items.push({ id: `item-${Date.now()}-2`, type: 'photo', content: updates.photoUrl.trim() });
      if (updates.videoUrl?.trim()) items.push({ id: `item-${Date.now()}-3`, type: 'video', content: updates.videoUrl.trim() });
      if (items.length > 0) {
        slot.items = items;
        slot.text = updates.text;
        slot.photoUrl = updates.photoUrl;
        slot.videoUrl = updates.videoUrl;
      }
    }

    if (updates.enabled !== undefined) slot.enabled = updates.enabled;
    if (updates.status !== undefined) slot.status = updates.status;
    if (updates.sortOrder !== undefined) slot.sortOrder = updates.sortOrder;
    slot.updatedAt = new Date().toISOString();

    this.addAuditLog(updates.actor || 'Admin', 'UPDATE_DELIVERY_SLOT', 'DELIVERY_SLOT', { slotId, updates });
    await this.saveDatabase();
    return { success: true, slot };
  }

  public async deleteDeliverySlot(slotId: string, actor = 'Admin'): Promise<{ success: boolean; error?: string }> {
    if (!this.schema.deliverySlots) this.schema.deliverySlots = [];
    const idx = this.schema.deliverySlots.findIndex((s) => s.id === slotId);
    if (idx === -1) return { success: false, error: 'Slot not found' };

    const slot = this.schema.deliverySlots[idx];
    this.schema.deliverySlots.splice(idx, 1);
    this.addAuditLog(actor, 'DELETE_DELIVERY_SLOT', 'DELIVERY_SLOT', {
      slotId,
      productId: slot.productId,
      status: slot.status,
    });
    await this.saveDatabase();
    return { success: true };
  }

  public async reorderDeliverySlots(productId: string, slotIds: string[], actor = 'Admin'): Promise<{ success: boolean; error?: string }> {
    if (!this.schema.deliverySlots) this.schema.deliverySlots = [];
    slotIds.forEach((id, index) => {
      const slot = this.schema.deliverySlots.find((s) => s.id === id && s.productId === productId);
      if (slot) {
        slot.sortOrder = index + 1;
        slot.slotNumber = index + 1;
        slot.updatedAt = new Date().toISOString();
      }
    });

    this.addAuditLog(actor, 'REORDER_DELIVERY_SLOTS', 'DELIVERY_SLOT', { productId, total: slotIds.length });
    await this.saveDatabase();
    return { success: true };
  }

  public async toggleSlotEnabled(slotId: string, enabled: boolean, actor = 'Admin'): Promise<{ success: boolean; slot?: DeliverySlot; error?: string }> {
    if (!this.schema.deliverySlots) this.schema.deliverySlots = [];
    const slot = this.schema.deliverySlots.find((s) => s.id === slotId);
    if (!slot) return { success: false, error: 'Slot not found' };

    slot.enabled = enabled;
    slot.updatedAt = new Date().toISOString();
    this.addAuditLog(actor, 'TOGGLE_SLOT_ENABLED', 'DELIVERY_SLOT', { slotId, enabled });
    await this.saveDatabase();
    return { success: true, slot };
  }

  public getDeliveryRecords(orderId?: string): DeliveryRecord[] {
    if (!this.schema.deliveryRecords) this.schema.deliveryRecords = [];
    if (orderId) {
      return this.schema.deliveryRecords.filter((r) => r.orderId === orderId);
    }
    return this.schema.deliveryRecords;
  }

  public async deliverManualOrder(params: {
    orderId: string;
    items: DeliveryMediaItem[];
    adminId: string;
    completeOrder?: boolean;
  }): Promise<{ success: boolean; order?: Order; deliveryRecord?: DeliveryRecord; error?: string }> {
    const order = this.schema.orders.find((o) => o.id === params.orderId);
    if (!order) return { success: false, error: 'Order not found' };
    if (order.status === 'Cancelled') return { success: false, error: 'Cannot deliver a cancelled order' };

    if (!params.items || params.items.length === 0) {
      return { success: false, error: 'At least one delivery item (text, photo, or video) is required' };
    }

    const now = new Date().toISOString();

    // 1. Dispatch directly to user's Telegram chat
    const dispatchRes = await sendTelegramOrderDelivery({
      telegramId: order.telegramId,
      orderId: order.id,
      productName: order.productNameEn,
      items: params.items,
      mode: 'manual',
      adminId: params.adminId,
    }).catch((err) => {
      console.error('[Manual Delivery Telegram Dispatch Error]:', err);
      return { success: true, messageIds: [], errors: [err.message] };
    });

    // 2. Format readable delivery summary
    const formattedSummary = params.items
      .map((i) => {
        if (i.type === 'text') return i.content;
        return `[${i.type.toUpperCase()}] ${i.content}${i.caption ? ` (${i.caption})` : ''}`;
      })
      .join('\n\n');

    // 3. Update Order
    order.deliveredItems = [...(order.deliveredItems || []), ...params.items];
    order.deliveryData = order.deliveryData ? `${order.deliveryData}\n\n---\n\n${formattedSummary}` : formattedSummary;
    order.deliveryMode = 'manual';
    order.deliveredAt = now;
    order.deliveredByAdminId = params.adminId;
    if (params.completeOrder !== false) {
      order.status = 'Completed';
    }
    order.updatedAt = now;

    // 4. Create Delivery Record
    if (!this.schema.deliveryRecords) this.schema.deliveryRecords = [];
    const deliveryRecord: DeliveryRecord = {
      id: `deliv-${crypto.randomBytes(6).toString('hex')}`,
      orderId: order.id,
      telegramId: order.telegramId,
      productId: order.productId,
      productName: order.productNameEn,
      deliveryMode: 'manual',
      deliveryStatus: 'Delivered',
      items: params.items,
      deliveryTime: now,
      adminId: params.adminId,
      telegramMessageIds: dispatchRes.messageIds,
      createdAt: now,
    };
    this.schema.deliveryRecords.unshift(deliveryRecord);

    this.addAuditLog(params.adminId, 'MANUAL_DELIVERY_SENT', 'ORDER', {
      orderId: order.id,
      itemsCount: params.items.length,
      telegramId: order.telegramId,
      completed: order.status === 'Completed',
    });

    await this.saveDatabase();
    return { success: true, order, deliveryRecord };
  }

  // CREATE ORDER WITH ATOMIC AUTO DELIVERY & MANUAL DISPATCH
  public async createOrder(params: {
    telegramId: string;
    productId: string;
    quantity: number;
    customNote?: string;
  }): Promise<{ success: boolean; order?: Order; error?: string }> {
    const user = this.getUser(params.telegramId);
    if (!user) return { success: false, error: 'User not found' };
    if (user.status === 'banned') return { success: false, error: 'Account suspended' };

    const product = this.getProduct(params.productId);
    if (!product || !product.active) return { success: false, error: 'Product is unavailable' };

    const qty = Math.max(1, Math.floor(params.quantity || 1));

    // Determine Delivery Mode
    const deliveryMode: DeliveryMode = product.deliveryMode || (product.deliveryType === 'instant' ? 'auto' : 'manual');

    // AUTO DELIVERY PRE-RESERVATION & ATOMIC LOCKING
    let selectedSlots: DeliverySlot[] = [];
    let autoDeliveredItems: DeliveryMediaItem[] = [];

    if (deliveryMode === 'auto') {
      const availableSlots = this.getAvailableSlots(product.id);
      if (availableSlots.length < qty) {
        return {
          success: false,
          error: `Out of stock: Only ${availableSlots.length} item(s) available in auto delivery inventory (requested ${qty}).`,
        };
      }

      // Atomically select and reserve slots
      selectedSlots = availableSlots.slice(0, qty);
      const now = new Date().toISOString();
      for (const slot of selectedSlots) {
        slot.status = 'reserved';
        slot.reservedAt = now;
        slot.updatedAt = now;
      }
    } else {
      // Manual delivery stock check
      if (product.stock !== -1 && product.stock < qty) {
        return { success: false, error: 'Insufficient product stock' };
      }
    }

    const unitPrice = product.price;
    const totalAmount = unitPrice * qty;

    // Check balance
    if (user.balance < totalAmount) {
      // Release any reserved slots
      if (deliveryMode === 'auto') {
        for (const slot of selectedSlots) {
          slot.status = 'available';
          slot.reservedAt = null;
        }
      }
      return {
        success: false,
        error: `Insufficient balance. Required: ${this.schema.settings.currencySymbol}${totalAmount}, Current: ${this.schema.settings.currencySymbol}${user.balance}`,
      };
    }

    // Atomic Balance Deduction
    const orderId = `ord-${crypto.randomBytes(6).toString('hex')}`;
    const descEn = `Purchase: ${product.nameEn} (x${qty})`;
    const descBn = `ক্রয়: ${product.nameBn} (x${qty})`;

    const deductResult = await this.modifyBalance({
      telegramId: params.telegramId,
      amount: -totalAmount,
      type: 'purchase',
      referenceId: orderId,
      descriptionEn: descEn,
      descriptionBn: descBn,
      actor: `User:${params.telegramId}`,
    });

    if (!deductResult.success) {
      // Rollback reserved slots
      if (deliveryMode === 'auto') {
        for (const slot of selectedSlots) {
          slot.status = 'available';
          slot.reservedAt = null;
        }
      }
      return { success: false, error: deductResult.error };
    }

    const now = new Date().toISOString();
    let order: Order;

    if (deliveryMode === 'auto') {
      // Gather all delivery items from the reserved slots
      for (const slot of selectedSlots) {
        if (slot.items && slot.items.length > 0) {
          autoDeliveredItems.push(...slot.items);
        } else {
          if (slot.text) autoDeliveredItems.push({ id: `item-${slot.id}-txt`, type: 'text', content: slot.text });
          if (slot.photoUrl) autoDeliveredItems.push({ id: `item-${slot.id}-ph`, type: 'photo', content: slot.photoUrl });
          if (slot.videoUrl) autoDeliveredItems.push({ id: `item-${slot.id}-vd`, type: 'video', content: slot.videoUrl });
        }

        // Mark slot as delivered and permanently connect to Order ID and User ID
        slot.status = 'delivered';
        slot.orderId = orderId;
        slot.deliveredToTelegramId = params.telegramId;
        slot.deliveredAt = now;
        slot.updatedAt = now;
      }

      const formattedDelivery = autoDeliveredItems
        .map((i) => (i.type === 'text' ? i.content : `[${i.type.toUpperCase()}] ${i.content}${i.caption ? ` (${i.caption})` : ''}`))
        .join('\n\n');

      order = {
        id: orderId,
        telegramId: params.telegramId,
        productId: product.id,
        productNameEn: product.nameEn,
        productNameBn: product.nameBn,
        quantity: qty,
        unitPrice,
        totalAmount,
        status: 'Completed',
        deliveryMode: 'auto',
        deliverySlotIds: selectedSlots.map((s) => s.id),
        deliveredItems: autoDeliveredItems,
        deliveryData: formattedDelivery,
        deliveredAt: now,
        createdAt: now,
        updatedAt: now,
      };

      // Create permanent Delivery Record
      if (!this.schema.deliveryRecords) this.schema.deliveryRecords = [];
      this.schema.deliveryRecords.unshift({
        id: `deliv-${crypto.randomBytes(6).toString('hex')}`,
        orderId,
        telegramId: params.telegramId,
        productId: product.id,
        productName: product.nameEn,
        deliverySlotIds: selectedSlots.map((s) => s.id),
        deliveryMode: 'auto',
        deliveryStatus: 'Delivered',
        items: autoDeliveredItems,
        deliveryTime: now,
        createdAt: now,
      });

      // Dispatch directly to the buyer's Telegram chat via Telegram Bot API
      sendTelegramOrderDelivery({
        telegramId: params.telegramId,
        orderId,
        productName: product.nameEn,
        items: autoDeliveredItems,
        mode: 'auto',
      }).catch((err) => console.error('[AutoDelivery Telegram Dispatch Error]:', err));
    } else {
      // MANUAL DELIVERY: Create Processing order and notify buyer
      order = {
        id: orderId,
        telegramId: params.telegramId,
        productId: product.id,
        productNameEn: product.nameEn,
        productNameBn: product.nameBn,
        quantity: qty,
        unitPrice,
        totalAmount,
        status: 'Processing',
        deliveryMode: 'manual',
        createdAt: now,
        updatedAt: now,
      };

      // Inform buyer via Telegram
      sendTelegramTextMessage(
        params.telegramId,
        `📦 <b>Order Received: #${orderId}</b>\n\n🛍️ <b>Product:</b> ${product.nameEn} (x${qty})\n💰 <b>Total Paid:</b> ${this.schema.settings.currencySymbol}${totalAmount}\n⏳ <b>Status:</b> Processing (Manual Delivery)\n\n<i>Our staff will prepare your order and deliver your content directly to this chat shortly.</i>`
      ).catch((err) => console.error('[Manual Delivery Notification Error]:', err));
    }

    // Deduct stock if limited
    if (product.stock !== -1) {
      product.stock = Math.max(0, product.stock - qty);
      product.updatedAt = now;
    }

    this.schema.orders.unshift(order);

    // REFERRAL COMMISSION CALCULATION (atomic, no duplicates!)
    await this.processReferralCommission(user, order);

    await this.saveDatabase();
    return { success: true, order };
  }

  private async processReferralCommission(buyer: User, order: Order) {
    if (!buyer.referredBy) return;

    // Check if commission already awarded for this order
    const existingCommission = this.schema.commissions.find((c) => c.orderId === order.id);
    if (existingCommission) return;

    const referrer = this.getUser(buyer.referredBy);
    if (!referrer || referrer.status === 'banned') return;

    const rate = this.schema.settings.referralCommissionPercent || 10;
    const commissionAmount = Math.round(((order.totalAmount * rate) / 100) * 100) / 100;

    if (commissionAmount <= 0) return;

    // Credit referrer wallet atomically
    const commDescEn = `Referral commission (${rate}%) from user @${buyer.username || buyer.telegramId} on Order #${order.id}`;
    const commDescBn = `অর্ডার #${order.id} থেকে রেফারেল কমিশন (${rate}%)`;

    const creditResult = await this.modifyBalance({
      telegramId: referrer.telegramId,
      amount: commissionAmount,
      type: 'referral_commission',
      referenceId: order.id,
      descriptionEn: commDescEn,
      descriptionBn: commDescBn,
      actor: 'ReferralEngine',
    });

    if (creditResult.success) {
      const commRecord: Commission = {
        id: `comm-${crypto.randomBytes(6).toString('hex')}`,
        referrerTelegramId: referrer.telegramId,
        buyerTelegramId: buyer.telegramId,
        orderId: order.id,
        purchaseAmount: order.totalAmount,
        ratePercent: rate,
        amount: commissionAmount,
        createdAt: new Date().toISOString(),
      };
      this.schema.commissions.push(commRecord);

      // Update referral summary table
      const refItem = this.schema.referrals.find(
        (r) => r.referrerTelegramId === referrer.telegramId && r.referredTelegramId === buyer.telegramId
      );
      if (refItem) {
        refItem.totalPurchases += order.totalAmount;
        refItem.commissionsGenerated += commissionAmount;
      }
    }
  }

  public async updateOrderStatus(
    orderId: string,
    status: 'Processing' | 'Completed' | 'Cancelled',
    opts?: { deliveryData?: string; cancelReason?: string; refundToBalance?: boolean; adminId?: string }
  ): Promise<{ success: boolean; order?: Order; error?: string }> {
    const order = this.schema.orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Order not found' };

    const oldStatus = order.status;
    order.status = status;
    order.updatedAt = new Date().toISOString();

    if (opts?.deliveryData) order.deliveryData = opts.deliveryData;
    if (opts?.cancelReason) order.cancelReason = opts.cancelReason;

    // If cancelled and refund requested, refund atomically to user balance
    if (status === 'Cancelled' && opts?.refundToBalance && !order.refunded) {
      const refundResult = await this.modifyBalance({
        telegramId: order.telegramId,
        amount: order.totalAmount,
        type: 'refund',
        referenceId: order.id,
        descriptionEn: `Refund for Cancelled Order #${order.id}`,
        descriptionBn: `বাতিলকৃত অর্ডার #${order.id} এর রিফান্ড`,
        actor: opts.adminId || 'Admin',
      });
      if (refundResult.success) {
        order.refunded = true;
      }
    }

    this.addAuditLog(
      opts?.adminId || 'Admin',
      'UPDATE_ORDER_STATUS',
      'ORDER',
      { orderId, oldStatus, newStatus: status, refunded: order.refunded },
      order.id
    );

    await this.saveDatabase();
    return { success: true, order };
  }

  // DEPOSITS
  public async submitDeposit(params: {
    telegramId: string;
    methodId: string;
    amount: number;
    transactionId: string;
    senderNumber?: string;
  }): Promise<{ success: boolean; deposit?: Deposit; error?: string }> {
    const user = this.getUser(params.telegramId);
    if (!user) return { success: false, error: 'User not found' };
    if (user.status === 'banned') return { success: false, error: 'Account suspended' };

    const method = this.schema.paymentMethods.find((m) => m.id === params.methodId && m.active);
    if (!method) return { success: false, error: 'Payment method is unavailable' };

    const amount = Number(params.amount);
    const min = method.minAmount || this.schema.settings.minDepositAmount || 50;
    if (isNaN(amount) || amount < min) {
      return { success: false, error: `Minimum deposit amount is ${this.schema.settings.currencySymbol}${min}` };
    }

    const cleanTrxId = params.transactionId.trim().toUpperCase();
    if (!cleanTrxId) {
      return { success: false, error: 'Transaction ID is required' };
    }

    // PREVENT DUPLICATE TRANSACTION IDs
    const duplicate = this.schema.deposits.find(
      (d) => d.transactionId.toUpperCase() === cleanTrxId
    );
    if (duplicate) {
      return {
        success: false,
        error: 'This Transaction ID has already been submitted or processed. Duplicate submissions are strictly prevented.',
      };
    }

    const deposit: Deposit = {
      id: `dep-${crypto.randomBytes(6).toString('hex')}`,
      telegramId: params.telegramId,
      methodId: method.id,
      methodName: method.nameEn,
      amount,
      transactionId: cleanTrxId,
      senderNumber: params.senderNumber?.trim(),
      status: 'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.schema.deposits.unshift(deposit);
    this.addAuditLog(`User:${params.telegramId}`, 'SUBMIT_DEPOSIT', 'DEPOSIT', { depositId: deposit.id, amount, transactionId: cleanTrxId });

    await this.saveDatabase();
    return { success: true, deposit };
  }

  public async approveDeposit(depositId: string, adminId = 'Admin', note?: string): Promise<{ success: boolean; deposit?: Deposit; error?: string }> {
    const deposit = this.schema.deposits.find((d) => d.id === depositId);
    if (!deposit) return { success: false, error: 'Deposit not found' };

    if (deposit.status === 'Approved') {
      return { success: false, error: 'Deposit is already approved' };
    }

    deposit.status = 'Approved';
    deposit.reviewedBy = adminId;
    deposit.adminNote = note || 'Verified and approved';
    deposit.updatedAt = new Date().toISOString();

    // ATOMIC WALLET BALANCE CREDIT
    const credit = await this.modifyBalance({
      telegramId: deposit.telegramId,
      amount: deposit.amount,
      type: 'deposit',
      referenceId: deposit.id,
      descriptionEn: `Deposit via ${deposit.methodName} (TrxID: ${deposit.transactionId})`,
      descriptionBn: `${deposit.methodName} এর মাধ্যমে ডিপোজিট (ট্রানজেকশন: ${deposit.transactionId})`,
      actor: adminId,
    });

    if (!credit.success) {
      // Revert status
      deposit.status = 'Pending';
      return { success: false, error: `Failed to credit wallet: ${credit.error}` };
    }

    this.addAuditLog(adminId, 'APPROVE_DEPOSIT', 'DEPOSIT', { depositId, amount: deposit.amount, transactionId: deposit.transactionId });
    await this.saveDatabase();
    return { success: true, deposit };
  }

  public async rejectDeposit(depositId: string, adminId = 'Admin', reason = 'Invalid transaction details'): Promise<{ success: boolean; deposit?: Deposit; error?: string }> {
    const deposit = this.schema.deposits.find((d) => d.id === depositId);
    if (!deposit) return { success: false, error: 'Deposit not found' };

    if (deposit.status === 'Approved') {
      return { success: false, error: 'Cannot reject an already approved deposit' };
    }

    deposit.status = 'Rejected';
    deposit.reviewedBy = adminId;
    deposit.adminNote = reason;
    deposit.updatedAt = new Date().toISOString();

    this.addAuditLog(adminId, 'REJECT_DEPOSIT', 'DEPOSIT', { depositId, reason });
    await this.saveDatabase();
    return { success: true, deposit };
  }

  // PAYMENT METHODS
  public getPaymentMethods(onlyActive = true): PaymentMethod[] {
    if (onlyActive) {
      return this.schema.paymentMethods.filter((m) => m.active);
    }
    return this.schema.paymentMethods;
  }

  public async savePaymentMethod(pm: Partial<PaymentMethod> & { nameEn: string; accountNumber: string; type: any }): Promise<PaymentMethod> {
    let saved: PaymentMethod;
    if (pm.id) {
      const idx = this.schema.paymentMethods.findIndex((item) => item.id === pm.id);
      if (idx !== -1) {
        saved = { ...this.schema.paymentMethods[idx], ...pm };
        this.schema.paymentMethods[idx] = saved;
      } else {
        throw new Error('Payment method not found');
      }
    } else {
      saved = {
        id: `pm-${crypto.randomBytes(5).toString('hex')}`,
        nameEn: pm.nameEn,
        nameBn: pm.nameBn || pm.nameEn,
        type: pm.type || 'bkash',
        accountNumber: pm.accountNumber,
        accountType: pm.accountType || 'Personal',
        minAmount: pm.minAmount || 50,
        maxAmount: pm.maxAmount || 25000,
        instructionsEn: pm.instructionsEn || '',
        instructionsBn: pm.instructionsBn || '',
        qrCodeUrl: pm.qrCodeUrl,
        active: pm.active ?? true,
      };
      this.schema.paymentMethods.push(saved);
    }
    await this.saveDatabase();
    return saved;
  }

  // SETTINGS & BROADCASTS
  public getSettings(): SystemSettings {
    return this.schema.settings;
  }

  public async updateSettings(newSettings: Partial<SystemSettings>, adminId = 'Admin'): Promise<SystemSettings> {
    this.schema.settings = {
      ...this.schema.settings,
      ...newSettings,
    };
    this.addAuditLog(adminId, 'UPDATE_SETTINGS', 'SYSTEM', { updatedKeys: Object.keys(newSettings) });
    await this.saveDatabase();
    return this.schema.settings;
  }

  public getMessages(onlyActive = true): MessageAnnouncement[] {
    if (onlyActive) {
      return this.schema.messages.filter((m) => m.active);
    }
    return this.schema.messages;
  }

  public async saveMessage(msg: Partial<MessageAnnouncement> & { titleEn: string; contentEn: string }): Promise<MessageAnnouncement> {
    let m: MessageAnnouncement;
    if (msg.id) {
      const idx = this.schema.messages.findIndex((item) => item.id === msg.id);
      if (idx !== -1) {
        m = { ...this.schema.messages[idx], ...msg };
        this.schema.messages[idx] = m;
      } else {
        throw new Error('Message not found');
      }
    } else {
      m = {
        id: `msg-${crypto.randomBytes(5).toString('hex')}`,
        titleEn: msg.titleEn,
        titleBn: msg.titleBn || msg.titleEn,
        contentEn: msg.contentEn,
        contentBn: msg.contentBn || msg.contentEn,
        target: msg.target || 'all',
        targetTelegramId: msg.targetTelegramId,
        type: msg.type || 'announcement',
        active: msg.active ?? true,
        createdAt: new Date().toISOString(),
      };
      this.schema.messages.unshift(m);
    }
    await this.saveDatabase();
    return m;
  }

  // DATA MIGRATION & BULK IMPORT
  public async migrateExistingBotData(
    records: {
      users?: Array<{
        telegramId: string | number;
        username?: string;
        firstName?: string;
        balance?: number;
        language?: 'en' | 'bn';
      }>;
      orders?: Array<any>;
      deposits?: Array<any>;
    },
    adminId = 'Admin'
  ): Promise<{
    backupFilename: string;
    usersSynced: number;
    usersPreserved: number;
    errors: string[];
  }> {
    // 1. Create a mandatory backup BEFORE touching anything!
    const backupFilename = this.createBackup('pre-migration');
    const errors: string[] = [];
    let usersSynced = 0;
    let usersPreserved = 0;

    if (records.users && Array.isArray(records.users)) {
      for (const u of records.users) {
        if (!u.telegramId) {
          errors.push('Skipped user entry without telegramId');
          continue;
        }
        const tid = String(u.telegramId);
        const existing = this.getUser(tid);

        if (existing) {
          // IMPORTANT: DO NOT OVERWRITE VALID EXISTING BALANCES!
          // Only update name or username if empty
          if (!existing.username && u.username) existing.username = u.username;
          if (!existing.firstName && u.firstName) existing.firstName = u.firstName;
          usersPreserved++;
        } else {
          // New migrated user
          const newUser: User = {
            id: `usr-mig-${crypto.randomBytes(5).toString('hex')}`,
            telegramId: tid,
            username: u.username,
            firstName: u.firstName || 'Imported Bot User',
            language: u.language || 'bn',
            balance: Math.max(0, Number(u.balance) || 0),
            status: 'active',
            role: 'user',
            referralCode: `REF${tid.slice(-6).toUpperCase()}`,
            referredBy: null,
            totalDeposited: Math.max(0, Number(u.balance) || 0),
            totalSpent: 0,
            totalCommissionEarned: 0,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          };
          this.schema.users.push(newUser);
          usersSynced++;

          // If they came with an existing positive balance, record an initial balance transaction
          if (newUser.balance > 0) {
            this.schema.transactions.push({
              id: `tx-mig-${crypto.randomBytes(6).toString('hex')}`,
              telegramId: tid,
              type: 'deposit',
              amount: newUser.balance,
              previousBalance: 0,
              newBalance: newUser.balance,
              descriptionEn: 'Imported existing bot wallet balance',
              descriptionBn: 'পূর্ববর্তী বট ওয়ালেট ব্যালেন্স ইমপোর্ট',
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    this.addAuditLog(adminId, 'BOT_DATA_MIGRATION', 'MIGRATION', {
      backupFilename,
      usersSynced,
      usersPreserved,
      errorsCount: errors.length,
    });

    await this.saveDatabase();
    return {
      backupFilename,
      usersSynced,
      usersPreserved,
      errors,
    };
  }
}

export const db = new DatabaseManager();
