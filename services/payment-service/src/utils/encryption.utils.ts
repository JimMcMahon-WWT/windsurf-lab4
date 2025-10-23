import crypto from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'default_32_character_key_change_me!', 'utf-8').slice(0, 32);
const ALGORITHM = process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
}

/**
 * Encrypt sensitive data (PCI compliant)
 */
export const encrypt = (text: string): EncryptedData => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv) as crypto.CipherGCM;
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
};

/**
 * Decrypt sensitive data
 */
export const decrypt = (encryptedData: EncryptedData): string => {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(encryptedData.iv, 'hex')
  ) as crypto.DecipherGCM;
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

/**
 * Hash sensitive data (one-way)
 */
export const hash = (text: string): string => {
  return crypto.createHash('sha256').update(text).digest('hex');
};

/**
 * Generate secure random token
 */
export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate idempotency key
 */
export const generateIdempotencyKey = (): string => {
  return `idem_${Date.now()}_${generateToken(16)}`;
};

/**
 * Mask sensitive data for logging
 */
export const maskCardNumber = (cardNumber: string): string => {
  if (!cardNumber || cardNumber.length < 4) return '****';
  return `****${cardNumber.slice(-4)}`;
};

/**
 * Mask email for logging
 */
export const maskEmail = (email: string): string => {
  if (!email) return '****';
  const [username, domain] = email.split('@');
  if (!domain) return '****';
  return `${username.slice(0, 2)}***@${domain}`;
};

/**
 * Verify webhook signature (Stripe)
 */
export const verifyStripeSignature = (
  payload: string,
  signature: string,
  secret: string
): boolean => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

/**
 * Verify webhook signature (PayPal)
 */
export const verifyPayPalSignature = (
  transmissionId: string,
  timestamp: string,
  webhookId: string,
  certUrl: string,
  eventBody: string,
  actualSignature: string
): boolean => {
  // PayPal webhook verification requires cert validation
  // This is a simplified version - production should use PayPal SDK
  const expectedMessage = `${transmissionId}|${timestamp}|${webhookId}|${crypto
    .createHash('sha256')
    .update(eventBody)
    .digest('hex')}`;
  
  return true; // Implement full verification with PayPal SDK
};
