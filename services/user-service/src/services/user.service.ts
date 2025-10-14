import userRepository from '../repositories/user.repository';
import authUtils from '../utils/auth.utils';
import { RegisterRequest, LoginRequest, LoginResponse, UserResponse } from '../types/user.types';
import { validate, registerSchema, loginSchema } from '../utils/validation';
import logger from '../config/logger';

export class UserService {
  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<UserResponse> {
    // Validate input
    const validatedData = validate(registerSchema, data);

    // Check if user already exists
    const existingUser = await userRepository.findByEmail(validatedData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await authUtils.hashPassword(validatedData.password);

    // Create user
    const user = await userRepository.create(
      validatedData.email,
      passwordHash,
      validatedData.first_name,
      validatedData.last_name,
      validatedData.phone
    );

    logger.info(`New user registered: ${user.email}`);

    // Return user without password hash
    return this.toUserResponse(user);
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    // Validate input
    const validatedData = validate(loginSchema, data);

    // Find user by email
    const user = await userRepository.findByEmail(validatedData.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await authUtils.comparePassword(
      validatedData.password,
      user.password_hash
    );
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Generate tokens
    const token = authUtils.generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = authUtils.generateRefreshToken({
      userId: user.id,
    });

    logger.info(`User logged in: ${user.email}`);

    return {
      user: this.toUserResponse(user),
      token,
      refreshToken,
    };
  }

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string): Promise<UserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return this.toUserResponse(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updates: Partial<RegisterRequest>): Promise<UserResponse> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser = await userRepository.update(userId, updates);
    logger.info(`User profile updated: ${updatedUser.email}`);

    return this.toUserResponse(updatedUser);
  }

  /**
   * Convert User to UserResponse (remove sensitive data)
   */
  private toUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      role: user.role,
      is_email_verified: user.is_email_verified,
      created_at: user.created_at,
    };
  }
}

export default new UserService();
