export type Language = 'en' | 'bn';

export type UserStatus = 'active' | 'banned';
export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  language: Language;
  balance: number;
  status: UserStatus;
  role: UserRole;
  referralCode: string;
  referredBy?: string | null;
  totalDeposited: number;
  totalSpent: number;
  totalCommissionEarned: number;
  createdAt: string;
  lastActiveAt: string;
}

export interface Category {
  id: string;
  nameEn: string;
  nameBn: string;
  icon: string;
  sortOrder: number;
  active: boolean;
}

export type DeliveryType = 'instant' | 'manual' | 'auto';
export type DeliveryMode = 'auto' | 'manual';

export interface DeliveryMediaItem {
  id: string;
  type: 'text' | 'photo' | 'video';
  content: string; // text message, photo URL/file_id, video URL/file_id
  caption?: string;
}

export interface DeliverySlot {
  id: string;
  productId: string;
  slotNumber: number;
  items: DeliveryMediaItem[];
  // Shortcut helper fields for quick editing/display:
  text?: string;
  photoUrl?: string;
  videoUrl?: string;
  status: 'available' | 'reserved' | 'delivered' | 'disabled';
  enabled: boolean;
  orderId?: string | null;
  deliveredToTelegramId?: string | null;
  deliveredAt?: string | null;
  reservedAt?: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryRecord {
  id: string;
  orderId: string;
  telegramId: string;
  productId: string;
  productName: string;
  deliverySlotIds?: string[];
  deliveryMode: DeliveryMode;
  deliveryStatus: 'Delivered' | 'Failed' | 'Pending';
  items: DeliveryMediaItem[];
  deliveryTime: string;
  adminId?: string; // for manual delivery
  telegramMessageIds?: number[];
  error?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  categoryId: string;
  nameEn: string;
  nameBn: string;
  descriptionEn: string;
  descriptionBn: string;
  price: number;
  stock: number; // -1 for unlimited
  imageUrl?: string;
  active: boolean;
  deliveryType: DeliveryType;
  deliveryMode?: DeliveryMode; // 'auto' | 'manual'
  autoDeliveryItems?: string[]; // stock pool of digital keys/accounts (legacy compatibility)
  deliveryFallback?: 'out_of_stock' | 'processing';
  createdAt: string;
  updatedAt: string;
  totalSlotsCount?: number;
  availableSlotsCount?: number;
}

export type OrderStatus = 'Processing' | 'Completed' | 'Cancelled';

export interface Order {
  id: string;
  telegramId: string;
  productId: string;
  productNameEn: string;
  productNameBn: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: OrderStatus;
  deliveryData?: string; // Credentials or delivery info
  deliveryMode?: DeliveryMode;
  deliverySlotIds?: string[];
  deliveredItems?: DeliveryMediaItem[];
  deliveredAt?: string;
  deliveredByAdminId?: string;
  cancelReason?: string;
  refunded?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DepositStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Deposit {
  id: string;
  telegramId: string;
  methodId: string;
  methodName: string;
  amount: number;
  transactionId: string; // Must be unique across all deposits
  senderNumber?: string;
  status: DepositStatus;
  adminNote?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType =
  | 'deposit'
  | 'purchase'
  | 'refund'
  | 'referral_commission'
  | 'admin_adjustment';

export interface Transaction {
  id: string;
  telegramId: string;
  type: TransactionType;
  amount: number; // positive or negative
  previousBalance: number;
  newBalance: number;
  referenceId?: string; // orderId, depositId, etc.
  descriptionEn: string;
  descriptionBn: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerTelegramId: string;
  referredTelegramId: string;
  referredUserName: string;
  totalPurchases: number;
  commissionsGenerated: number;
  createdAt: string;
}

export interface Commission {
  id: string;
  referrerTelegramId: string;
  buyerTelegramId: string;
  orderId: string;
  purchaseAmount: number;
  ratePercent: number;
  amount: number;
  createdAt: string;
}

export type PaymentMethodType = 'bkash' | 'nagad' | 'rocket' | 'upay' | 'crypto_usdt' | 'bank' | 'manual';
export type AccountType = 'Personal' | 'Agent' | 'Merchant';

export interface PaymentMethod {
  id: string;
  nameEn: string;
  nameBn: string;
  type: PaymentMethodType;
  accountNumber: string;
  accountType: AccountType;
  minAmount: number;
  maxAmount: number;
  instructionsEn: string;
  instructionsBn: string;
  qrCodeUrl?: string;
  active: boolean;
}

export interface MessageAnnouncement {
  id: string;
  titleEn: string;
  titleBn: string;
  contentEn: string;
  contentBn: string;
  target: 'all' | 'user';
  targetTelegramId?: string;
  type: 'announcement' | 'warning' | 'promotion' | 'update';
  active: boolean;
  createdAt: string;
}

export interface SystemSettings {
  currencySymbol: string;
  currencyCode: string;
  referralCommissionPercent: number; // default 10
  minDepositAmount: number;
  supportUsername: string;
  supportChannel: string;
  botUsername: string;
  maintenanceMode: boolean;
  welcomeMessageEn: string;
  welcomeMessageBn: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  targetType: string;
  targetId?: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface DatabaseSchema {
  users: User[];
  categories: Category[];
  products: Product[];
  orders: Order[];
  deposits: Deposit[];
  transactions: Transaction[];
  referrals: Referral[];
  commissions: Commission[];
  paymentMethods: PaymentMethod[];
  messages: MessageAnnouncement[];
  settings: SystemSettings;
  auditLogs: AuditLog[];
  deliverySlots: DeliverySlot[];
  deliveryRecords: DeliveryRecord[];
}
