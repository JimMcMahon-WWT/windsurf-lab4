import { query } from '../config/database.config';
import { redisClient } from '../config/redis.config';
import { logger } from '../utils/logger.utils';

export interface FraudAssessment {
  score: number;
  riskLevel: 'low' | 'medium' | 'high';
  flags: string[];
  requiresReview: boolean;
  requires3DS: boolean;
}

export interface TransactionContext {
  userId: string;
  amount: number;
  currency: string;
  ipAddress: string;
  userAgent: string;
  country?: string;
  paymentMethodId?: string;
}

export const assessFraudRisk = async (
  context: TransactionContext
): Promise<FraudAssessment> => {
  const flags: string[] = [];
  let score = 0;

  try {
    const velocityScore = await checkVelocity(context.userId, context.amount);
    score += velocityScore;
    if (velocityScore > 20) flags.push('high_velocity');

    if (context.amount > 1000) {
      score += 15;
      flags.push('high_amount');
    }

    const geoScore = await checkGeolocation(context.userId, context.ipAddress);
    score += geoScore;
    if (geoScore > 15) flags.push('geo_mismatch');

    const deviceScore = await checkDeviceFingerprint(context.userId, context.userAgent);
    score += deviceScore;
    if (deviceScore > 10) flags.push('new_device');

    const riskLevel = score < 50 ? 'low' : score < 75 ? 'medium' : 'high';
    const requiresReview = score >= 75;
    const requires3DS = score >= 50;

    logger.info('Fraud assessment completed', {
      userId: context.userId,
      score,
      riskLevel,
      flags,
    });

    return {
      score,
      riskLevel,
      flags,
      requiresReview,
      requires3DS,
    };
  } catch (error) {
    logger.error('Fraud assessment failed:', error);
    return {
      score: 100,
      riskLevel: 'high',
      flags: ['assessment_failed'],
      requiresReview: true,
      requires3DS: true,
    };
  }
};

const checkVelocity = async (userId: string, amount: number): Promise<number> => {
  const key = `velocity:${userId}`;
  const transactions = await redisClient.lRange(key, 0, -1);
  
  if (transactions.length > 5) return 30;
  if (transactions.length > 3) return 20;
  if (transactions.length > 1) return 10;
  
  await redisClient.lPush(key, amount.toString());
  await redisClient.expire(key, 3600);
  
  return 0;
};

const checkGeolocation = async (userId: string, ipAddress: string): Promise<number> => {
  return 0;
};

const checkDeviceFingerprint = async (userId: string, userAgent: string): Promise<number> => {
  return 0;
};

export default {
  assessFraudRisk,
};
