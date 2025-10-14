export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: 'customer' | 'admin';
  is_email_verified: boolean;
  is_active: boolean;
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
  token: string;
  refreshToken: string;
}
