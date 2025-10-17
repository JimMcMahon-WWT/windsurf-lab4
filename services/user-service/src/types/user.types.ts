export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  MERCHANT = 'merchant',
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: UserRole;
  is_email_verified: boolean;
  is_active: boolean;
  reset_token: string | null;
  reset_token_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

export interface UserResponse {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  is_email_verified: boolean;
  created_at: Date;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  revoked_at: Date | null;
  replaced_by_token: string | null;
  created_by_ip: string | null;
  revoked_by_ip: string | null;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  language: string;
  timezone: string;
  currency: string;
  newsletter_subscribed: boolean;
  marketing_emails_enabled: boolean;
  two_factor_enabled: boolean;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  created_at: Date;
  updated_at: Date;
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface UpdatePreferencesRequest {
  language?: string;
  timezone?: string;
  currency?: string;
  newsletter_subscribed?: boolean;
  marketing_emails_enabled?: boolean;
  two_factor_enabled?: boolean;
  notification_preferences?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface Session {
  id: string;
  user_id: string;
  session_token: string;
  ip_address: string | null;
  user_agent: string | null;
  expires_at: Date;
  created_at: Date;
  last_activity_at: Date;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
}
