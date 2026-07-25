import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly threshold = 5;
  private readonly cooldownMs = 10 * 60 * 1000; // 10 minutes

  private consecutiveFailures = 0;
  private openedAt: number | null = null;

  isOpen(): boolean {
    if (this.openedAt === null) return false;
    if (Date.now() - this.openedAt > this.cooldownMs) {
      this.logger.log('Circuit breaker: cooling period elapsed, resetting');
      this.reset();
      return false;
    }
    return true;
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0;
  }

  recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.threshold && this.openedAt === null) {
      this.openedAt = Date.now();
      this.logger.error(`Circuit breaker OPEN after ${this.threshold} consecutive failures`);
    }
  }

  private reset(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
  }
}
