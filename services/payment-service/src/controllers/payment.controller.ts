import { Request, Response } from 'express';

import paymentService from '../services/payment.service';
import { logger } from '../utils/logger.utils';

export class PaymentController {
  /**
   * Process a payment
   */
  async processPayment(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, amount, currency, paymentMethodId, provider, metadata } = req.body;

      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const ipAddress = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await paymentService.processPayment({
        orderId,
        userId,
        amount,
        currency: currency || 'USD',
        paymentMethodId,
        provider: provider || 'stripe',
        ipAddress,
        userAgent,
        metadata,
      });

      logger.info(`POST /api/v1/payments - Payment processed`, {
        transactionId: result.transactionId,
      });

      res.status(200).json({
        success: true,
        transaction: result,
      });
    } catch (error: any) {
      logger.error('Error processing payment:', error);
      res.status(500).json({
        error: 'Payment processing failed',
        message: error.message,
      });
    }
  }

  /**
   * Capture an authorized payment
   */
  async capturePayment(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      const { amount } = req.body;

      const result = await paymentService.capturePayment(transactionId, amount);

      logger.info(`POST /api/v1/payments/${transactionId}/capture`);

      res.status(200).json({
        success: true,
        capture: result,
      });
    } catch (error: any) {
      logger.error('Error capturing payment:', error);
      res.status(500).json({
        error: 'Payment capture failed',
        message: error.message,
      });
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      const { amount, reason } = req.body;

      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const result = await paymentService.refundPayment(transactionId, amount, reason, userId);

      logger.info(`POST /api/v1/payments/${transactionId}/refund`);

      res.status(200).json({
        success: true,
        refund: result,
      });
    } catch (error: any) {
      logger.error('Error refunding payment:', error);
      res.status(500).json({
        error: 'Refund failed',
        message: error.message,
      });
    }
  }

  /**
   * Get payment transaction details
   */
  async getTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;

      const result = await paymentService.getTransaction(transactionId);

      logger.info(`GET /api/v1/payments/${transactionId}`);

      res.status(200).json({
        success: true,
        transaction: result,
      });
    } catch (error: any) {
      logger.error('Error fetching transaction:', error);
      res.status(404).json({
        error: 'Transaction not found',
        message: error.message,
      });
    }
  }
}

export default new PaymentController();
