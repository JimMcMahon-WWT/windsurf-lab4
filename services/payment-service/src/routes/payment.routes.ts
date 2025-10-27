import { Router } from 'express';
import { body, param } from 'express-validator';

import paymentController from '../controllers/payment.controller';
import webhookController from '../controllers/webhook.controller';
import { validate } from '../middleware/validation.middleware';

const router = Router();

/**
 * Payment routes
 */
router.post(
  '/payments',
  [
    body('orderId').isUUID().withMessage('Valid order ID required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
    body('currency').optional().isLength({ min: 3, max: 3 }).withMessage('Valid currency code required'),
    body('paymentMethodId').notEmpty().withMessage('Payment method ID required'),
    body('provider').isIn(['stripe', 'paypal']).withMessage('Valid provider required'),
    validate,
  ],
  paymentController.processPayment.bind(paymentController)
);

router.post(
  '/payments/:transactionId/capture',
  [
    param('transactionId').isUUID().withMessage('Valid transaction ID required'),
    body('amount').optional().isFloat({ min: 0.01 }).withMessage('Valid amount required'),
    validate,
  ],
  paymentController.capturePayment.bind(paymentController)
);

router.post(
  '/payments/:transactionId/refund',
  [
    param('transactionId').isUUID().withMessage('Valid transaction ID required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount required'),
    body('reason').notEmpty().withMessage('Refund reason required'),
    validate,
  ],
  paymentController.refundPayment.bind(paymentController)
);

router.get(
  '/payments/:transactionId',
  [
    param('transactionId').isUUID().withMessage('Valid transaction ID required'),
    validate,
  ],
  paymentController.getTransaction.bind(paymentController)
);

/**
 * Webhook routes (no authentication/validation on webhooks)
 */
router.post(
  '/webhooks/stripe',
  webhookController.handleStripeWebhook.bind(webhookController)
);

router.post(
  '/webhooks/paypal',
  webhookController.handlePayPalWebhook.bind(webhookController)
);

export default router;
