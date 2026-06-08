'use client';

import { useState } from 'react';
import { DIAGRAM_TEMPLATES, hydrateTemplate, type DiagramTemplate } from '@/lib/templates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TemplateGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (result: ReturnType<typeof hydrateTemplate>, template: DiagramTemplate) => void;
}

export function TemplateGallery({ open, onOpenChange, onApply }: TemplateGalleryProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleApply = () => {
    const template = DIAGRAM_TEMPLATES.find((t) => t.id === selected);
    if (!template) return;
    const result = hydrateTemplate(template);
    onApply(result, template);
    setSelected(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start from a Template</DialogTitle>
          <DialogDescription>
            Choose a pre-built diagram template to get started quickly. The template will populate your canvas with sample data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-4 max-h-[400px] overflow-auto">
          {DIAGRAM_TEMPLATES.map((t) => (
            <Card
              key={t.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selected === t.id
                  ? 'ring-2 ring-primary border-primary'
                  : 'hover:border-muted-foreground/30'
              }`}
              onClick={() => setSelected(t.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{t.thumbnail}</span>
                  <div>
                    <CardTitle className="text-sm">{t.name}</CardTitle>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">
                      {t.type === 'org_chart' ? 'Org Chart' : 'Ownership'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  {t.description}
                </CardDescription>
                <p className="text-[10px] text-muted-foreground mt-2">
                  {t.nodes.length} nodes &middot; {t.edges.length} edges
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!selected}>
            Apply Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
