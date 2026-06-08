import type { FieldDefinition, LayoutConfig } from '@/types/database';

// IMPORTANT: Field IDs must be deterministic (not random UUIDs) so they are
// stable across SSR/client renders, module reloads, and template hydration.
export const DEFAULT_ORG_CHART_FIELDS: FieldDefinition[] = [
  { id: 'field-org-name', label: 'Name', type: 'text', required: true, order: 0 },
  { id: 'field-org-title', label: 'Title', type: 'text', required: true, order: 1 },
  { id: 'field-org-department', label: 'Department', type: 'text', required: false, order: 2 },
  { id: 'field-org-email', label: 'Email', type: 'email', required: false, order: 3 },
  { id: 'field-org-phone', label: 'Phone', type: 'text', required: false, order: 4 },
  { id: 'field-org-employee-id', label: 'Employee ID', type: 'text', required: false, order: 5 },
  { id: 'field-org-cost-center', label: 'Cost Center', type: 'text', required: false, order: 6 },
  { id: 'field-org-photo-url', label: 'Photo URL', type: 'url', required: false, order: 7 },
];

export const DEFAULT_OWNERSHIP_FIELDS: FieldDefinition[] = [
  { id: 'field-own-entity-name', label: 'Entity Name', type: 'text', required: true, order: 0 },
  {
    id: 'field-own-entity-type',
    label: 'Entity Type',
    type: 'select',
    required: true,
    options: ['Holding', 'Subsidiary', 'JV', 'SPV', 'Trust', 'Individual', 'Other'],
    order: 1,
  },
  { id: 'field-own-jurisdiction', label: 'Jurisdiction', type: 'text', required: false, order: 2 },
  { id: 'field-own-registration-no', label: 'Registration No', type: 'text', required: false, order: 3 },
];

export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  direction: 'DOWN',
  horizontalSpacing: 80,
  verticalSpacing: 100,
  nodeWidth: 220,
  nodeHeight: 150,
  fieldVisibility: {},
  compactMode: false,
};

// Department color mapping for org chart nodes
export const DEPARTMENT_COLORS: Record<string, string> = {
  Engineering: '#3B82F6',
  Marketing: '#10B981',
  Sales: '#F59E0B',
  Finance: '#8B5CF6',
  HR: '#EC4899',
  Operations: '#6366F1',
  Legal: '#14B8A6',
  Design: '#F97316',
  Product: '#06B6D4',
  Executive: '#1E40AF',
  default: '#6B7280',
};

// Entity type color mapping for ownership nodes
export const ENTITY_TYPE_COLORS: Record<string, string> = {
  Holding: '#1E40AF',
  Subsidiary: '#059669',
  JV: '#D97706',
  SPV: '#7C3AED',
  Trust: '#0891B2',
  Individual: '#DC2626',
  Other: '#6B7280',
};
