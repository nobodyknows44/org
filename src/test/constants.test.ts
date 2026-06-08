import { describe, it, expect } from 'vitest';
import { DEFAULT_ORG_CHART_FIELDS, DEFAULT_OWNERSHIP_FIELDS, DEFAULT_LAYOUT_CONFIG } from '@/lib/constants';

describe('Constants', () => {
  it('should have default org chart fields', () => {
    expect(DEFAULT_ORG_CHART_FIELDS).toBeDefined();
    expect(DEFAULT_ORG_CHART_FIELDS.length).toBeGreaterThan(0);
    expect(DEFAULT_ORG_CHART_FIELDS[0].label).toBe('Name');
    expect(DEFAULT_ORG_CHART_FIELDS[0].required).toBe(true);
  });

  it('should have default ownership fields', () => {
    expect(DEFAULT_OWNERSHIP_FIELDS).toBeDefined();
    expect(DEFAULT_OWNERSHIP_FIELDS.length).toBeGreaterThan(0);
    expect(DEFAULT_OWNERSHIP_FIELDS[0].label).toBe('Entity Name');
  });

  it('should have valid layout config defaults', () => {
    expect(DEFAULT_LAYOUT_CONFIG.direction).toBe('DOWN');
    expect(DEFAULT_LAYOUT_CONFIG.horizontalSpacing).toBeGreaterThan(0);
    expect(DEFAULT_LAYOUT_CONFIG.verticalSpacing).toBeGreaterThan(0);
    expect(DEFAULT_LAYOUT_CONFIG.nodeWidth).toBeGreaterThan(0);
  });
});
