import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_default_secret_change_in_production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

export class AuthUtils {
  /**
   * Hash a password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Compare a plain text password with a hashed password
   */
  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate a JWT access token
   */
  generateAccessToken(payload: { userId: string; email: string; role: string }): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY } as SignOptions);
  }

  /**
   * Generate a JWT refresh token
   */
  generateRefreshToken(payload: { userId: string }): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY } as SignOptions);
  }

  /**
   * Verify and decode a JWT token
   */
  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}

export default new AuthUtils();
