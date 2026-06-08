# OrgCanvas — Changes Log

---

## 2026-02-16 — Bug Fixes & Missing Features

### Analysis Summary

Two issues were reported:
1. **Templates don't work** — applying a template shows nodes but all fields render empty ("New Employee")
2. **No drag-and-drop / no way to add elements** — users have no obvious way to create nodes on the canvas

---

### Issue 1: Templates Apply But Fields Render Empty

**Root Cause (2 layers):**

**Layer A — Non-deterministic field IDs in `constants.ts`:**
`DEFAULT_ORG_CHART_FIELDS` and `DEFAULT_OWNERSHIP_FIELDS` generated field IDs using `uuidv4()` at module scope. This means every process start, SSR render, or HMR cycle produces **different UUIDs** for the same fields. The template system (`templates.ts`) imports these constants to build template node data keyed by those volatile IDs.

**Layer B — `onApply` handler ignores `fieldSchema`:**
In `src/app/canvas/[diagramId]/page.tsx`, the `<TemplateGallery>` `onApply` callback only called `setNodes()` and `setEdges()`, but **did not** update `fieldSchema`, `layoutConfig`, or `diagramType` from the template result. Since the diagram's field schema (loaded from DB, or from a different module evaluation) has different field IDs than what the template node data uses, `OrgChartNode.getFieldValue('Name')` looks up `fieldSchema.find(f => f.label === 'Name')` → gets the DB field ID → reads `fields[dbFieldId]` → **empty**, because the template stored data under `fields[constantFieldId]`.

**Was this in the PRD/plan?**
The PRD (Section 5.2, FR-N01) specifies configurable field schemas, but does not address field ID stability. The development plan (Phase 4 — Templates) implemented the template gallery and hydration logic but did not account for the field ID mismatch between templates and existing diagrams.

**Fix Applied:**

1. **`src/lib/constants.ts`** — Replaced `uuidv4()` with deterministic string IDs:
   - Org chart: `field-org-name`, `field-org-title`, `field-org-department`, etc.
   - Ownership: `field-own-entity-name`, `field-own-entity-type`, etc.
   - These are stable across SSR/client, module reloads, and template ↔ schema matching.

2. **`src/app/canvas/[diagramId]/page.tsx`** — Updated `TemplateGallery.onApply` to also:
   - Call `setFieldSchema(result.fieldSchema)` to sync field IDs with template data
   - Call `setLayoutConfig(result.layoutConfig)`
   - Call `setDiagram(...)` with updated `diagramType` if the template type differs

---

### Issue 2: No Drag-and-Drop / No "Add Node" UI

**Root Cause:**
PRD FR-C02 (P0) specifies: "Add nodes via **toolbar**, double-click, or right-click context menu." The implementation only supported double-click on canvas for node creation. There was:
- No "Add Node" button in the toolbar
- No draggable node palette in the sidebar
- No `onDragOver`/`onDrop` handlers on the React Flow canvas

Users who didn't know about the double-click gesture had **no way to create nodes**.

**Was this in the PRD/plan?**
Yes — FR-C02 is Priority P0. The Completion Log shows "Wired node creation: double-click on canvas → create node at position" but toolbar- and drag-based creation were never implemented.

**Fix Applied:**

1. **`src/components/canvas/Topbar.tsx`** — Added `onAddNode` prop and a "+" button (with `Plus` icon) in the toolbar between undo/redo and layout controls.

2. **`src/components/canvas/LeftSidebar.tsx`** — Added a `<NodePalette>` section at the top of the sidebar with a draggable element:
   - Shows "Person / Position" for org charts, "Entity" for ownership diagrams
   - Uses HTML5 drag-and-drop API with `application/orgcanvas-node` data transfer type
   - Includes helper text: "Drag onto canvas or double-click canvas to add"

3. **`src/components/canvas/CanvasWrapper.tsx`** — Added `handleDragOver` and `handleDrop` event handlers to the `<ReactFlow>` component. Dropping a node palette element creates a new node at the drop position.

4. **`src/app/canvas/[diagramId]/page.tsx`** — Added `handleAddNode` callback that creates a node at a reasonable offset position and wired it to the Topbar's `onAddNode` prop (only shown for editors/owners).

---

### Files Modified

| File | Change |
|------|--------|
| `src/lib/constants.ts` | Replaced `uuidv4()` field IDs with deterministic strings |
| `src/app/canvas/[diagramId]/page.tsx` | Fixed template onApply to sync fieldSchema/layoutConfig/diagramType; added handleAddNode; wired onAddNode to Topbar |
| `src/components/canvas/Topbar.tsx` | Added `onAddNode` prop, Plus icon import, "Add Node" button |
| `src/components/canvas/CanvasWrapper.tsx` | Added onDragOver/onDrop handlers for drag-and-drop node creation |
| `src/components/canvas/LeftSidebar.tsx` | Added `<NodePalette>` draggable element section |

### Build & Test Status
- ✅ `npx vitest run` — 34/34 tests passing
- ✅ `npx next build` — compiled successfully (10 routes)

---

## 2026-02-16 — React Flow Container Height Fix (Critical)

### Problem
Nothing on the canvas worked — no double-click node creation, no "+" button, no templates rendering, no interactions at all. The only console output was:
```
[React Flow]: The React Flow parent container needs a width and a height to render the graph.
```

### Root Cause
The CSS height chain was broken. React Flow requires its parent container to have explicit dimensions. The layout chain was:

1. `<html>` → `<body>` — **no height, no flex**
2. Canvas page returned `<ReactFlowProvider>` → `<Topbar>` + `<div className="flex flex-1">` as **siblings** with no shared flex-column parent
3. `<CanvasWrapper>` → `<div className="flex-1 relative">` — `flex-1` computed to **0px** because no ancestor established a height context

Since the React Flow container had **zero height**, it rendered nothing and all click/drag events were unreachable.

### Fix Applied

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Added `min-h-screen flex flex-col` to `<body>` so the root layout establishes a full-viewport flex column |
| `src/app/canvas/[diagramId]/page.tsx` | Wrapped Topbar + content area in `<div className="flex flex-col h-screen w-screen overflow-hidden">` to create a proper full-screen flex column container |
| `src/components/canvas/CanvasWrapper.tsx` | Added `h-full w-full` to the ReactFlow parent `<div>` to explicitly fill available space |

### Build & Test Status
- ✅ `npx next build` — compiled successfully (10 routes)
- ✅ `npx vitest run` — 34/34 tests passing

---

## 2026-02-16 — Floating Canvas Toolbar (Miro-style)

### What Changed
Added a dark pill-shaped floating toolbar at the bottom center of the canvas, replacing scattered Topbar buttons. Includes new Text and Sticky Note annotation node types.

### New Files Created

| File | Purpose |
|------|---------|
| `src/components/canvas/CanvasToolbar.tsx` | Floating dark toolbar with tool buttons, action buttons, More dropdown, and toggle group |
| `src/components/canvas/TextNode.tsx` | Editable text annotation node (double-click to edit, Shift+Enter for newlines) |
| `src/components/canvas/StickyNode.tsx` | Colored sticky note node with 6-color picker, folded corner CSS effect |

### Modified Files

| File | Change |
|------|--------|
| `src/stores/canvasStore.ts` | Added `CanvasToolMode` type (`select\|addNode\|addText\|addSticky\|connect`), `STICKY_COLORS` constant, `activeTool`/`showMinimap`/`snapToGrid` state, `setActiveTool`/`setShowMinimap`/`setSnapToGrid` actions, `addTextNode`/`addStickyNode` actions |
| `src/components/canvas/CanvasWrapper.tsx` | Registered `textNode`/`stickyNode` in `nodeTypes`, added `handlePaneClick` for tool-aware placement, updated `handleDrop` for text/sticky drag types, added cursor styling, conditional minimap, snap-to-grid |
| `src/components/canvas/Topbar.tsx` | Removed buttons moved to floating toolbar (Import, Export, Templates, Comments, Presentation, Add Node) — kept Back, Sidebar, Name, Undo/Redo, Layout, Search, Filter, Bulk Edit, Share, History, Members, Theme |
| `src/app/canvas/[diagramId]/page.tsx` | Added `<CanvasToolbar>` in canvas area, added keyboard shortcuts (V/N/T/S/C/M/Escape), simplified Topbar props, removed unused `handleExport`/`handleAddNode` callbacks |

### Keyboard Shortcuts
`V` Select, `N` Add Node, `T` Text, `S` Sticky Note, `C` Connect, `M` Toggle Minimap, `Escape` Back to Select

### Build & Test Status
- ✅ `npx next build` — compiled successfully (10 routes)
- ✅ `npx vitest run` — 34/34 tests passing

---

## 2026-02-16 — Refactoring: Unused Imports & Dead Code Cleanup

### Issues Found & Fixed

| File | Issue | Fix |
|------|-------|-----|
| `src/stores/canvasStore.ts` | `addEdge` imported from `@xyflow/react` but never used | Removed import |
| `src/components/canvas/CanvasToolbar.tsx` | `useState` imported from React but never used | Removed import |
| `src/components/canvas/CanvasWrapper.tsx` | `useState` and `useReactFlow` imported but never used | Removed both |
| `src/app/canvas/[diagramId]/page.tsx` | `ActivityLog` imported but never rendered in JSX | Removed import |
| `src/app/canvas/[diagramId]/page.tsx` | `activityOpen`/`setActivityOpen` state declared but never used | Removed state |
| `src/app/canvas/[diagramId]/page.tsx` | Redundant `canEdit` ternary on `onImport` prop inside already-guarded `{canEdit && ...}` block | Simplified to direct callback |
| `src/components/canvas/LeftSidebar.tsx` | `addNode` destructured from store but never called | Removed from destructure |

### Build & Test Status
- ✅ `npx next build` — compiled successfully (10 routes)
- ✅ `npx vitest run` — 34/34 tests passing

---

## 2026-02-16 — Multi-Parent Ownership Import (Comma-Separated Parent IDs)

### Problem
When importing ownership diagrams from Excel, entities with multiple parent shareholders (e.g. `parent_entity_id = "ENT001, ENT000"`) were not recognized. The import wizard treated the entire comma-separated string as a single parent ID, found no match, and created no edges.

### Root Cause
The import wizard (`ExcelImportWizard.tsx`) used `String(row[parentColumn]).trim()` as a single parent ID lookup. No splitting logic existed for multi-parent relationships.

Additionally, the edge type was hardcoded to `'smoothstep'` for all imports (line 241), even for ownership diagrams which need `'ownershipEdge'` to display percentage labels.

### Changes Made

**`src/components/canvas/ExcelImportWizard.tsx`:**

1. **Validation (multi-parent split)** — Changed parent ID validation to split on commas/semicolons (`/[,;]+/`), trimming each part. Each parent ID is validated individually against the ID column. Previously a single-string lookup.

2. **Edge creation (multi-parent + ownership % split)** — Complete rewrite of edge creation loop:
   - Splits `parent_entity_id` on commas/semicolons into individual parent IDs
   - Splits `ownership_pct` the same way. If comma-separated values match parent count → 1:1 pairing. If single value → divides equally among parents. If count mismatch → uses available values, pads with 0.
   - Added `edgeDedup` Set to prevent duplicate source→target edges (possible when same relationship appears in multiple rows)
   - Example: `parent_entity_id = "ENT001, ENT000"` + `ownership_pct = "60, 40"` → creates two edges: ENT001→child (60%) and ENT000→child (40%)

3. **Edge type fix** — Changed `type: 'smoothstep'` to `type: diagramType === 'ownership' ? 'ownershipEdge' : 'smoothstep'` so ownership edges render with percentage labels.

4. **Template update** — Updated the downloadable ownership template to show a multi-parent example: added ENT000 as a second holding company, and ENT003 with `parent_entity_id = "ENT001, ENT000"` and `ownership_pct = "50, 25"`.

5. **Preview stats fix** — Entity count now uses `Set` deduplication for ownership diagrams (since multiple rows may share the same entity ID). Relationship count now sums individual parent IDs after comma-splitting, instead of counting rows with any parent value.

### Supported Excel Formats After This Change

**Format A — One row per relationship (exported format):**
| entity_id | parent_entity_id | ownership_pct |
|-----------|-----------------|---------------|
| ENT002 | ENT001 | 60 |
| ENT002 | ENT000 | 40 |

**Format B — Comma-separated parents (user-friendly format):**
| entity_id | parent_entity_id | ownership_pct |
|-----------|-----------------|---------------|
| ENT002 | ENT001, ENT000 | 60, 40 |

**Format C — Single % divided equally:**
| entity_id | parent_entity_id | ownership_pct |
|-----------|-----------------|---------------|
| ENT002 | ENT001, ENT000 | 100 |
→ Creates two edges at 50% each.

### Build & Test Status
- ✅ `npx next build` — compiled successfully (10 routes)
- ✅ `npx vitest run` — 34/34 tests passing
