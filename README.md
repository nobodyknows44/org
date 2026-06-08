# OrgCanvas

A browser-based canvas application for building and visualizing **Organizational Charts** and **Corporate Ownership Diagrams**. Built with Next.js, React Flow, and Supabase.

## Features

### Core Canvas
- **Drag-and-drop** node creation and editing (double-click to create)
- **React Flow** powered infinite canvas with pan, zoom, and selection
- **Auto-layout** via ELK.js with configurable direction (top-down, left-right, etc.)
- **Undo/Redo** with 50-step history
- **Keyboard shortcuts** for power users

### Org Chart Mode
- Department color-coded node headers
- Single-parent hierarchy enforcement
- Inline field editing for name, title, department, email, phone, location, start date, reports to

### Ownership Mode
- Multi-parent DAG (directed acyclic graph) with cycle detection
- Ownership percentage labels on edges
- Entity type color coding (Holding, Subsidiary, JV, SPV, Trust, Individual)
- Edge metadata: share class, voting rights, effective date

### Import / Export
- **Excel Import** wizard with column mapping, preview, and validation
- **Excel Export** round-trip compatible (.xlsx)
- **PDF/PNG/SVG** export via html-to-image and jsPDF

### Collaboration
- **Real-time sync** via Supabase Realtime (Broadcast channels)
- **Cursor presence** with colored labels
- **Collaborators panel** showing online users

### Version History
- Auto-save snapshots every 5 minutes
- Manual snapshot creation
- Browse and restore past diagram states

### Access Control
- **Role-based access**: Owner / Editor / Viewer
- Viewers see read-only diagrams
- Owners manage workspace members

### Advanced UX
- **Minimap** for overview navigation
- **Breadcrumb navigation** from root to selected node
- **Filter panel** (Department, Location, Entity Type) with opacity fade
- **Search** (Ctrl+F) with fuzzy matching via Fuse.js
- **Per-node field visibility** overrides
- **Subtree collapse** with hidden node count badge
- **Alignment guides** during drag (snap-to-grid)
- **Share links** with optional password protection
- **Onboarding overlay** for first-time users
- **Empty state** illustrations

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| Canvas | @xyflow/react v12 (React Flow) |
| Layout | ELK.js (with Web Worker support) |
| State | Zustand + Immer |
| Backend | Supabase (Auth, Database, Realtime, RLS) |
| Import | SheetJS (xlsx) |
| Export | html-to-image, jsPDF |
| Search | Fuse.js |
| Testing | Vitest + jsdom + @testing-library |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- Supabase project (free tier works)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd orgchart

# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
```

### Environment Variables

Edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Database Setup

Run the migration files in your Supabase SQL editor:

1. `supabase/migrations/00001_initial_schema.sql` — Tables, RLS policies, types
2. `supabase/migrations/00002_performance_indexes.sql` — Indexes and batch RPC

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Build

```bash
# Production build
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run all tests
npx vitest run

# Watch mode
npx vitest
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── auth/               # Login, signup, callback
│   ├── canvas/[diagramId]/ # Main canvas editor
│   ├── dashboard/          # Workspace & diagram management
│   ├── settings/           # User & workspace settings
│   └── view/[shareId]/     # Public read-only view
├── components/
│   ├── canvas/             # Canvas-specific components
│   │   ├── CanvasWrapper   # React Flow container
│   │   ├── OrgChartNode    # Org chart node renderer
│   │   ├── OwnershipNode   # Ownership node renderer
│   │   ├── OwnershipEdge   # Custom edge with % label
│   │   ├── Topbar          # Toolbar with actions
│   │   ├── NodeInspector   # Right sidebar editor
│   │   ├── EdgeInspector   # Edge metadata editor
│   │   ├── LeftSidebar     # Schema & visibility editor
│   │   ├── FilterPanel     # Node filtering
│   │   ├── SearchBar       # Fuzzy search
│   │   ├── BreadcrumbNav   # Path navigation
│   │   ├── ExcelImportWizard # 5-step import
│   │   ├── ExportDialog    # Multi-format export
│   │   └── ...             # More components
│   ├── ui/                 # shadcn/ui components
│   └── workspace/          # Workspace management
├── hooks/                  # Custom React hooks
├── lib/
│   ├── supabase/           # Supabase client & services
│   ├── layout/             # ELK.js layout engine
│   ├── validation/         # Cycle detection
│   ├── export/             # Excel export utilities
│   ├── analytics.ts        # PostHog integration
│   └── errorMonitor.ts     # Sentry integration
├── stores/                 # Zustand state stores
├── test/                   # Test files
└── types/                  # TypeScript definitions
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+F` | Search |
| `Ctrl+D` | Duplicate selected node |
| `Delete` / `Backspace` | Delete selected nodes |
| `Arrow keys` | Nudge selected nodes (1px) |
| `Shift+Arrow keys` | Nudge selected nodes (10px) |
| `Double-click canvas` | Create new node |
| `Right-click node` | Context menu (duplicate, pin, collapse, field visibility) |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Production Checklist

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Run database migrations on production Supabase
- [ ] (Optional) Set `NEXT_PUBLIC_SENTRY_DSN` for error monitoring
- [ ] (Optional) Set `NEXT_PUBLIC_POSTHOG_KEY` for analytics
- [ ] Configure custom domain and DNS
- [ ] Enable Supabase Realtime for collaboration

## Architecture

```
┌──────────────────────────────────────────┐
│                  Browser                  │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐  │
│  │ React   │ │ Zustand  │ │ React    │  │
│  │ Flow    │ │ Store    │ │ Flow     │  │
│  │ Canvas  │ │ (Immer)  │ │ Provider │  │
│  └────┬────┘ └────┬─────┘ └──────────┘  │
│       │           │                       │
│  ┌────┴───────────┴────┐                 │
│  │   Supabase Client   │                 │
│  └──────────┬──────────┘                 │
└─────────────┼────────────────────────────┘
              │
┌─────────────┼────────────────────────────┐
│  Supabase   │                            │
│  ┌─────────┴──────┐  ┌──────────────┐   │
│  │  PostgreSQL    │  │  Realtime     │   │
│  │  (RLS enabled) │  │  (Broadcast)  │   │
│  └────────────────┘  └──────────────┘   │
│  ┌────────────────┐  ┌──────────────┐   │
│  │  Auth           │  │  Storage     │   │
│  └────────────────┘  └──────────────┘   │
└──────────────────────────────────────────┘
```

## License

Private — All rights reserved.
