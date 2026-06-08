'use client';

import * as XLSX from 'xlsx';
import type { Node, Edge } from '@xyflow/react';
import type { OrgNodeData } from '@/stores/canvasStore';
import type { FieldDefinition, DiagramType } from '@/types/database';

/**
 * Export diagram data back to .xlsx in a format compatible with the import wizard.
 * Supports both org_chart and ownership diagram types.
 */
export function exportToExcel(
  nodes: Node<OrgNodeData>[],
  edges: Edge[],
  fieldSchema: FieldDefinition[],
  diagramType: DiagramType,
  diagramName: string
) {
  const wb = XLSX.utils.book_new();

  // Build rows
  const rows: Record<string, unknown>[] = [];

  if (diagramType === 'ownership') {
    // For ownership diagrams: one row per edge (parent→child relationship)
    // Nodes with no incoming edges still get one row (no parent)
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const incomingEdges = new Map<string, Edge[]>();
    for (const edge of edges) {
      if (!incomingEdges.has(edge.target)) incomingEdges.set(edge.target, []);
      incomingEdges.get(edge.target)!.push(edge);
    }

    for (const node of nodes) {
      const fields = (node.data as unknown as OrgNodeData).fields || {};
      const nodeEdges = incomingEdges.get(node.id) || [];

      if (nodeEdges.length === 0) {
        // Root node — one row without parent
        const row: Record<string, unknown> = { ID: node.id };
        for (const field of fieldSchema) {
          row[field.label] = fields[field.id] ?? '';
        }
        row['Parent ID'] = '';
        row['Ownership %'] = '';
        row['Share Class'] = '';
        row['Voting Rights'] = '';
        rows.push(row);
      } else {
        for (const edge of nodeEdges) {
          const row: Record<string, unknown> = { ID: node.id };
          for (const field of fieldSchema) {
            row[field.label] = fields[field.id] ?? '';
          }
          row['Parent ID'] = edge.source;
          const edgeMeta = (edge.data as Record<string, unknown>) || {};
          row['Ownership %'] = edgeMeta.ownership_pct ?? '';
          row['Share Class'] = edgeMeta.share_class ?? '';
          row['Voting Rights'] = edgeMeta.voting_rights ?? '';
          rows.push(row);
        }
      }
    }
  } else {
    // For org charts: one row per node
    // Build parent map from edges (each node has at most one parent)
    const parentMap = new Map<string, string>();
    for (const edge of edges) {
      parentMap.set(edge.target, edge.source);
    }

    for (const node of nodes) {
      const fields = (node.data as unknown as OrgNodeData).fields || {};
      const row: Record<string, unknown> = { ID: node.id };
      for (const field of fieldSchema) {
        row[field.label] = fields[field.id] ?? '';
      }
      row['Reports To'] = parentMap.get(node.id) || '';
      rows.push(row);
    }
  }

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length + 2, 15),
  }));
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, 'Diagram');
  XLSX.writeFile(wb, `${diagramName.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
}
