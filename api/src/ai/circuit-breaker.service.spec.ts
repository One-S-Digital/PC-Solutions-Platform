import { CircuitBreakerService } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
  });

  it('is closed by default', () => {
    expect(service.isOpen()).toBe(false);
  });

  it('stays closed below the threshold of 5', () => {
    for (let i = 0; i < 4; i++) service.recordFailure();
    expect(service.isOpen()).toBe(false);
  });

  it('opens at exactly 5 consecutive failures', () => {
    for (let i = 0; i < 5; i++) service.recordFailure();
    expect(service.isOpen()).toBe(true);
  });

  it('stays open after additional failures', () => {
    for (let i = 0; i < 10; i++) service.recordFailure();
    expect(service.isOpen()).toBe(true);
  });

  it('recordSuccess resets failure counter so circuit does not open', () => {
    for (let i = 0; i < 4; i++) service.recordFailure();
    service.recordSuccess();
    service.recordFailure(); // 1 failure after reset — below threshold
    expect(service.isOpen()).toBe(false);
  });

  it('recordSuccess does not close an already-open circuit', () => {
    for (let i = 0; i < 5; i++) service.recordFailure();
    service.recordSuccess();
    expect(service.isOpen()).toBe(true);
  });

  it('auto-resets after the 10-minute cooldown elapses', () => {
    for (let i = 0; i < 5; i++) service.recordFailure();
    expect(service.isOpen()).toBe(true);

    (service as any).openedAt = Date.now() - 11 * 60 * 1000;
    expect(service.isOpen()).toBe(false);
  });

  it('stays open within the cooldown window', () => {
    for (let i = 0; i < 5; i++) service.recordFailure();
    (service as any).openedAt = Date.now() - 5 * 60 * 1000; // 5 min — still in window
    expect(service.isOpen()).toBe(true);
  });
});
