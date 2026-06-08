'use client';

import { useState, useCallback, useRef } from 'react';
import { useCanvasStore, type OrgNodeData } from '@/stores/canvasStore';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import type { Node, Edge } from '@xyflow/react';

interface ExcelImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'upload' | 'mapColumns' | 'mapRelationship' | 'preview' | 'done';

interface ColumnMapping {
  [schemaFieldId: string]: string; // schema field id -> excel column name
}

interface ParsedRow {
  _rowIndex: number;
  [column: string]: unknown;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export function ExcelImportWizard({ open, onOpenChange }: ExcelImportWizardProps) {
  const { fieldSchema, diagramType, addNode, setNodes, setEdges, nodes, edges } = useCanvasStore();

  const [step, setStep] = useState<Step>('upload');
  const [excelData, setExcelData] = useState<ParsedRow[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [idColumn, setIdColumn] = useState<string>('');
  const [parentColumn, setParentColumn] = useState<string>('');
  const [ownershipPctColumn, setOwnershipPctColumn] = useState<string>('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep('upload');
    setExcelData([]);
    setExcelColumns([]);
    setColumnMapping({});
    setIdColumn('');
    setParentColumn('');
    setOwnershipPctColumn('');
    setErrors([]);
    setImporting(false);
  }, []);

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  // Step 1: File upload
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

        if (json.length === 0) {
          setErrors([{ row: 0, field: 'file', message: 'The file contains no data rows.' }]);
          return;
        }

        const columns = Object.keys(json[0]);
        const rows: ParsedRow[] = json.map((row, i) => ({ ...row, _rowIndex: i + 2 })); // +2 for header + 1-indexed

        setExcelColumns(columns);
        setExcelData(rows);

        // Auto-map columns by label similarity
        const mapping: ColumnMapping = {};
        fieldSchema.forEach((field) => {
          const match = columns.find(
            (col) => col.toLowerCase().replace(/[_\s]/g, '') === field.label.toLowerCase().replace(/[_\s]/g, '')
          );
          if (match) {
            mapping[field.id] = match;
          }
        });
        setColumnMapping(mapping);

        // Auto-detect ID and parent columns
        const idCol = columns.find((c) =>
          /^(employee_?id|entity_?id|id|unique_?id)$/i.test(c.replace(/\s/g, ''))
        );
        if (idCol) setIdColumn(idCol);

        const parentCol = columns.find((c) =>
          /^(reports_?to|parent_?entity_?id|parent_?id|manager_?id)$/i.test(c.replace(/\s/g, ''))
        );
        if (parentCol) setParentColumn(parentCol);

        const pctCol = columns.find((c) =>
          /^(ownership_?pct|ownership_?%|percentage|pct)$/i.test(c.replace(/\s/g, ''))
        );
        if (pctCol) setOwnershipPctColumn(pctCol);

        setStep('mapColumns');
      };
      reader.readAsArrayBuffer(file);
    },
    [fieldSchema]
  );

  // Step 4: Validate and preview
  const validate = useCallback(() => {
    const validationErrors: ValidationError[] = [];

    excelData.forEach((row) => {
      fieldSchema.forEach((field) => {
        const colName = columnMapping[field.id];
        if (!colName) return;
        const value = row[colName];

        if (field.required && (!value || String(value).trim() === '')) {
          validationErrors.push({
            row: row._rowIndex,
            field: field.label,
            message: `Required field "${field.label}" is empty`,
          });
        }

        if (field.type === 'email' && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
          validationErrors.push({
            row: row._rowIndex,
            field: field.label,
            message: `Invalid email format in row ${row._rowIndex}`,
          });
        }
      });

      if (parentColumn) {
        const parentRaw = String(row[parentColumn] || '').trim();
        if (parentRaw) {
          // Support comma-separated parent IDs (e.g. "ENT001, ENT002")
          const parentIds = parentRaw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
          for (const parentId of parentIds) {
            const parentExists = excelData.some(
              (r) => String(r[idColumn] || '').trim() === parentId
            );
            if (!parentExists) {
              validationErrors.push({
                row: row._rowIndex,
                field: 'Parent',
                message: `Parent ID "${parentId}" not found in data`,
              });
            }
          }
        }
      }
    });

    setErrors(validationErrors);
    setStep('preview');
  }, [excelData, fieldSchema, columnMapping, parentColumn, idColumn]);

  // Step 5: Import
  const handleImport = useCallback(() => {
    setImporting(true);

    // Build node map: excelId -> UUID
    const nodeMap = new Map<string, string>();
    
    // For ownership: deduplicate entities (multiple rows per entity)
    const entityMap = new Map<string, ParsedRow>();

    excelData.forEach((row) => {
      const excelId = String(row[idColumn] || '').trim();
      if (!excelId) return;

      if (diagramType === 'ownership') {
        if (!entityMap.has(excelId)) {
          entityMap.set(excelId, row);
          nodeMap.set(excelId, uuidv4());
        }
      } else {
        nodeMap.set(excelId, uuidv4());
      }
    });

    const rows = diagramType === 'ownership' ? Array.from(entityMap.values()) : excelData;

    // Create nodes
    const newNodes: Node<OrgNodeData>[] = rows.map((row, i) => {
      const excelId = String(row[idColumn] || '').trim();
      const nodeId = nodeMap.get(excelId) || uuidv4();

      const fields: Record<string, unknown> = {};
      fieldSchema.forEach((field) => {
        const colName = columnMapping[field.id];
        if (colName) {
          fields[field.id] = row[colName] || '';
        }
      });

      return {
        id: nodeId,
        type: diagramType === 'org_chart' ? 'orgChartNode' : 'ownershipNode',
        position: { x: (i % 5) * 280, y: Math.floor(i / 5) * 200 },
        data: { fields, styleOverrides: {} },
      };
    });

    // Create edges from relationships
    // Supports comma-separated parent IDs (e.g. "ENT001, ENT002")
    // and comma-separated ownership percentages paired 1:1 with parents
    const newEdges: Edge[] = [];
    const edgeDedup = new Set<string>(); // prevent duplicate source→target edges
    excelData.forEach((row) => {
      const excelId = String(row[idColumn] || '').trim();
      const parentRaw = String(row[parentColumn] || '').trim();
      if (!excelId || !parentRaw) return;

      const parentIds = parentRaw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);

      // Parse ownership percentages — may be comma-separated to match parents
      let pctValues: number[] = [];
      if (diagramType === 'ownership' && ownershipPctColumn) {
        const pctRaw = String(row[ownershipPctColumn] || '').trim();
        const pctParts = pctRaw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
        if (pctParts.length >= parentIds.length) {
          // 1:1 mapping
          pctValues = pctParts.map((p) => { const v = parseFloat(p); return isNaN(v) ? 0 : v; });
        } else if (pctParts.length === 1) {
          // Single value — divide equally among parents
          const total = parseFloat(pctParts[0]);
          const perParent = isNaN(total) ? 0 : total / parentIds.length;
          pctValues = parentIds.map(() => perParent);
        } else {
          // Mismatch — use what we have, pad with 0
          pctValues = parentIds.map((_, i) => {
            const v = parseFloat(pctParts[i] || '0');
            return isNaN(v) ? 0 : v;
          });
        }
      }

      parentIds.forEach((parentExcelId, idx) => {
        const sourceId = nodeMap.get(parentExcelId);
        const targetId = nodeMap.get(excelId);
        if (!sourceId || !targetId) return;

        const edgeKey = `${sourceId}->${targetId}`;
        if (edgeDedup.has(edgeKey)) return;
        edgeDedup.add(edgeKey);

        const edgeData: Record<string, unknown> = { metadata: {} };
        if (diagramType === 'ownership' && pctValues.length > 0) {
          edgeData.metadata = { ownership_pct: pctValues[idx] ?? 0 };
        }

        newEdges.push({
          id: uuidv4(),
          source: sourceId,
          target: targetId,
          type: diagramType === 'ownership' ? 'ownershipEdge' : 'smoothstep',
          data: edgeData,
        });
      });
    });

    setNodes([...nodes, ...newNodes]);
    setEdges([...edges, ...newEdges]);
    setStep('done');
    setImporting(false);
  }, [excelData, fieldSchema, columnMapping, idColumn, parentColumn, ownershipPctColumn, diagramType, nodes, edges, setNodes, setEdges]);

  // Download template
  const handleDownloadTemplate = useCallback(() => {
    const headers: string[] = [];
    
    // Add ID column
    headers.push(diagramType === 'org_chart' ? 'employee_id' : 'entity_id');
    
    // Add schema fields
    fieldSchema.forEach((field) => {
      headers.push(field.label.toLowerCase().replace(/\s+/g, '_'));
    });

    // Add relationship column(s)
    if (diagramType === 'org_chart') {
      headers.push('reports_to');
    } else {
      headers.push('parent_entity_id', 'ownership_pct', 'share_class', 'voting_rights', 'effective_date');
    }

    // Create example rows
    const exampleRows = diagramType === 'org_chart'
      ? [
          { employee_id: 'E001', name: 'Jane Smith', title: 'CEO', department: 'Executive', reports_to: '' },
          { employee_id: 'E002', name: 'John Doe', title: 'VP Engineering', department: 'Engineering', reports_to: 'E001' },
          { employee_id: 'E003', name: 'Alice Johnson', title: 'Director', department: 'Engineering', reports_to: 'E002' },
        ]
      : [
          { entity_id: 'ENT001', entity_name: 'Holding Corp', entity_type: 'Holding', parent_entity_id: '', ownership_pct: '' },
          { entity_id: 'ENT000', entity_name: 'Hold Check', entity_type: 'Holding', parent_entity_id: '', ownership_pct: '' },
          { entity_id: 'ENT002', entity_name: 'Subsidiary A', entity_type: 'Subsidiary', parent_entity_id: 'ENT001', ownership_pct: '100' },
          { entity_id: 'ENT003', entity_name: 'Joint Venture B', entity_type: 'JV', parent_entity_id: 'ENT001, ENT000', ownership_pct: '50, 25' },
        ];

    const ws = XLSX.utils.json_to_sheet(exampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `orgcanvas_${diagramType}_template.xlsx`);
  }, [diagramType, fieldSchema]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Import from Excel
            {step !== 'upload' && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {step === 'mapColumns' && 'Step 2: Map Columns'}
                {step === 'mapRelationship' && 'Step 3: Map Relationships'}
                {step === 'preview' && 'Step 4: Preview'}
                {step === 'done' && 'Import Complete'}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4 py-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm font-medium">Click to upload or drag & drop</p>
                <p className="text-xs text-muted-foreground mt-1">.xlsx or .csv files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv,.xls"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
              <Button variant="outline" className="w-full" onClick={handleDownloadTemplate}>
                Download Template ({diagramType === 'org_chart' ? 'Org Chart' : 'Ownership'})
              </Button>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 'mapColumns' && (
            <div className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">
                Map your Excel columns to diagram fields. {excelData.length} rows detected.
              </p>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-32">ID Column</Label>
                  <Select value={idColumn} onValueChange={setIdColumn}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Select ID column" />
                    </SelectTrigger>
                    <SelectContent>
                      {excelColumns.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs w-32">Parent Column</Label>
                  <Select value={parentColumn} onValueChange={setParentColumn}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Select parent column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {excelColumns.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {diagramType === 'ownership' && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs w-32">Ownership %</Label>
                    <Select value={ownershipPctColumn} onValueChange={setOwnershipPctColumn}>
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Select % column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {excelColumns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="h-px bg-border my-2" />

                {fieldSchema.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Label className="text-xs w-32 truncate">
                      {field.label}
                      {field.required && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                      value={columnMapping[field.id] || '__none__'}
                      onValueChange={(v) =>
                        setColumnMapping((prev) => ({
                          ...prev,
                          [field.id]: v === '__none__' ? '' : v,
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs flex-1">
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Not mapped —</SelectItem>
                        {excelColumns.map((col) => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {step === 'preview' && (
            <div className="space-y-3 py-4">
              {errors.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">{errors.length} validation warning(s)</span>
                  </div>
                  <div className="max-h-40 overflow-auto space-y-1">
                    {errors.map((err, i) => (
                      <div key={i} className="text-xs text-muted-foreground">
                        Row {err.row}: {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">All data validated successfully</span>
                </div>
              )}

              <div className="text-sm">
                <p><strong>{diagramType === 'ownership'
                  ? new Set(excelData.map((r) => String(r[idColumn] || '').trim()).filter(Boolean)).size
                  : excelData.length
                }</strong> entities will be imported</p>
                <p><strong>{excelData.reduce((count, r) => {
                  const raw = String(r[parentColumn] || '').trim();
                  if (!raw) return count;
                  return count + raw.split(/[,;]+/).map((s) => s.trim()).filter(Boolean).length;
                }, 0)}</strong> relationships detected</p>
              </div>

              {/* Preview table */}
              <div className="border rounded-md overflow-auto max-h-60">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-1 text-left">#</th>
                      {fieldSchema.slice(0, 4).map((f) => (
                        <th key={f.id} className="px-2 py-1 text-left">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {excelData.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-2 py-1">{i + 1}</td>
                        {fieldSchema.slice(0, 4).map((f) => (
                          <td key={f.id} className="px-2 py-1 truncate max-w-[120px]">
                            {String(row[columnMapping[f.id]] || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {excelData.length > 10 && (
                  <div className="text-center text-xs text-muted-foreground py-1">
                    ... and {excelData.length - 10} more rows
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {step === 'done' && (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <p className="text-lg font-medium">Import complete!</p>
              <p className="text-sm text-muted-foreground">
                {excelData.length} nodes imported successfully. Use Auto Layout to arrange them.
              </p>
            </div>
          )}
        </ScrollArea>

        <DialogFooter>
          {step === 'mapColumns' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={validate} disabled={!idColumn}>
                Validate & Preview
              </Button>
            </>
          )}
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapColumns')}>Back</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? 'Importing...' : `Import ${excelData.length} nodes`}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button onClick={handleClose}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
