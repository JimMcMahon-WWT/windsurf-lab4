// Base Event Types for Event Sourcing

export interface DomainEvent {
  eventId?: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventVersion: number;
  timestamp: Date;
  data: any;
  metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
    [key: string]: any;
  };
}

export abstract class BaseEvent implements DomainEvent {
  public eventId?: string;
  public aggregateId: string;
  public aggregateType: string;
  public eventType: string;
  public eventVersion: number;
  public timestamp: Date;
  public data: any;
  public metadata?: any;

  constructor(
    aggregateId: string,
    aggregateType: string,
    eventType: string,
    data: any,
    metadata?: any
  ) {
    this.aggregateId = aggregateId;
    this.aggregateType = aggregateType;
    this.eventType = eventType;
    this.eventVersion = 1; // Will be set by event store
    this.timestamp = new Date();
    this.data = data;
    this.metadata = metadata || {};
  }
}

// Order Events
export class OrderCreatedEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'OrderCreated', data, metadata);
  }
}

export class OrderConfirmedEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'OrderConfirmed', data, metadata);
  }
}

export class OrderCancelledEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'OrderCancelled', data, metadata);
  }
}

export class OrderCompletedEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'OrderCompleted', data, metadata);
  }
}

export class OrderFailedEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'OrderFailed', data, metadata);
  }
}

// Payment Events
export class PaymentProcessedEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'PaymentProcessed', data, metadata);
  }
}

export class PaymentFailedEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'PaymentFailed', data, metadata);
  }
}

// Inventory Events
export class InventoryReservedEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'InventoryReserved', data, metadata);
  }
}

export class InventoryReleasedEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'InventoryReleased', data, metadata);
  }
}

// Shipping Events
export class ShippingScheduledEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'ShippingScheduled', data, metadata);
  }
}

export class OrderShippedEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'OrderShipped', data, metadata);
  }
}

export class OrderDeliveredEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'OrderDelivered', data, metadata);
  }
}

// Refund Events
export class RefundRequestedEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'RefundRequested', data, metadata);
  }
}

export class RefundProcessedEvent extends BaseEvent {
  constructor(orderId: string, data: any, metadata?: any) {
    super(orderId, 'Order', 'RefundProcessed', data, metadata);
  }
}
