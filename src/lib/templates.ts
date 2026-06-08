import { v4 as uuidv4 } from 'uuid';
import type { DiagramType, FieldDefinition, LayoutConfig } from '@/types/database';
import { DEFAULT_ORG_CHART_FIELDS, DEFAULT_OWNERSHIP_FIELDS, DEFAULT_LAYOUT_CONFIG } from '@/lib/constants';

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  type: DiagramType;
  thumbnail: string; // emoji as visual hint
  fieldSchema: FieldDefinition[];
  layoutConfig: LayoutConfig;
  nodes: Array<{
    tempId: string;
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    sourceTempId: string;
    targetTempId: string;
    metadata?: Record<string, unknown>;
  }>;
}

// ----- Template: Simple Org Chart -----

function buildSimpleOrgChart(): DiagramTemplate {
  const fields = DEFAULT_ORG_CHART_FIELDS;
  const nameField = fields[0].id;
  const titleField = fields[1].id;
  const deptField = fields[2].id;

  const ceo = uuidv4();
  const vpEng = uuidv4();
  const vpSales = uuidv4();
  const dev1 = uuidv4();
  const dev2 = uuidv4();
  const sales1 = uuidv4();

  return {
    id: 'simple-org-chart',
    name: 'Simple Org Chart',
    description: 'A basic three-level org chart with CEO, two VPs, and individual contributors.',
    type: 'org_chart',
    thumbnail: '🏢',
    fieldSchema: fields,
    layoutConfig: { ...DEFAULT_LAYOUT_CONFIG },
    nodes: [
      { tempId: ceo, data: { [nameField]: 'Jane Smith', [titleField]: 'CEO', [deptField]: 'Executive' } },
      { tempId: vpEng, data: { [nameField]: 'Alex Johnson', [titleField]: 'VP Engineering', [deptField]: 'Engineering' } },
      { tempId: vpSales, data: { [nameField]: 'Maria Garcia', [titleField]: 'VP Sales', [deptField]: 'Sales' } },
      { tempId: dev1, data: { [nameField]: 'Chris Lee', [titleField]: 'Senior Developer', [deptField]: 'Engineering' } },
      { tempId: dev2, data: { [nameField]: 'Pat Chen', [titleField]: 'Developer', [deptField]: 'Engineering' } },
      { tempId: sales1, data: { [nameField]: 'Sam Taylor', [titleField]: 'Account Executive', [deptField]: 'Sales' } },
    ],
    edges: [
      { sourceTempId: ceo, targetTempId: vpEng },
      { sourceTempId: ceo, targetTempId: vpSales },
      { sourceTempId: vpEng, targetTempId: dev1 },
      { sourceTempId: vpEng, targetTempId: dev2 },
      { sourceTempId: vpSales, targetTempId: sales1 },
    ],
  };
}

// ----- Template: Matrix Organization -----

function buildMatrixOrg(): DiagramTemplate {
  const fields = DEFAULT_ORG_CHART_FIELDS;
  const nameField = fields[0].id;
  const titleField = fields[1].id;
  const deptField = fields[2].id;

  const ceo = uuidv4();
  const cto = uuidv4();
  const cmo = uuidv4();
  const cfo = uuidv4();
  const pm1 = uuidv4();
  const pm2 = uuidv4();
  const eng1 = uuidv4();
  const eng2 = uuidv4();
  const mkt1 = uuidv4();
  const fin1 = uuidv4();

  return {
    id: 'matrix-org',
    name: 'Matrix Organization',
    description: 'A matrix organizational structure with functional heads, project managers, and cross-functional teams.',
    type: 'org_chart',
    thumbnail: '🔀',
    fieldSchema: fields,
    layoutConfig: { ...DEFAULT_LAYOUT_CONFIG },
    nodes: [
      { tempId: ceo, data: { [nameField]: 'CEO', [titleField]: 'Chief Executive Officer', [deptField]: 'Executive' } },
      { tempId: cto, data: { [nameField]: 'CTO', [titleField]: 'Chief Technology Officer', [deptField]: 'Engineering' } },
      { tempId: cmo, data: { [nameField]: 'CMO', [titleField]: 'Chief Marketing Officer', [deptField]: 'Marketing' } },
      { tempId: cfo, data: { [nameField]: 'CFO', [titleField]: 'Chief Financial Officer', [deptField]: 'Finance' } },
      { tempId: pm1, data: { [nameField]: 'Project Manager A', [titleField]: 'Project Manager', [deptField]: 'Product' } },
      { tempId: pm2, data: { [nameField]: 'Project Manager B', [titleField]: 'Project Manager', [deptField]: 'Product' } },
      { tempId: eng1, data: { [nameField]: 'Engineer 1', [titleField]: 'Software Engineer', [deptField]: 'Engineering' } },
      { tempId: eng2, data: { [nameField]: 'Engineer 2', [titleField]: 'Software Engineer', [deptField]: 'Engineering' } },
      { tempId: mkt1, data: { [nameField]: 'Marketer 1', [titleField]: 'Marketing Specialist', [deptField]: 'Marketing' } },
      { tempId: fin1, data: { [nameField]: 'Analyst 1', [titleField]: 'Financial Analyst', [deptField]: 'Finance' } },
    ],
    edges: [
      { sourceTempId: ceo, targetTempId: cto },
      { sourceTempId: ceo, targetTempId: cmo },
      { sourceTempId: ceo, targetTempId: cfo },
      { sourceTempId: cto, targetTempId: eng1 },
      { sourceTempId: cto, targetTempId: eng2 },
      { sourceTempId: cmo, targetTempId: mkt1 },
      { sourceTempId: cfo, targetTempId: fin1 },
      { sourceTempId: cto, targetTempId: pm1 },
      { sourceTempId: cto, targetTempId: pm2 },
    ],
  };
}

// ----- Template: Holding Company Structure -----

function buildHoldingCompany(): DiagramTemplate {
  const fields = DEFAULT_OWNERSHIP_FIELDS;
  const nameField = fields[0].id;
  const typeField = fields[1].id;
  const jurisdictionField = fields[2].id;
  const regField = fields[3].id;

  const holdco = uuidv4();
  const sub1 = uuidv4();
  const sub2 = uuidv4();
  const sub3 = uuidv4();
  const jv = uuidv4();

  return {
    id: 'holding-company',
    name: 'Holding Company',
    description: 'A holding company with wholly-owned subsidiaries and a joint venture.',
    type: 'ownership',
    thumbnail: '🏛️',
    fieldSchema: fields,
    layoutConfig: { ...DEFAULT_LAYOUT_CONFIG },
    nodes: [
      { tempId: holdco, data: { [nameField]: 'HoldCo Ltd', [typeField]: 'Holding', [jurisdictionField]: 'United Kingdom', [regField]: 'UK-001' } },
      { tempId: sub1, data: { [nameField]: 'Operations Inc', [typeField]: 'Subsidiary', [jurisdictionField]: 'United States', [regField]: 'US-101' } },
      { tempId: sub2, data: { [nameField]: 'Tech GmbH', [typeField]: 'Subsidiary', [jurisdictionField]: 'Germany', [regField]: 'DE-201' } },
      { tempId: sub3, data: { [nameField]: 'Services BV', [typeField]: 'Subsidiary', [jurisdictionField]: 'Netherlands', [regField]: 'NL-301' } },
      { tempId: jv, data: { [nameField]: 'JV Partners LLC', [typeField]: 'JV', [jurisdictionField]: 'United States', [regField]: 'US-401' } },
    ],
    edges: [
      { sourceTempId: holdco, targetTempId: sub1, metadata: { ownership_pct: 100 } },
      { sourceTempId: holdco, targetTempId: sub2, metadata: { ownership_pct: 100 } },
      { sourceTempId: holdco, targetTempId: sub3, metadata: { ownership_pct: 100 } },
      { sourceTempId: holdco, targetTempId: jv, metadata: { ownership_pct: 50 } },
    ],
  };
}

// ----- Template: Fund Structure -----

function buildFundStructure(): DiagramTemplate {
  const fields = DEFAULT_OWNERSHIP_FIELDS;
  const nameField = fields[0].id;
  const typeField = fields[1].id;
  const jurisdictionField = fields[2].id;

  const gp = uuidv4();
  const lp1 = uuidv4();
  const lp2 = uuidv4();
  const fund = uuidv4();
  const spv1 = uuidv4();
  const spv2 = uuidv4();
  const portfolio1 = uuidv4();
  const portfolio2 = uuidv4();

  return {
    id: 'fund-structure',
    name: 'Fund Structure',
    description: 'A private equity fund structure with GP, LPs, fund vehicle, SPVs, and portfolio companies.',
    type: 'ownership',
    thumbnail: '💰',
    fieldSchema: fields,
    layoutConfig: { ...DEFAULT_LAYOUT_CONFIG },
    nodes: [
      { tempId: gp, data: { [nameField]: 'GP Management Ltd', [typeField]: 'Holding', [jurisdictionField]: 'Cayman Islands' } },
      { tempId: lp1, data: { [nameField]: 'LP Investor A', [typeField]: 'Individual', [jurisdictionField]: 'United States' } },
      { tempId: lp2, data: { [nameField]: 'LP Investor B', [typeField]: 'Trust', [jurisdictionField]: 'United Kingdom' } },
      { tempId: fund, data: { [nameField]: 'Alpha Fund I LP', [typeField]: 'Holding', [jurisdictionField]: 'Cayman Islands' } },
      { tempId: spv1, data: { [nameField]: 'SPV Alpha-1', [typeField]: 'SPV', [jurisdictionField]: 'Delaware' } },
      { tempId: spv2, data: { [nameField]: 'SPV Alpha-2', [typeField]: 'SPV', [jurisdictionField]: 'Luxembourg' } },
      { tempId: portfolio1, data: { [nameField]: 'PortCo Technologies', [typeField]: 'Subsidiary', [jurisdictionField]: 'United States' } },
      { tempId: portfolio2, data: { [nameField]: 'PortCo Services', [typeField]: 'Subsidiary', [jurisdictionField]: 'Germany' } },
    ],
    edges: [
      { sourceTempId: gp, targetTempId: fund, metadata: { ownership_pct: 2 } },
      { sourceTempId: lp1, targetTempId: fund, metadata: { ownership_pct: 55 } },
      { sourceTempId: lp2, targetTempId: fund, metadata: { ownership_pct: 43 } },
      { sourceTempId: fund, targetTempId: spv1, metadata: { ownership_pct: 100 } },
      { sourceTempId: fund, targetTempId: spv2, metadata: { ownership_pct: 100 } },
      { sourceTempId: spv1, targetTempId: portfolio1, metadata: { ownership_pct: 80 } },
      { sourceTempId: spv2, targetTempId: portfolio2, metadata: { ownership_pct: 65 } },
    ],
  };
}

// ----- Exported registry -----

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  buildSimpleOrgChart(),
  buildMatrixOrg(),
  buildHoldingCompany(),
  buildFundStructure(),
];

/**
 * Hydrate a template into concrete nodes/edges with fresh UUIDs and positions.
 * Returns RF-compatible node and edge arrays.
 */
export function hydrateTemplate(template: DiagramTemplate) {
  const idMap = new Map<string, string>();

  // Generate fresh IDs for every node
  template.nodes.forEach((n) => {
    idMap.set(n.tempId, uuidv4());
  });

  const nodeType = template.type === 'org_chart' ? 'orgChartNode' : 'ownershipNode';

  const nodes = template.nodes.map((n, i) => ({
    id: idMap.get(n.tempId)!,
    type: nodeType,
    position: { x: (i % 3) * 280, y: Math.floor(i / 3) * 200 },
    data: {
      fields: { ...n.data },
      styleOverrides: {},
    },
  }));

  const edgeType = template.type === 'ownership' ? 'ownershipEdge' : 'smoothstep';

  const edges = template.edges.map((e) => ({
    id: uuidv4(),
    source: idMap.get(e.sourceTempId)!,
    target: idMap.get(e.targetTempId)!,
    type: edgeType,
    data: e.metadata || {},
  }));

  return { nodes, edges, fieldSchema: template.fieldSchema, layoutConfig: template.layoutConfig };
}
