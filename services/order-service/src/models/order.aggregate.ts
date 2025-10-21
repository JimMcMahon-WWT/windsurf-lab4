import { AggregateRoot } from './aggregate.base';
import {
  OrderCreatedEvent,
  OrderConfirmedEvent,
  OrderCancelledEvent,
  OrderCompletedEvent,
  OrderFailedEvent,
  PaymentProcessedEvent,
  PaymentFailedEvent,
  InventoryReservedEvent,
  OrderShippedEvent,
  OrderDeliveredEvent,
  DomainEvent,
} from '../events/base.event';
import {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  OrderItem,
  Address,
  OrderPricing,
  PaymentInfo,
  ShippingInfo,
  CreateOrderRequest,
  OrderData,
} from '../types/order.types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Order Aggregate Root
 * Manages the complete order lifecycle through events
 */
export class OrderAggregate extends AggregateRoot {
  private orderNumber: string = '';
  private userId: string = '';
  private status: OrderStatus = OrderStatus.PENDING;
  private items: OrderItem[] = [];
  private pricing: OrderPricing = {
    subtotal: 0,
    taxAmount: 0,
    shippingAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    currency: 'USD',
  };
  private shippingAddress?: Address;
  private billingAddress?: Address;
  private paymentMethod: string = '';
  private paymentStatus: PaymentStatus = PaymentStatus.PENDING;
  private paymentInfo?: PaymentInfo;
  private fulfillmentStatus: FulfillmentStatus = FulfillmentStatus.PENDING;
  private shippingInfo?: ShippingInfo;
  private notes?: string;
  private createdAt?: Date;
  private updatedAt?: Date;

  constructor(orderId?: string) {
    super(orderId || uuidv4());
  }

  // ============= Command Methods =============

  /**
   * Create a new order
   */
  createOrder(request: CreateOrderRequest, metadata?: any): void {
    // Validate
    if (this.status !== OrderStatus.PENDING || this.items.length > 0) {
      throw new Error('Order already created');
    }

    if (!request.items || request.items.length === 0) {
      throw new Error('Order must have at least one item');
    }

    // Calculate pricing
    const pricing = this.calculatePricing(request.items);

    // Generate order number
    const orderNumber = this.generateOrderNumber();

    // Raise event
    this.raiseEvent(
      new OrderCreatedEvent(
        this.id,
        {
          orderNumber,
          userId: request.userId,
          items: request.items,
          pricing,
          shippingAddress: request.shippingAddress,
          billingAddress: request.billingAddress,
          paymentMethod: request.paymentMethod,
          notes: request.notes,
        },
        metadata
      )
    );
  }

  /**
   * Confirm the order after validation
   */
  confirmOrder(metadata?: any): void {
    if (this.status !== OrderStatus.PENDING && this.status !== OrderStatus.PROCESSING) {
      throw new Error(`Cannot confirm order in status: ${this.status}`);
    }

    this.raiseEvent(
      new OrderConfirmedEvent(
        this.id,
        {
          orderNumber: this.orderNumber,
          confirmedAt: new Date(),
        },
        metadata
      )
    );
  }

  /**
   * Process payment
   */
  processPayment(paymentInfo: PaymentInfo, metadata?: any): void {
    if (this.paymentStatus === PaymentStatus.SUCCEEDED) {
      throw new Error('Payment already processed');
    }

    if (paymentInfo.status === PaymentStatus.SUCCEEDED) {
      this.raiseEvent(
        new PaymentProcessedEvent(
          this.id,
          {
            paymentInfo,
            processedAt: new Date(),
          },
          metadata
        )
      );
    } else {
      this.raiseEvent(
        new PaymentFailedEvent(
          this.id,
          {
            paymentInfo,
            failedAt: new Date(),
          },
          metadata
        )
      );
    }
  }

  /**
   * Reserve inventory for order items
   */
  reserveInventory(reservationData: any, metadata?: any): void {
    if (this.fulfillmentStatus !== FulfillmentStatus.PENDING) {
      throw new Error('Inventory already processed');
    }

    this.raiseEvent(
      new InventoryReservedEvent(
        this.id,
        {
          items: this.items,
          reservationData,
          reservedAt: new Date(),
        },
        metadata
      )
    );
  }

  /**
   * Ship the order
   */
  shipOrder(shippingInfo: ShippingInfo, metadata?: any): void {
    if (this.status !== OrderStatus.PROCESSING) {
      throw new Error(`Cannot ship order in status: ${this.status}`);
    }

    this.raiseEvent(
      new OrderShippedEvent(
        this.id,
        {
          shippingInfo,
          shippedAt: new Date(),
        },
        metadata
      )
    );
  }

  /**
   * Mark order as delivered
   */
  deliverOrder(metadata?: any): void {
    if (this.status !== OrderStatus.SHIPPED) {
      throw new Error(`Cannot deliver order in status: ${this.status}`);
    }

    this.raiseEvent(
      new OrderDeliveredEvent(
        this.id,
        {
          deliveredAt: new Date(),
        },
        metadata
      )
    );
  }

  /**
   * Cancel the order
   */
  cancelOrder(reason: string, metadata?: any): void {
    if (
      this.status === OrderStatus.CANCELLED ||
      this.status === OrderStatus.DELIVERED
    ) {
      throw new Error(`Cannot cancel order in status: ${this.status}`);
    }

    this.raiseEvent(
      new OrderCancelledEvent(
        this.id,
        {
          reason,
          cancelledAt: new Date(),
        },
        metadata
      )
    );
  }

  /**
   * Mark order as failed
   */
  failOrder(reason: string, metadata?: any): void {
    this.raiseEvent(
      new OrderFailedEvent(
        this.id,
        {
          reason,
          failedAt: new Date(),
        },
        metadata
      )
    );
  }

  // ============= Event Handlers =============

  protected onOrderCreated(event: DomainEvent): void {
    this.orderNumber = event.data.orderNumber;
    this.userId = event.data.userId;
    this.items = event.data.items;
    this.pricing = event.data.pricing;
    this.shippingAddress = event.data.shippingAddress;
    this.billingAddress = event.data.billingAddress;
    this.paymentMethod = event.data.paymentMethod;
    this.notes = event.data.notes;
    this.status = OrderStatus.PENDING;
    this.createdAt = event.timestamp;
    this.updatedAt = event.timestamp;
  }

  protected onOrderConfirmed(event: DomainEvent): void {
    this.status = OrderStatus.CONFIRMED;
    this.updatedAt = event.timestamp;
  }

  protected onPaymentProcessed(event: DomainEvent): void {
    this.paymentStatus = PaymentStatus.SUCCEEDED;
    this.paymentInfo = event.data.paymentInfo;
    this.status = OrderStatus.PROCESSING;
    this.updatedAt = event.timestamp;
  }

  protected onPaymentFailed(event: DomainEvent): void {
    this.paymentStatus = PaymentStatus.FAILED;
    this.paymentInfo = event.data.paymentInfo;
    this.status = OrderStatus.PAYMENT_FAILED;
    this.updatedAt = event.timestamp;
  }

  protected onInventoryReserved(event: DomainEvent): void {
    this.fulfillmentStatus = FulfillmentStatus.RESERVED;
    this.updatedAt = event.timestamp;
  }

  protected onOrderShipped(event: DomainEvent): void {
    this.shippingInfo = event.data.shippingInfo;
    this.status = OrderStatus.SHIPPED;
    this.fulfillmentStatus = FulfillmentStatus.SHIPPED;
    this.updatedAt = event.timestamp;
  }

  protected onOrderDelivered(event: DomainEvent): void {
    this.status = OrderStatus.DELIVERED;
    this.fulfillmentStatus = FulfillmentStatus.DELIVERED;
    this.updatedAt = event.timestamp;
  }

  protected onOrderCancelled(event: DomainEvent): void {
    this.status = OrderStatus.CANCELLED;
    this.updatedAt = event.timestamp;
  }

  protected onOrderFailed(event: DomainEvent): void {
    this.status = OrderStatus.FAILED;
    this.updatedAt = event.timestamp;
  }

  // ============= Helper Methods =============

  private calculatePricing(items: OrderItem[]): OrderPricing {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = 0.08; // 8% tax
    const taxAmount = subtotal * taxRate;
    const shippingAmount = subtotal > 100 ? 0 : 10; // Free shipping over $100
    const totalAmount = subtotal + taxAmount + shippingAmount;

    return {
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount: 0,
      totalAmount,
      currency: 'USD',
    };
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  // ============= Snapshot Support =============

  protected createSnapshot(): any {
    return {
      orderNumber: this.orderNumber,
      userId: this.userId,
      status: this.status,
      items: this.items,
      pricing: this.pricing,
      shippingAddress: this.shippingAddress,
      billingAddress: this.billingAddress,
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      paymentInfo: this.paymentInfo,
      fulfillmentStatus: this.fulfillmentStatus,
      shippingInfo: this.shippingInfo,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  protected applySnapshot(snapshotData: any): void {
    this.orderNumber = snapshotData.orderNumber;
    this.userId = snapshotData.userId;
    this.status = snapshotData.status;
    this.items = snapshotData.items;
    this.pricing = snapshotData.pricing;
    this.shippingAddress = snapshotData.shippingAddress;
    this.billingAddress = snapshotData.billingAddress;
    this.paymentMethod = snapshotData.paymentMethod;
    this.paymentStatus = snapshotData.paymentStatus;
    this.paymentInfo = snapshotData.paymentInfo;
    this.fulfillmentStatus = snapshotData.fulfillmentStatus;
    this.shippingInfo = snapshotData.shippingInfo;
    this.notes = snapshotData.notes;
    this.createdAt = snapshotData.createdAt;
    this.updatedAt = snapshotData.updatedAt;
  }

  protected getAggregateType(): string {
    return 'Order';
  }

  // ============= Getters =============

  getOrderData(): OrderData {
    if (!this.shippingAddress || !this.billingAddress) {
      throw new Error('Order addresses not initialized');
    }

    return {
      orderId: this.id,
      orderNumber: this.orderNumber,
      userId: this.userId,
      status: this.status,
      items: this.items,
      pricing: this.pricing,
      shippingAddress: this.shippingAddress,
      billingAddress: this.billingAddress,
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      fulfillmentStatus: this.fulfillmentStatus,
      notes: this.notes,
      createdAt: this.createdAt || new Date(),
      updatedAt: this.updatedAt || new Date(),
    };
  }

  getStatus(): OrderStatus {
    return this.status;
  }

  getPaymentStatus(): PaymentStatus {
    return this.paymentStatus;
  }

  getTotalAmount(): number {
    return this.pricing.totalAmount;
  }
}
