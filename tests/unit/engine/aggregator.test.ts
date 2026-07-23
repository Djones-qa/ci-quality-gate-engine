import { getAvailableCollectors } from '../../../src/engine/aggregator';

describe('Aggregator', () => {
  describe('getAvailableCollectors', () => {
    it('should return all registered collectors', () => {
      const collectors = getAvailableCollectors();

      expect(collectors).toContain('jest');
      expect(collectors).toContain('playwright');
      expect(collectors).toContain('k6');
      expect(collectors).toContain('zap');
      expect(collectors).toContain('axe');
      expect(collectors).toContain('pact');
      expect(collectors).toContain('lighthouse');
      expect(collectors).toContain('custom');
    });

    it('should have 8 built-in collectors', () => {
      const collectors = getAvailableCollectors();
      expect(collectors).toHaveLength(8);
    });
  });
});
