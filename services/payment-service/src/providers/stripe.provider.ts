import Stripe from 'stripe';
import { logger } from '../utils/logger.utils';
import { encrypt, decrypt, maskCardNumber } from '../utils/encryption.utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
  typescript: true,
});

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret?: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
}

/**
 * Create a payment intent with 3D Secure support
 */
export const createPaymentIntent = async (
  amount: number,
  currency: string = 'usd',
  metadata: Record<string, string> = {},
  customerId?: string,
  paymentMethodId?: string
): Promise<PaymentIntent> => {
  try {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    };

    if (customerId) {
      params.customer = customerId;
    }

    if (paymentMethodId) {
      params.payment_method = paymentMethodId;
      params.confirm = true; // Confirm immediately to test card
      params.return_url = 'https://example.com/return'; // Required for confirmation
    }

    // Enable 3D Secure for amounts above threshold
    const require3DS = parseFloat(process.env.REQUIRE_3DS_ABOVE_AMOUNT || '100');
    if (amount > require3DS) {
      params.payment_method_options = {
        card: {
          request_three_d_secure: 'any',
        },
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(params);

    logger.info('Payment intent created', {
      paymentIntentId: paymentIntent.id,
      amount,
      currency,
    });

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      clientSecret: paymentIntent.client_secret || undefined,
    };
  } catch (error: any) {
    logger.error('Failed to create payment intent:', error);
    throw new Error(`Stripe payment intent failed: ${error.message}`);
  }
};

/**
 * Confirm a payment intent
 */
export const confirmPaymentIntent = async (
  paymentIntentId: string,
  paymentMethodId: string
): Promise<PaymentIntent> => {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId,
    });

    logger.info('Payment intent confirmed', {
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    };
  } catch (error: any) {
    logger.error('Failed to confirm payment intent:', error);
    throw new Error(`Stripe confirmation failed: ${error.message}`);
  }
};

/**
 * Capture an authorized payment
 */
export const capturePayment = async (
  paymentIntentId: string,
  amountToCapture?: number
): Promise<PaymentIntent> => {
  try {
    const params: Stripe.PaymentIntentCaptureParams = {};
    
    if (amountToCapture) {
      params.amount_to_capture = Math.round(amountToCapture * 100);
    }

    const paymentIntent = await stripe.paymentIntents.capture(
      paymentIntentId,
      params
    );

    logger.info('Payment captured', {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount_received / 100,
    });

    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    };
  } catch (error: any) {
    logger.error('Failed to capture payment:', error);
    throw new Error(`Stripe capture failed: ${error.message}`);
  }
};

/**
 * Create a refund
 */
export const createRefund = async (
  paymentIntentId: string,
  amount?: number,
  reason?: string
): Promise<Stripe.Refund> => {
  try {
    const params: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      params.amount = Math.round(amount * 100);
    }

    if (reason) {
      params.reason = reason as Stripe.RefundCreateParams.Reason;
    }

    const refund = await stripe.refunds.create(params);

    logger.info('Refund created', {
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
    });

    return refund;
  } catch (error: any) {
    logger.error('Failed to create refund:', error);
    throw new Error(`Stripe refund failed: ${error.message}`);
  }
};

/**
 * Create or retrieve a customer
 */
export const createCustomer = async (
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata,
    });

    logger.info('Stripe customer created', { customerId: customer.id });

    return customer;
  } catch (error: any) {
    logger.error('Failed to create customer:', error);
    throw new Error(`Stripe customer creation failed: ${error.message}`);
  }
};

/**
 * Tokenize and attach payment method to customer
 */
export const attachPaymentMethod = async (
  paymentMethodId: string,
  customerId: string
): Promise<PaymentMethod> => {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    logger.info('Payment method attached', {
      paymentMethodId: paymentMethod.id,
      customerId,
      last4: paymentMethod.card?.last4,
    });

    return {
      id: paymentMethod.id,
      type: paymentMethod.type,
      card: paymentMethod.card ? {
        brand: paymentMethod.card.brand,
        last4: paymentMethod.card.last4,
        expMonth: paymentMethod.card.exp_month,
        expYear: paymentMethod.card.exp_year,
      } : undefined,
    };
  } catch (error: any) {
    logger.error('Failed to attach payment method:', error);
    throw new Error(`Stripe payment method attachment failed: ${error.message}`);
  }
};

/**
 * Create a subscription
 */
export const createSubscription = async (
  customerId: string,
  priceId: string,
  metadata?: Record<string, string>
): Promise<Stripe.Subscription> => {
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    logger.info('Subscription created', {
      subscriptionId: subscription.id,
      customerId,
    });

    return subscription;
  } catch (error: any) {
    logger.error('Failed to create subscription:', error);
    throw new Error(`Stripe subscription failed: ${error.message}`);
  }
};

/**
 * Cancel a subscription
 */
export const cancelSubscription = async (
  subscriptionId: string,
  cancelImmediately: boolean = false
): Promise<Stripe.Subscription> => {
  try {
    const params: Stripe.SubscriptionCancelParams = cancelImmediately
      ? {}
      : { prorate: true, invoice_now: false };

    const subscription = cancelImmediately
      ? await stripe.subscriptions.cancel(subscriptionId)
      : await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });

    logger.info('Subscription cancelled', {
      subscriptionId,
      status: subscription.status,
    });

    return subscription;
  } catch (error: any) {
    logger.error('Failed to cancel subscription:', error);
    throw new Error(`Stripe subscription cancellation failed: ${error.message}`);
  }
};

/**
 * Verify webhook signature
 */
export const verifyWebhookSignature = (
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event => {
  try {
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event;
  } catch (error: any) {
    logger.error('Webhook signature verification failed:', error);
    throw new Error(`Invalid signature: ${error.message}`);
  }
};

export default {
  createPaymentIntent,
  confirmPaymentIntent,
  capturePayment,
  createRefund,
  createCustomer,
  attachPaymentMethod,
  createSubscription,
  cancelSubscription,
  verifyWebhookSignature,
};
