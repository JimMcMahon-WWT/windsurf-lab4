import { Request, Response } from 'express';

import { query } from '../config/database.config';
import stripeProvider from '../providers/stripe.provider';
import { logger } from '../utils/logger.utils';

export class WebhookController {
  /**
   * Handle Stripe webhooks
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;

      if (!signature) {
        res.status(400).json({ error: 'Missing signature' });
        return;
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
      const event = stripeProvider.verifyWebhookSignature(req.body, signature, webhookSecret);

      // Store webhook event
      await query(
        `INSERT INTO webhook_events (provider, event_id, event_type, payload, signature, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['stripe', event.id, event.type, JSON.stringify(event.data.object), signature, true]
      );

      // Process webhook based on event type
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        case 'charge.refunded':
          await this.handleRefund(event.data.object);
          break;
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionEvent(event.data.object);
          break;
        default:
          logger.info('Unhandled webhook event type', { type: event.type });
      }

      // Mark as processed
      await query(
        `UPDATE webhook_events SET processed = true, processed_at = NOW() WHERE event_id = $1`,
        [event.id]
      );

      logger.info('Stripe webhook processed', {
        eventId: event.id,
        type: event.type,
      });

      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('Stripe webhook error:', error);

      // Log failed webhook
      await query(
        `INSERT INTO webhook_events (provider, event_type, payload, is_verified, last_error)
         VALUES ($1, $2, $3, $4, $5)`,
        ['stripe', 'unknown', JSON.stringify(req.body), false, error.message]
      );

      res.status(400).json({
        error: 'Webhook error',
        message: error.message,
      });
    }
  }

  /**
   * Handle PayPal webhooks
   */
  async handlePayPalWebhook(req: Request, res: Response): Promise<void> {
    try {
      const event = req.body;

      // Store webhook event
      await query(
        `INSERT INTO webhook_events (provider, event_id, event_type, payload, is_verified)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'paypal',
          event.id,
          event.event_type,
          JSON.stringify(event),
          true, // Should verify signature in production
        ]
      );

      // Process webhook
      switch (event.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePayPalCaptureCompleted(event.resource);
          break;
        case 'PAYMENT.CAPTURE.REFUNDED':
          await this.handlePayPalRefund(event.resource);
          break;
        default:
          logger.info('Unhandled PayPal webhook event', {
            type: event.event_type,
          });
      }

      // Mark as processed
      await query(
        `UPDATE webhook_events SET processed = true, processed_at = NOW() WHERE event_id = $1`,
        [event.id]
      );

      logger.info('PayPal webhook processed', {
        eventId: event.id,
        type: event.event_type,
      });

      res.status(200).json({ received: true });
    } catch (error: any) {
      logger.error('PayPal webhook error:', error);
      res.status(400).json({
        error: 'Webhook error',
        message: error.message,
      });
    }
  }

  private async handlePaymentSuccess(paymentIntent: any): Promise<void> {
    await query(
      `UPDATE payment_transactions
       SET status = $1, captured_at = NOW(), updated_at = NOW()
       WHERE provider_transaction_id = $2`,
      ['succeeded', paymentIntent.id]
    );

    logger.info('Payment succeeded', { paymentIntentId: paymentIntent.id });
  }

  private async handlePaymentFailure(paymentIntent: any): Promise<void> {
    await query(
      `UPDATE payment_transactions
       SET status = $1, failed_at = NOW(), updated_at = NOW()
       WHERE provider_transaction_id = $2`,
      ['failed', paymentIntent.id]
    );

    logger.warn('Payment failed', { paymentIntentId: paymentIntent.id });
  }

  private async handleRefund(charge: any): Promise<void> {
    await query(
      `UPDATE refunds
       SET status = $1, processed_at = NOW(), updated_at = NOW()
       WHERE provider_refund_id = $2`,
      ['succeeded', charge.refunds.data[0]?.id]
    );

    logger.info('Refund processed', { chargeId: charge.id });
  }

  private async handleSubscriptionEvent(subscription: any): Promise<void> {
    await query(
      `UPDATE subscriptions
       SET status = $1, updated_at = NOW()
       WHERE provider_subscription_id = $2`,
      [subscription.status, subscription.id]
    );

    logger.info('Subscription updated', { subscriptionId: subscription.id });
  }

  private async handlePayPalCaptureCompleted(resource: any): Promise<void> {
    await query(
      `UPDATE payment_transactions
       SET status = $1, captured_at = NOW(), updated_at = NOW()
       WHERE provider_transaction_id = $2`,
      ['succeeded', resource.id]
    );

    logger.info('PayPal capture completed', { captureId: resource.id });
  }

  private async handlePayPalRefund(resource: any): Promise<void> {
    await query(
      `UPDATE refunds
       SET status = $1, processed_at = NOW(), updated_at = NOW()
       WHERE provider_refund_id = $2`,
      ['succeeded', resource.id]
    );

    logger.info('PayPal refund completed', { refundId: resource.id });
  }
}

export default new WebhookController();
