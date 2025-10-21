import { pool } from '../config/database.config';
import { publishEvent, TOPICS } from '../config/kafka.config';
import { OrderAggregate } from '../models/order.aggregate';
import { logger } from '../utils/logger.utils';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

/**
 * SAGA Pattern Implementation for Order Processing
 * Coordinates distributed transactions across multiple services
 */

export enum SagaStatus {
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  COMPENSATING = 'compensating',
  COMPENSATED = 'compensated',
}

export enum SagaStepStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  COMPENSATING = 'compensating',
  COMPENSATED = 'compensated',
}

export interface SagaStep {
  name: string;
  execute: () => Promise<any>;
  compensate: () => Promise<void>;
  onSuccess?: () => Promise<void>;
  onFailure?: (error: Error) => Promise<void>;
}

/**
 * Order Processing SAGA
 * Steps:
 * 1. Validate Order
 * 2. Reserve Inventory
 * 3. Process Payment
 * 4. Confirm Order
 * 5. Schedule Shipping
 */
export class OrderSaga {
  private sagaId: string;
  private orderId: string;
  private order: OrderAggregate;
  private status: SagaStatus;
  private currentStep: number;
  private steps: SagaStep[];
  private stateData: any;
  private completedSteps: string[];

  constructor(order: OrderAggregate) {
    this.sagaId = uuidv4();
    this.orderId = order.getId();
    this.order = order;
    this.status = SagaStatus.STARTED;
    this.currentStep = 0;
    this.completedSteps = [];
    this.stateData = {};

    // Define saga steps
    this.steps = [
      {
        name: 'ValidateOrder',
        execute: () => this.validateOrder(),
        compensate: () => this.compensateValidateOrder(),
      },
      {
        name: 'ReserveInventory',
        execute: () => this.reserveInventory(),
        compensate: () => this.releaseInventory(),
      },
      {
        name: 'ProcessPayment',
        execute: () => this.processPayment(),
        compensate: () => this.refundPayment(),
      },
      {
        name: 'ConfirmOrder',
        execute: () => this.confirmOrder(),
        compensate: () => this.cancelOrder(),
      },
      {
        name: 'ScheduleShipping',
        execute: () => this.scheduleShipping(),
        compensate: () => this.cancelShipping(),
      },
    ];
  }

  /**
   * Execute the SAGA
   */
  async execute(): Promise<void> {
    try {
      await this.createSagaInstance();
      this.status = SagaStatus.IN_PROGRESS;

      for (let i = 0; i < this.steps.length; i++) {
        this.currentStep = i;
        const step = this.steps[i];

        logger.info(`Executing SAGA step: ${step.name} for order ${this.orderId}`);

        try {
          await this.executeStep(step);
          this.completedSteps.push(step.name);
          await this.updateSagaStep(step.name, SagaStepStatus.COMPLETED);
        } catch (error) {
          logger.error(`SAGA step ${step.name} failed:`, error);
          await this.updateSagaStep(step.name, SagaStepStatus.FAILED, error as Error);
          
          // Trigger compensation
          await this.compensate();
          throw error;
        }
      }

      this.status = SagaStatus.COMPLETED;
      await this.completeSaga();
      logger.info(`SAGA completed successfully for order ${this.orderId}`);
    } catch (error) {
      this.status = SagaStatus.FAILED;
      await this.failSaga(error as Error);
      logger.error(`SAGA failed for order ${this.orderId}:`, error);
      throw error;
    }
  }

  /**
   * Compensate - rollback completed steps
   */
  private async compensate(): Promise<void> {
    this.status = SagaStatus.COMPENSATING;
    logger.warn(`Starting compensation for order ${this.orderId}`);

    // Execute compensation in reverse order
    for (let i = this.completedSteps.length - 1; i >= 0; i--) {
      const stepName = this.completedSteps[i];
      const step = this.steps.find(s => s.name === stepName);

      if (step) {
        try {
          logger.info(`Compensating step: ${step.name}`);
          await step.compensate();
          await this.updateSagaStep(step.name, SagaStepStatus.COMPENSATED);
        } catch (error) {
          logger.error(`Compensation failed for step ${step.name}:`, error);
          // Continue with other compensations even if one fails
        }
      }
    }

    this.status = SagaStatus.COMPENSATED;
    await this.updateSagaStatus(SagaStatus.COMPENSATED);
    logger.info(`Compensation completed for order ${this.orderId}`);
  }

  // ============= SAGA Steps =============

  /**
   * Step 1: Validate Order
   */
  private async validateOrder(): Promise<void> {
    const orderData = this.order.getOrderData();

    // Validate items are available (call Product Service)
    const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002';
    
    for (const item of orderData.items) {
      try {
        const response = await axios.get(`${productServiceUrl}/api/v1/products/${item.productId}`);
        const product = response.data;

        if (!product.is_available) {
          throw new Error(`Product ${item.productName} is not available`);
        }

        // Store product info for later use
        this.stateData[`product_${item.productId}`] = product;
      } catch (error: any) {
        throw new Error(`Failed to validate product ${item.productId}: ${error.message}`);
      }
    }

    logger.info(`Order validation completed for ${this.orderId}`);
  }

  private async compensateValidateOrder(): Promise<void> {
    // No compensation needed for validation
    logger.info('No compensation needed for validation');
  }

  /**
   * Step 2: Reserve Inventory
   */
  private async reserveInventory(): Promise<void> {
    const orderData = this.order.getOrderData();
    const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3002';

    const reservations = [];

    for (const item of orderData.items) {
      try {
        const response = await axios.post(`${inventoryServiceUrl}/api/v1/inventory/reserve`, {
          product_id: item.productId,
          quantity: item.quantity,
          order_id: this.orderId,
          reservation_expires_at: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        });

        reservations.push({
          productId: item.productId,
          reservationId: response.data.reservation_id,
        });

        logger.info(`Inventory reserved for product ${item.productId}: ${item.quantity} units`);
      } catch (error: any) {
        throw new Error(`Failed to reserve inventory for ${item.productId}: ${error.message}`);
      }
    }

    this.stateData.inventoryReservations = reservations;

    // Raise domain event
    this.order.reserveInventory({ reservations });
    await this.order.save();

    // Publish event
    await publishEvent(TOPICS.INVENTORY_RESERVED, {
      orderId: this.orderId,
      reservations,
      timestamp: new Date(),
    });
  }

  private async releaseInventory(): Promise<void> {
    const reservations = this.stateData.inventoryReservations || [];
    const inventoryServiceUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3002';

    for (const reservation of reservations) {
      try {
        await axios.post(`${inventoryServiceUrl}/api/v1/inventory/release`, {
          reservation_id: reservation.reservationId,
        });
        logger.info(`Inventory released for reservation ${reservation.reservationId}`);
      } catch (error) {
        logger.error(`Failed to release inventory for ${reservation.reservationId}:`, error);
      }
    }

    // Publish compensation event
    await publishEvent(TOPICS.INVENTORY_RELEASED, {
      orderId: this.orderId,
      reservations,
      timestamp: new Date(),
    });
  }

  /**
   * Step 3: Process Payment
   */
  private async processPayment(): Promise<void> {
    const orderData = this.order.getOrderData();
    
    // Simulate payment processing (replace with actual Stripe integration)
    const paymentIntentId = `pi_${uuidv4().replace(/-/g, '')}`;
    
    // In real implementation, call Stripe API
    const paymentSucceeded = true; // Always succeed for testing

    if (!paymentSucceeded) {
      throw new Error('Payment processing failed');
    }

    const paymentInfo = {
      paymentIntentId,
      amount: orderData.pricing.totalAmount,
      currency: orderData.pricing.currency,
      status: 'succeeded' as any,
      cardLast4: '4242',
      cardBrand: 'visa',
    };

    this.stateData.paymentInfo = paymentInfo;

    // Update order aggregate
    this.order.processPayment(paymentInfo);
    await this.order.save();

    logger.info(`Payment processed for order ${this.orderId}: $${orderData.pricing.totalAmount}`);

    // Publish event
    await publishEvent(TOPICS.PAYMENT_SUCCEEDED, {
      orderId: this.orderId,
      paymentInfo,
      timestamp: new Date(),
    });
  }

  private async refundPayment(): Promise<void> {
    const paymentInfo = this.stateData.paymentInfo;

    if (!paymentInfo) {
      logger.info('No payment to refund');
      return;
    }

    try {
      // In real implementation, call Stripe refund API
      logger.info(`Refunding payment ${paymentInfo.paymentIntentId}`);

      // Publish refund event
      await publishEvent(TOPICS.PAYMENT_REFUNDED, {
        orderId: this.orderId,
        paymentIntentId: paymentInfo.paymentIntentId,
        amount: paymentInfo.amount,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error(`Failed to refund payment:`, error);
    }
  }

  /**
   * Step 4: Confirm Order
   */
  private async confirmOrder(): Promise<void> {
    this.order.confirmOrder();
    await this.order.save();

    logger.info(`Order confirmed: ${this.orderId}`);

    // Publish event
    await publishEvent(TOPICS.ORDER_CONFIRMED, {
      orderId: this.orderId,
      orderNumber: this.order.getOrderData().orderNumber,
      timestamp: new Date(),
    });
  }

  private async cancelOrder(): Promise<void> {
    this.order.cancelOrder('SAGA compensation');
    await this.order.save();

    logger.info(`Order cancelled: ${this.orderId}`);

    await publishEvent(TOPICS.ORDER_CANCELLED, {
      orderId: this.orderId,
      reason: 'SAGA compensation',
      timestamp: new Date(),
    });
  }

  /**
   * Step 5: Schedule Shipping
   */
  private async scheduleShipping(): Promise<void> {
    const orderData = this.order.getOrderData();

    // Create shipping label and schedule pickup
    const shippingInfo = {
      trackingNumber: `TRK${Date.now()}`,
      carrier: 'UPS',
      estimatedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      shippedAt: new Date(),
    };

    this.stateData.shippingInfo = shippingInfo;

    logger.info(`Shipping scheduled for order ${this.orderId}`);

    // Publish event
    await publishEvent(TOPICS.SHIPPING_CONFIRMED, {
      orderId: this.orderId,
      shippingInfo,
      timestamp: new Date(),
    });
  }

  private async cancelShipping(): Promise<void> {
    logger.info(`Cancelling shipping for order ${this.orderId}`);
    // In real implementation, cancel shipping label
  }

  // ============= SAGA Persistence =============

  private async createSagaInstance(): Promise<void> {
    await pool.query(
      `INSERT INTO saga_instances 
       (id, saga_type, aggregate_id, status, current_step, state_data)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        this.sagaId,
        'OrderProcessingSaga',
        this.orderId,
        this.status,
        this.steps[0].name,
        this.stateData,
      ]
    );
  }

  private async updateSagaStatus(status: SagaStatus): Promise<void> {
    await pool.query(
      `UPDATE saga_instances 
       SET status = $1, state_data = $2, updated_at = NOW()
       WHERE id = $3`,
      [status, this.stateData, this.sagaId]
    );
  }

  private async executeStep(step: SagaStep): Promise<void> {
    // Create step record
    await pool.query(
      `INSERT INTO saga_steps 
       (saga_id, step_name, step_order, status, started_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [this.sagaId, step.name, this.currentStep, SagaStepStatus.IN_PROGRESS]
    );

    // Execute the step
    const result = await step.execute();

    // Update step as completed
    await pool.query(
      `UPDATE saga_steps 
       SET status = $1, completed_at = NOW(), response_data = $2
       WHERE saga_id = $3 AND step_name = $4`,
      [SagaStepStatus.COMPLETED, result || {}, this.sagaId, step.name]
    );
  }

  private async updateSagaStep(
    stepName: string,
    status: SagaStepStatus,
    error?: Error
  ): Promise<void> {
    await pool.query(
      `UPDATE saga_steps 
       SET status = $1, error_data = $2
       WHERE saga_id = $3 AND step_name = $4`,
      [
        status,
        error ? { message: error.message, stack: error.stack } : null,
        this.sagaId,
        stepName,
      ]
    );
  }

  private async completeSaga(): Promise<void> {
    await pool.query(
      `UPDATE saga_instances 
       SET status = $1, completed_at = NOW()
       WHERE id = $2`,
      [SagaStatus.COMPLETED, this.sagaId]
    );
  }

  private async failSaga(error: Error): Promise<void> {
    await pool.query(
      `UPDATE saga_instances 
       SET status = $1, state_data = $2
       WHERE id = $3`,
      [
        SagaStatus.FAILED,
        {
          ...this.stateData,
          error: { message: error.message, stack: error.stack },
        },
        this.sagaId,
      ]
    );
  }
}
