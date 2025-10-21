// Order Types and Interfaces

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PAYMENT_PROCESSING = 'payment_processing',
  PAYMENT_FAILED = 'payment_failed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

export enum FulfillmentStatus {
  PENDING = 'pending',
  RESERVED = 'reserved',
  PICKING = 'picking',
  PACKED = 'packed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  RETURNED = 'returned',
}

export interface Address {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface OrderItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderPricing {
  subtotal: number;
  taxAmount: number;
  shippingAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
}

export interface CreateOrderRequest {
  userId: string;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  notes?: string;
}

export interface OrderData {
  orderId: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus;
  items: OrderItem[];
  pricing: OrderPricing;
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInfo {
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  cardLast4?: string;
  cardBrand?: string;
  errorMessage?: string;
}

export interface ShippingInfo {
  trackingNumber: string;
  carrier: string;
  estimatedDeliveryDate: Date;
  shippedAt: Date;
}
