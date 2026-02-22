
export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  costPrice?: number;
  promotionalPrice?: number;
  images: string[];
  category: string;
  categoryId: string;
  stock: number;
  minStock?: number;
  sizes: string[];
  colors: ColorOption[];
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ColorOption {
  name: string;
  hex: string;
  stock?: number;
  images?: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  cpf?: string;
  phone?: string;
  birthDate?: string;
  addresses: Address[];
  role: 'admin' | 'employee' | 'customer';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  resetToken?: string;
  resetTokenExpiry?: string;
}

export interface Address {
  id: string;
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
  isDefault: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  promotionalPrice?: number;
  image: string;
  quantity: number;
  size?: string;
  color?: ColorOption;
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  REFUNDED = 'REFUNDED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  RECEIVED = 'RECEIVED',
  OVERDUE = 'OVERDUE'
}

export enum PaymentMethod {
  PIX = 'PIX',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  BOLETO = 'BOLETO',
  CASH = 'CASH'
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  paymentQrCode?: string;
  paymentLink?: string;
  shippingMethod: ShippingMethod;
  shippingAddress: Address;
  trackingCode?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  asaasPaymentId?: string;
  asaasInvoiceUrl?: string;
  pixQrCode?: string;
  pixExpiration?: string;
  installments?: number;
  cardBrand?: string;
  cardLastDigits?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  type: 'correios' | 'transportadora' | 'motoboy' | 'retirada' | 'personalizado' | 'jadlog' | 'loggi' | 'azul' | 'latam' | 'buslog' | 'other';
  provider?: string;
  cost: number;
  estimatedDays: string;
  isActive: boolean;
  config?: {
    apiKey?: string;
    zipOrigin?: string;
    minOrderValue?: number;
    freeShippingAbove?: number;
    fixedCost?: number;
    regionCosts?: { region: string; cost: number }[];
  };
}

export interface ShippingQuote {
  method: ShippingMethod;
  cost: number;
  estimatedDays: string;
}

export interface StoreConfig {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  contactEmail: string;
  contactPhone?: string;
  address?: Address;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  };
  asaasConfig?: {
    apiKey: string;
    sandbox: boolean;
    webhookSecret?: string;
  };
  melhorEnvioConfig?: {
    apiKey: string;
    sandbox: boolean;
  };
  shippingConfig?: {
    defaultMethod: string;
    freeShippingAbove?: number;
    zipOrigin: string;
  };
  paymentConfig?: {
    pixEnabled: boolean;
    creditCardEnabled: boolean;
    debitCardEnabled: boolean;
    boletoEnabled: boolean;
    maxInstallments: number;
    minInstallmentValue: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  salesToday: number;
  salesThisMonth: number;
  salesLastMonth: number;
  ordersPending: number;
  ordersPaid: number;
  ordersShipped: number;
  topProducts: { productId: string; name: string; totalSold: number; revenue: number }[];
  recentOrders: Order[];
  salesChart: { date: string; value: number }[];
}
