'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useCanvasStore } from '@/stores/canvasStore';
import { exportToExcel } from '@/lib/export/excelExport';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportFormat = 'pdf' | 'png' | 'svg' | 'xlsx';
type PageSize = 'a4' | 'a3' | 'letter';
type Orientation = 'portrait' | 'landscape';

const PAGE_SIZES: Record<PageSize, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a3: { width: 297, height: 420 },
  letter: { width: 216, height: 279 },
};

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [pageSize, setPageSize] = useState<PageSize>('a4');
  const [orientation, setOrientation] = useState<Orientation>('landscape');
  const [fitToPage, setFitToPage] = useState(true);
  const [resolution, setResolution] = useState<'1x' | '2x'>('2x');
  const [exporting, setExporting] = useState(false);

  const { getNodes } = useReactFlow();
  const { nodes: storeNodes, edges: storeEdges, fieldSchema, diagramType, diagramName } = useCanvasStore();

  const handleExport = useCallback(async () => {
    setExporting(true);

    try {
      // Excel export — no canvas capture needed
      if (format === 'xlsx') {
        exportToExcel(storeNodes, storeEdges, fieldSchema, diagramType, diagramName);
        onOpenChange(false);
        return;
      }

      const nodesBounds = getNodesBounds(getNodes());
      const padding = 50;
      const width = nodesBounds.width + padding * 2;
      const height = nodesBounds.height + padding * 2;

      // Find the React Flow viewport element
      const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewport) {
        throw new Error('Canvas viewport not found');
      }

      const scale = resolution === '2x' ? 2 : 1;

      if (format === 'png') {
        const dataUrl = await toPng(viewport, {
          backgroundColor: '#ffffff',
          width: width * scale,
          height: height * scale,
          style: {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px)`,
          },
        });

        const link = document.createElement('a');
        link.download = 'orgcanvas-export.png';
        link.href = dataUrl;
        link.click();
      } else if (format === 'svg') {
        const dataUrl = await toSvg(viewport, {
          backgroundColor: '#ffffff',
          width,
          height,
          style: {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px)`,
          },
        });

        const link = document.createElement('a');
        link.download = 'orgcanvas-export.svg';
        link.href = dataUrl;
        link.click();
      } else if (format === 'pdf') {
        const dataUrl = await toPng(viewport, {
          backgroundColor: '#ffffff',
          width: width * 2,
          height: height * 2,
          style: {
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(${-nodesBounds.x + padding}px, ${-nodesBounds.y + padding}px)`,
          },
        });

        const size = PAGE_SIZES[pageSize];
        const pdfW = orientation === 'landscape' ? size.height : size.width;
        const pdfH = orientation === 'landscape' ? size.width : size.height;

        const pdf = new jsPDF({
          orientation,
          unit: 'mm',
          format: pageSize === 'letter' ? 'letter' : pageSize,
        });

        if (fitToPage) {
          const ratio = Math.min(pdfW / width, pdfH / height);
          const imgW = width * ratio;
          const imgH = height * ratio;
          const x = (pdfW - imgW) / 2;
          const y = (pdfH - imgH) / 2;
          pdf.addImage(dataUrl, 'PNG', x, y, imgW, imgH);
        } else {
          // Multi-page tiling
          const pxPerMm = width / pdfW;
          const tileW = pdfW;
          const tileH = pdfH;
          const cols = Math.ceil(width / (tileW * pxPerMm));
          const rows = Math.ceil(height / (tileH * pxPerMm));

          for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
              if (row > 0 || col > 0) pdf.addPage();
              pdf.addImage(
                dataUrl,
                'PNG',
                -col * tileW,
                -row * tileH,
                width / pxPerMm,
                height / pxPerMm
              );
            }
          }
        }

        pdf.save('orgcanvas-export.pdf');
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [format, pageSize, orientation, fitToPage, resolution, getNodes, storeNodes, storeEdges, fieldSchema, diagramType, diagramName, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Diagram</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <Label className="text-xs">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="png">PNG</SelectItem>
                <SelectItem value="svg">SVG</SelectItem>
                <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {format === 'pdf' && (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Page Size</Label>
                <Select value={pageSize} onValueChange={(v) => setPageSize(v as PageSize)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4</SelectItem>
                    <SelectItem value="a3">A3</SelectItem>
                    <SelectItem value="letter">US Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Orientation</Label>
                <Select value={orientation} onValueChange={(v) => setOrientation(v as Orientation)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="landscape">Landscape</SelectItem>
                    <SelectItem value="portrait">Portrait</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-xs">Fit to Page</Label>
                <Switch checked={fitToPage} onCheckedChange={setFitToPage} className="scale-75" />
              </div>
            </>
          )}

          {format === 'png' && (
            <div className="space-y-1">
              <Label className="text-xs">Resolution</Label>
              <Select value={resolution} onValueChange={(v) => setResolution(v as '1x' | '2x')}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1x">1x</SelectItem>
                  <SelectItem value="2x">2x (High DPI)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
