export type Language = 'en' | 'bn';

export interface User {
  id: string;
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
  language: Language;
  balance: number;
  status: 'active' | 'banned';
  role: 'user' | 'admin';
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

export type DeliveryMode = 'auto' | 'manual';

export interface DeliveryMediaItem {
  id: string;
  type: 'text' | 'photo' | 'video';
  content: string; // text message or media URL / file ID
  caption?: string; // caption for photo or video
}

export interface DeliverySlot {
  id: string;
  productId: string;
  slotNumber: number;
  items: DeliveryMediaItem[];
  // Shortcut single-field values for quick editing/display:
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
  stock: number;
  imageUrl?: string;
  active: boolean;
  deliveryType: 'instant' | 'manual';
  deliveryMode?: DeliveryMode; // 'auto' | 'manual'
  autoDeliveryItems?: string[];
  createdAt: string;
  updatedAt: string;
  totalSlotsCount?: number;
  availableSlotsCount?: number;
}

export interface Order {
  id: string;
  telegramId: string;
  productId: string;
  productNameEn: string;
  productNameBn: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  status: 'Processing' | 'Completed' | 'Cancelled';
  deliveryData?: string;
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

export interface Deposit {
  id: string;
  telegramId: string;
  methodId: string;
  methodName: string;
  amount: number;
  transactionId: string;
  senderNumber?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  adminNote?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  telegramId: string;
  type: 'deposit' | 'purchase' | 'refund' | 'referral_commission' | 'admin_adjustment';
  amount: number;
  previousBalance: number;
  newBalance: number;
  referenceId?: string;
  descriptionEn: string;
  descriptionBn: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  nameEn: string;
  nameBn: string;
  type: 'bkash' | 'nagad' | 'rocket' | 'upay' | 'crypto_usdt' | 'bank' | 'manual';
  accountNumber: string;
  accountType: 'Personal' | 'Agent' | 'Merchant';
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
  type: 'announcement' | 'warning' | 'promotion' | 'update';
  active: boolean;
  createdAt: string;
}

export interface SystemSettings {
  currencySymbol: string;
  currencyCode: string;
  referralCommissionPercent: number;
  minDepositAmount: number;
  supportUsername: string;
  supportChannel: string;
  botUsername: string;
  maintenanceMode: boolean;
  welcomeMessageEn: string;
  welcomeMessageBn: string;
}

export type ActiveTab =
  | 'home'
  | 'buy'
  | 'wallet'
  | 'orders'
  | 'referral'
  | 'profile'
  | 'admin';
