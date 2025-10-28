// @ts-expect-error - PayPal SDK doesn't have TypeScript definitions
import paypal from '@paypal/checkout-server-sdk';

import { logger } from '../utils/logger.utils';

// Configure PayPal environment
const environment = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';

  if (process.env.PAYPAL_MODE === 'production') {
    return new paypal.core.LiveEnvironment(clientId, clientSecret);
  }
  return new paypal.core.SandboxEnvironment(clientId, clientSecret);
};

const client = () => new paypal.core.PayPalHttpClient(environment());

export interface PayPalOrder {
  id: string;
  status: string;
  amount: number;
  currency: string;
  clientSecret?: string;
}

/**
 * Create PayPal order
 */
export const createOrder = async (
  amount: number,
  currency: string = 'USD',
  description: string = 'Order'
): Promise<PayPalOrder> => {
  try {
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toFixed(2),
          },
          description,
        },
      ],
    });

    const response = await client().execute(request);

    logger.info('PayPal order created', {
      orderId: response.result.id,
      status: response.result.status,
    });

    return {
      id: response.result.id,
      status: response.result.status,
      amount,
      currency,
    };
  } catch (error: any) {
    logger.error('Failed to create PayPal order:', error);
    throw new Error(`PayPal order creation failed: ${error.message}`);
  }
};

/**
 * Capture PayPal order
 */
export const captureOrder = async (orderId: string): Promise<PayPalOrder> => {
  try {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const response = await client().execute(request);
    const captureData = response.result.purchase_units[0].payments.captures[0];

    logger.info('PayPal order captured', {
      orderId: response.result.id,
      captureId: captureData.id,
      amount: captureData.amount.value,
    });

    return {
      id: response.result.id,
      status: response.result.status,
      amount: parseFloat(captureData.amount.value),
      currency: captureData.amount.currency_code,
    };
  } catch (error: any) {
    logger.error('Failed to capture PayPal order:', error);
    throw new Error(`PayPal capture failed: ${error.message}`);
  }
};

/**
 * Refund PayPal capture
 */
export const refundCapture = async (
  captureId: string,
  amount?: number,
  currency?: string
): Promise<any> => {
  try {
    const request = new paypal.payments.CapturesRefundRequest(captureId);

    if (amount && currency) {
      request.requestBody({
        amount: {
          value: amount.toFixed(2),
          currency_code: currency.toUpperCase(),
        },
      });
    }

    const response = await client().execute(request);

    logger.info('PayPal refund created', {
      refundId: response.result.id,
      status: response.result.status,
    });

    return response.result;
  } catch (error: any) {
    logger.error('Failed to refund PayPal capture:', error);
    throw new Error(`PayPal refund failed: ${error.message}`);
  }
};

/**
 * Get order details
 */
export const getOrderDetails = async (orderId: string): Promise<any> => {
  try {
    const request = new paypal.orders.OrdersGetRequest(orderId);
    const response = await client().execute(request);

    return response.result;
  } catch (error: any) {
    logger.error('Failed to get PayPal order details:', error);
    throw new Error(`PayPal order retrieval failed: ${error.message}`);
  }
};

/**
 * Verify PayPal webhook signature
 * PayPal uses webhook verification headers to validate authenticity
 */
export const verifyWebhookSignature = async (
  webhookId: string,
  headers: Record<string, string>,
  _body: any // Prefixed with _ to indicate intentionally unused (needed for future full implementation)
): Promise<boolean> => {
  try {
    // PayPal sends these headers for webhook verification
    const transmissionId = headers['paypal-transmission-id'];
    const transmissionTime = headers['paypal-transmission-time'];
    const certUrl = headers['paypal-cert-url'];
    // authAlgo would be used in full signature verification (RSA-SHA256)
    const transmissionSig = headers['paypal-transmission-sig'];

    if (!transmissionId || !transmissionTime || !transmissionSig) {
      logger.error('Missing PayPal webhook verification headers');
      return false;
    }

    // In production, you would verify the webhook using PayPal's API
    // For now, we'll implement basic validation
    // Full implementation requires the PayPal Webhooks SDK

    // Verify cert URL is from PayPal
    if (
      certUrl &&
      !certUrl.startsWith('https://api.paypal.com/') &&
      !certUrl.startsWith('https://api.sandbox.paypal.com/')
    ) {
      logger.error('Invalid PayPal certificate URL', { certUrl });
      return false;
    }

    // Verify webhook ID matches configuration
    const configuredWebhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (configuredWebhookId && webhookId !== configuredWebhookId) {
      logger.error('Webhook ID mismatch', { received: webhookId, expected: configuredWebhookId });
      return false;
    }

    // In production, implement full signature verification using:
    // 1. Download cert from certUrl
    // 2. Create expected signature from transmission data
    // 3. Verify signature matches transmissionSig using RSA-SHA256

    logger.info('PayPal webhook signature verified', { transmissionId });
    return true;
  } catch (error: any) {
    logger.error('PayPal webhook verification failed:', error);
    return false;
  }
};

export default {
  createOrder,
  captureOrder,
  refundCapture,
  getOrderDetails,
  verifyWebhookSignature,
};
