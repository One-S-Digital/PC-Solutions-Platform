import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config: {
    [key: string]: {
      exists: boolean;
      valid: boolean;
      message?: string;
    };
  };
}

/**
 * Configuration Validation Service
 * 
 * Validates all required configuration on startup
 * Prevents silent failures due to misconfiguration
 * Provides clear error messages for missing/invalid config
 * 
 * Benefits:
 * - Fails fast on misconfiguration
 * - Clear error messages
 * - No silent failures
 * - Runtime feature detection
 */
@Injectable()
export class ConfigValidationService implements OnModuleInit {
  private readonly logger = new Logger(ConfigValidationService.name);
  private validationResult: ConfigValidationResult | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.logger.log('🔍 Starting configuration validation...');
    const result = this.validateAllConfig();
    this.validationResult = result;

    if (!result.valid) {
      this.logger.error('❌ Configuration validation failed!');
      result.errors.forEach(error => this.logger.error(`   - ${error}`));
      
      // In production, we might want to throw here to prevent startup
      // For now, just log the errors
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Configuration validation failed: ${result.errors.join(', ')}`);
      }
    }

    if (result.warnings.length > 0) {
      this.logger.warn('⚠️  Configuration warnings:');
      result.warnings.forEach(warning => this.logger.warn(`   - ${warning}`));
    }

    if (result.valid) {
      this.logger.log('✅ All required configuration validated successfully');
    }
  }

  /**
   * Validate all configuration
   */
  private validateAllConfig(): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const config: ConfigValidationResult['config'] = {};

    // Required configs
    const required = [
      {
        key: 'DATABASE_URL',
        validator: this.validateDatabaseUrl.bind(this),
        critical: true,
      },
      {
        key: 'CLERK_PUBLISHABLE_KEY',
        validator: this.validateClerkPublishableKey.bind(this),
        critical: true,
      },
    ];

    // Optional but recommended configs
    const recommended = [
      {
        key: 'CLERK_SECRET_KEY',
        validator: this.validateClerkSecretKey.bind(this),
        critical: false,
        warning: 'CLERK_SECRET_KEY not configured - manual user sync will not work',
      },
      {
        key: 'CLERK_WEBHOOK_SECRET',
        validator: this.validateWebhookSecret.bind(this),
        critical: false,
        warning: 'CLERK_WEBHOOK_SECRET not configured - webhook verification will be skipped',
      },
    ];

    // Validate required configs
    for (const item of required) {
      const validation = item.validator(item.key);
      config[item.key] = validation;

      if (!validation.exists) {
        errors.push(`Missing required config: ${item.key}`);
      } else if (!validation.valid) {
        errors.push(`Invalid config: ${item.key} - ${validation.message}`);
      }
    }

    // Validate recommended configs
    for (const item of recommended) {
      const validation = item.validator(item.key);
      config[item.key] = validation;

      if (!validation.exists && item.warning) {
        warnings.push(item.warning);
      } else if (!validation.valid && validation.message) {
        warnings.push(`${item.key}: ${validation.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      config,
    };
  }

  /**
   * Validate DATABASE_URL
   */
  private validateDatabaseUrl(key: string) {
    const value = this.configService.get<string>(key);
    
    if (!value) {
      return { exists: false, valid: false };
    }

    // Check if it's a valid PostgreSQL connection string
    if (!value.startsWith('postgresql://') && !value.startsWith('postgres://')) {
      return {
        exists: true,
        valid: false,
        message: 'Must be a valid PostgreSQL connection string (postgresql://...)',
      };
    }

    return { exists: true, valid: true };
  }

  /**
   * Validate CLERK_PUBLISHABLE_KEY
   */
  private validateClerkPublishableKey(key: string) {
    const value = this.configService.get<string>(key);
    
    if (!value) {
      return { exists: false, valid: false };
    }

    // Check format: pk_test_... or pk_live_...
    if (!value.startsWith('pk_test_') && !value.startsWith('pk_live_')) {
      return {
        exists: true,
        valid: false,
        message: 'Must start with pk_test_ or pk_live_',
      };
    }

    return { exists: true, valid: true };
  }

  /**
   * Validate CLERK_SECRET_KEY
   */
  private validateClerkSecretKey(key: string) {
    const value = this.configService.get<string>(key);
    
    if (!value) {
      return { exists: false, valid: false };
    }

    // Check format: sk_test_... or sk_live_...
    if (!value.startsWith('sk_test_') && !value.startsWith('sk_live_')) {
      return {
        exists: true,
        valid: false,
        message: 'Must start with sk_test_ or sk_live_',
      };
    }

    return { exists: true, valid: true };
  }

  /**
   * Validate CLERK_WEBHOOK_SECRET
   */
  private validateWebhookSecret(key: string) {
    const value = this.configService.get<string>(key);
    
    if (!value) {
      return { exists: false, valid: false };
    }

    // Check format: whsec_...
    if (!value.startsWith('whsec_')) {
      return {
        exists: true,
        valid: false,
        message: 'Must start with whsec_',
      };
    }

    return { exists: true, valid: true };
  }

  /**
   * Get validation result (for health checks)
   */
  getValidationResult(): ConfigValidationResult | null {
    return this.validationResult;
  }

  /**
   * Check if specific feature is available
   */
  isFeatureAvailable(feature: 'webhook' | 'api-sync' | 'full-sync'): boolean {
    if (!this.validationResult) {
      return false;
    }

    switch (feature) {
      case 'webhook':
        return this.validationResult.config['CLERK_WEBHOOK_SECRET']?.exists || false;
      
      case 'api-sync':
        return this.validationResult.config['CLERK_SECRET_KEY']?.exists || false;
      
      case 'full-sync':
        return (
          this.validationResult.config['CLERK_SECRET_KEY']?.exists &&
          this.validationResult.config['CLERK_WEBHOOK_SECRET']?.exists
        ) || false;
      
      default:
        return false;
    }
  }
}
