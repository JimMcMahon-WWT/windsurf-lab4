import Joi from 'joi';

// Password requirements: min 8 chars, at least one uppercase, one lowercase, one number
const passwordSchema = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    'any.required': 'Password is required',
  });

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: passwordSchema,
  first_name: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'First name must be at least 1 character',
    'string.max': 'First name must not exceed 100 characters',
  }),
  last_name: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'Last name must be at least 1 character',
    'string.max': 'Last name must not exceed 100 characters',
  }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

export const passwordResetRequestSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
});

export const passwordResetConfirmSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  newPassword: passwordSchema,
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required',
  }),
  newPassword: passwordSchema,
});

export const updateProfileSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'First name must be at least 1 character',
    'string.max': 'First name must not exceed 100 characters',
  }),
  last_name: Joi.string().min(1).max(100).optional().messages({
    'string.min': 'Last name must be at least 1 character',
    'string.max': 'Last name must not exceed 100 characters',
  }),
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format',
    }),
});

export const updatePreferencesSchema = Joi.object({
  language: Joi.string().length(2).optional().messages({
    'string.length': 'Language code must be 2 characters (e.g., en, es)',
  }),
  timezone: Joi.string().optional().messages({
    'string.base': 'Timezone must be a valid string',
  }),
  currency: Joi.string().length(3).uppercase().optional().messages({
    'string.length': 'Currency code must be 3 characters (e.g., USD, EUR)',
    'string.uppercase': 'Currency code must be uppercase',
  }),
  newsletter_subscribed: Joi.boolean().optional(),
  marketing_emails_enabled: Joi.boolean().optional(),
  two_factor_enabled: Joi.boolean().optional(),
  notification_preferences: Joi.object({
    email: Joi.boolean().optional(),
    sms: Joi.boolean().optional(),
    push: Joi.boolean().optional(),
  }).optional(),
});
