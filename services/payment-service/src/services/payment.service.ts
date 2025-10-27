import { v4 as uuidv4 } from 'uuid';

import { query, getClient } from '../config/database.config';
import paypalProvider from '../providers/paypal.provider';
import stripeProvider from '../providers/stripe.provider';
import { generateIdempotencyKey, encrypt, decrypt } from '../utils/encryption.utils';
import { logger } from '../utils/logger.utils';

import fraudDetection from './fraud-detection.service';

export interface ProcessPaymentRequest {
  orderId: string;
  userId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  provider: 'stripe' | 'paypal';
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
}

export class PaymentService {
  async processPayment(request: ProcessPaymentRequest): Promise<any> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      const fraudAssessment = await fraudDetection.assessFraudRisk({
        userId: request.userId,
        amount: request.amount,
        currency: request.currency,
        ipAddress: request.ipAddress,
        userAgent: request.userAgent,
        paymentMethodId: request.paymentMethodId,
      });

      if (fraudAssessment.requiresReview) {
        throw new Error('Transaction flagged for review');
      }

      const idempotencyKey = generateIdempotencyKey();

      const transactionResult = await client.query(
        `INSERT INTO payment_transactions (
          order_id, user_id, idempotency_key,
          amount, currency, status, transaction_type, ip_address,
          user_agent, fraud_score, fraud_assessment, requires_3ds, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id`,
        [
          request.orderId,
          request.userId,
          idempotencyKey,
          request.amount,
          request.currency,
          'pending',
          'payment',
          request.ipAddress,
          request.userAgent,
          fraudAssessment.score,
          JSON.stringify(fraudAssessment),
          fraudAssessment.requires3DS,
          JSON.stringify(request.metadata || {}),
        ]
      );

      const transactionId = transactionResult.rows[0].id;

      let paymentResult;
      if (request.provider === 'stripe') {
        paymentResult = await stripeProvider.createPaymentIntent(
          request.amount,
          request.currency,
          { orderId: request.orderId, transactionId },
          undefined,
          request.paymentMethodId
        );
      } else if (request.provider === 'paypal') {
        paymentResult = await paypalProvider.createOrder(
          request.amount,
          request.currency,
          `Order ${request.orderId}`
        );
      } else {
        throw new Error('Unsupported payment provider');
      }

      await client.query(
        `UPDATE payment_transactions
         SET provider_transaction_id = $1, status = $2, provider_response = $3, updated_at = NOW()
         WHERE id = $4`,
        [
          paymentResult.id,
          paymentResult.status,
          JSON.stringify(paymentResult),
          transactionId,
        ]
      );

      await this.logAudit(client, 'transaction', transactionId, 'payment_initiated', request.userId);

      await client.query('COMMIT');

      logger.info('Payment processed successfully', {
        transactionId,
        orderId: request.orderId,
        amount: request.amount,
      });

      return {
        transactionId,
        status: paymentResult.status,
        providerTransactionId: paymentResult.id,
        clientSecret: paymentResult.clientSecret,
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      logger.error('Payment processing failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async capturePayment(transactionId: string, amountToCapture?: number): Promise<any> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'SELECT * FROM payment_transactions WHERE id = $1',
        [transactionId]
      );

      if (result.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      const transaction = result.rows[0];

      const captureResult = await stripeProvider.capturePayment(
        transaction.provider_transaction_id,
        amountToCapture
      );

      await client.query(
        `UPDATE payment_transactions
         SET status = $1, captured_at = NOW(), updated_at = NOW()
         WHERE id = $2`,
        ['captured', transactionId]
      );

      await this.logAudit(client, 'transaction', transactionId, 'payment_captured', 'system');

      await client.query('COMMIT');

      logger.info('Payment captured', { transactionId });

      return captureResult;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Payment capture failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async refundPayment(
    transactionId: string,
    amount: number,
    reason: string,
    initiatedBy: string
  ): Promise<any> {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      const result = await client.query(
        'SELECT * FROM payment_transactions WHERE id = $1',
        [transactionId]
      );

      if (result.rows.length === 0) {
        throw new Error('Transaction not found');
      }

      const transaction = result.rows[0];

      const refundResult = await stripeProvider.createRefund(
        transaction.provider_transaction_id,
        amount,
        reason
      );

      const refundId = await client.query(
        `INSERT INTO refunds (transaction_id, provider_refund_id, amount, currency, reason, status, initiated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          transactionId,
          refundResult.id,
          amount,
          transaction.currency,
          reason,
          refundResult.status,
          initiatedBy,
        ]
      );

      await this.logAudit(client, 'refund', refundId.rows[0].id, 'refund_created', initiatedBy);

      await client.query('COMMIT');

      logger.info('Refund processed', { transactionId, refundId: refundResult.id });

      return refundResult;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Refund failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getTransaction(transactionId: string): Promise<any> {
    const result = await query(
      'SELECT * FROM payment_transactions WHERE id = $1',
      [transactionId]
    );

    if (result.rows.length === 0) {
      throw new Error('Transaction not found');
    }

    return result.rows[0];
  }

  private async logAudit(
    client: any,
    entityType: string,
    entityId: string,
    action: string,
    actorId: string
  ): Promise<void> {
    await client.query(
      `INSERT INTO payment_audit_log (entity_type, entity_id, action, actor_id, actor_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [entityType, entityId, action, actorId, 'system']
    );
  }
}

export default new PaymentService();
