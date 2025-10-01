// Validation utilities for form validation

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
  message?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface FieldValidation {
  value: any;
  rules: ValidationRule[];
  fieldName: string;
}

// Common validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  swissPhone: /^(\+41|0)[1-9]\d{8}$/,
  swissVat: /^CHE-\d{3}\.\d{3}\.\d{3}$/,
  swissPostalCode: /^\d{4}$/,
};

// Common validation messages
export const VALIDATION_MESSAGES = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  url: 'Please enter a valid URL',
  password: 'Password must be at least 8 characters with uppercase, lowercase, and number',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Must be no more than ${max} characters`,
  pattern: 'Invalid format',
  swissPhone: 'Please enter a valid Swiss phone number',
  swissVat: 'Please enter a valid Swiss VAT number (CHE-XXX.XXX.XXX)',
  swissPostalCode: 'Please enter a valid Swiss postal code (4 digits)',
};

// Validate a single field
export const validateField = (field: FieldValidation): string | null => {
  const { value, rules, fieldName } = field;

  for (const rule of rules) {
    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return rule.message || VALIDATION_MESSAGES.required;
    }

    // Skip other validations if value is empty and not required
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      continue;
    }

    // Min length validation
    if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
      return rule.message || VALIDATION_MESSAGES.minLength(rule.minLength);
    }

    // Max length validation
    if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
      return rule.message || VALIDATION_MESSAGES.maxLength(rule.maxLength);
    }

    // Pattern validation
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      return rule.message || VALIDATION_MESSAGES.pattern;
    }

    // Custom validation
    if (rule.custom) {
      const customError = rule.custom(value);
      if (customError) {
        return customError;
      }
    }
  }

  return null;
};

// Validate multiple fields
export const validateFields = (fields: Record<string, FieldValidation>): ValidationResult => {
  const errors: Record<string, string> = {};

  Object.entries(fields).forEach(([fieldName, field]) => {
    const error = validateField(field);
    if (error) {
      errors[fieldName] = error;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Common validation rules
export const VALIDATION_RULES = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message: message || VALIDATION_MESSAGES.required,
  }),

  email: (message?: string): ValidationRule => ({
    pattern: VALIDATION_PATTERNS.email,
    message: message || VALIDATION_MESSAGES.email,
  }),

  phone: (message?: string): ValidationRule => ({
    pattern: VALIDATION_PATTERNS.phone,
    message: message || VALIDATION_MESSAGES.phone,
  }),

  swissPhone: (message?: string): ValidationRule => ({
    pattern: VALIDATION_PATTERNS.swissPhone,
    message: message || VALIDATION_MESSAGES.swissPhone,
  }),

  url: (message?: string): ValidationRule => ({
    pattern: VALIDATION_PATTERNS.url,
    message: message || VALIDATION_MESSAGES.url,
  }),

  password: (message?: string): ValidationRule => ({
    pattern: VALIDATION_PATTERNS.password,
    message: message || VALIDATION_MESSAGES.password,
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    minLength: min,
    message: message || VALIDATION_MESSAGES.minLength(min),
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: max,
    message: message || VALIDATION_MESSAGES.maxLength(max),
  }),

  swissVat: (message?: string): ValidationRule => ({
    pattern: VALIDATION_PATTERNS.swissVat,
    message: message || VALIDATION_MESSAGES.swissVat,
  }),

  swissPostalCode: (message?: string): ValidationRule => ({
    pattern: VALIDATION_PATTERNS.swissPostalCode,
    message: message || VALIDATION_MESSAGES.swissPostalCode,
  }),

  // Custom validations
  confirmPassword: (password: string, message?: string): ValidationRule => ({
    custom: (value: string) => {
      if (value !== password) {
        return message || 'Passwords do not match';
      }
      return null;
    },
  }),

  age: (min: number, max: number, message?: string): ValidationRule => ({
    custom: (value: number) => {
      if (value < min || value > max) {
        return message || `Age must be between ${min} and ${max}`;
      }
      return null;
    },
  }),

  futureDate: (message?: string): ValidationRule => ({
    custom: (value: string) => {
      const date = new Date(value);
      const now = new Date();
      if (date <= now) {
        return message || 'Date must be in the future';
      }
      return null;
    },
  }),

  pastDate: (message?: string): ValidationRule => ({
    custom: (value: string) => {
      const date = new Date(value);
      const now = new Date();
      if (date >= now) {
        return message || 'Date must be in the past';
      }
      return null;
    },
  }),
};

// Form validation hook
export const useFormValidation = <T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, ValidationRule[]>
) => {
  // Note: This hook requires React imports, but this is a utility file
  // In a real implementation, this should be moved to a hooks file
  throw new Error('useFormValidation should be implemented in a React hooks file');
};

export default {
  validateField,
  validateFields,
  VALIDATION_RULES,
  VALIDATION_PATTERNS,
  VALIDATION_MESSAGES,
  useFormValidation,
};