1. Executive Summary
OrgCanvas is a purpose-built, browser-based canvas application designed to replace PowerPoint as the tool for creating, maintaining, and sharing organizational structures and corporate ownership diagrams within our group of companies. The application provides a dedicated visual workspace — similar in interaction model to Miro — but laser-focused on two use cases: hierarchical org charts and multi-parent ownership structures.
The platform will drastically reduce the time spent manually laying out boxes and lines in presentation software by offering intelligent auto-alignment, configurable field schemas, toggle-based visibility controls, Excel-based import with pre-defined relationships, and one-click PDF export. It will be deployed as a modern web application using Next.js on Vercel, with Supabase as the backend, and source-controlled via GitHub.
2. Problem Statement
Currently, our group of companies relies on PowerPoint to build and maintain org structures and ownership diagrams. This approach suffers from several critical pain points:
•	Time-intensive manual layout: Every box, connector, and alignment must be done by hand. Even small changes cascade into extensive reformatting.
•	No structured data: Names, titles, departments, and emails are free-text inside shapes with no schema, making bulk updates impossible.
•	No import/export pipeline: Structures cannot be programmatically generated from HR systems or Excel rosters; every chart is built from scratch.
•	Ownership structures are fundamentally different from org charts: Ownership diagrams allow multiple parents (e.g., a subsidiary owned by two holding companies), while org charts enforce single-parent hierarchies. PowerPoint has no concept of either.
•	Version sprawl: Multiple outdated copies of .pptx files circulate across email threads, SharePoint folders, and desktops with no single source of truth.
•	No collaboration: Only one person can edit at a time, and real-time co-editing in PowerPoint Online is unreliable for complex diagrams.
3. Proposed Solution
OrgCanvas is a web-based canvas application purpose-built for two distinct diagram types:

3.1 Org Structure Mode (Tree / Single-Parent Hierarchy)
•	Each node has exactly one parent (except the root node).
•	Represents reporting lines: CEO → VP → Director → Manager → Employee.
•	Automatic top-down or left-to-right tree layout.
•	Drag-and-drop to reassign reporting lines (re-parents the node and its subtree).
3.2 Ownership Structure Mode (DAG / Multi-Parent Graph)
•	A node (company/entity) can have multiple parents (e.g., Joint Venture owned 50/50 by two holding companies).
•	Edges carry metadata: ownership percentage, share class, voting rights.
•	Supports cycles prevention (Directed Acyclic Graph validation).
•	Layout engine handles multi-parent fan-in gracefully without overlapping connectors.
3.3 Shared Capabilities
•	Configurable node fields (Name, Title, Department, Email, Phone, Cost Center, etc.) defined as a schema, not free text.
•	Per-field visibility toggles: show/hide any field globally or per-node for clean presentation views.
•	Intelligent auto-alignment and auto-layout that respects the diagram type’s constraints.
•	Excel import with relationship columns (parent ID, ownership %) to bootstrap large diagrams instantly.
•	High-fidelity PDF export (vector-quality, multi-page support for large charts).
•	Real-time collaboration with presence indicators and conflict resolution.
•	Version history with visual diff.
 
4. Technology Stack & Architecture
Layer	Technology	Rationale
Frontend Framework	Next.js 14+ (App Router, TypeScript)	Server components, API routes, optimal DX, Vercel-native
Canvas Engine	React Flow (@xyflow/react) v12	Purpose-built for node-based graphs, handles pan/zoom, minimap, and edge routing natively
State Management	Zustand + Immer	Lightweight, immutable state with undo/redo middleware
Styling	Tailwind CSS + shadcn/ui	Rapid UI development, consistent design system, accessible components
Auto-Layout Engine	ELK.js (Eclipse Layout Kernel)	Industry-grade hierarchical layout; supports both tree and layered/DAG layouts
PDF Export	React-pdf (@react-pdf/renderer) + custom SVG pipeline	Vector-quality PDF output; alternatively html2canvas + jsPDF for pixel-perfect match
Excel Import/Export	SheetJS (xlsx)	Robust .xlsx/.csv parsing and generation, runs client-side
Hosting & CDN	Vercel	Zero-config Next.js deployment, edge functions, preview deployments per PR
Backend / Database	Supabase (PostgreSQL + Auth + Realtime + Storage)	Managed Postgres with row-level security, built-in auth, WebSocket realtime for collaboration, file storage for exports
Realtime Collaboration	Supabase Realtime (Broadcast + Presence)	Lightweight alternative to Yjs/CRDT for cursor presence and change broadcasting
Source Control & CI/CD	GitHub + GitHub Actions	PR-based workflow, automated lint/test/deploy pipelines, Vercel GitHub integration
Image Handling	Supabase Storage + Sharp	Profile photos, company logos with on-the-fly optimization
Error Monitoring	Sentry	Real-time error tracking, performance monitoring, session replay
Analytics	PostHog (self-hosted or cloud)	Product analytics, feature flags, session recording — privacy-first

4.1 High-Level Architecture Diagram
The system follows a standard Jamstack-inspired architecture:
•	Browser → Next.js (Vercel Edge) → Supabase (Postgres + Auth + Realtime + Storage)
•	All canvas state is persisted in Supabase Postgres with JSONB columns for node positions and field schemas.
•	Realtime collaboration uses Supabase Broadcast channels scoped per-diagram.
•	PDF generation runs client-side (no server dependency) using the canvas state snapshot.
•	Excel import is fully client-side via SheetJS; parsed data is validated and written to Supabase via API.
4.2 Database Schema Overview
Table	Key Columns	Purpose
workspaces	id, name, owner_id, settings (JSONB), created_at	Top-level container (one per business group)
diagrams	id, workspace_id, name, type (enum: org_chart | ownership), field_schema (JSONB), layout_config (JSONB), version	Individual diagram with its field definitions and layout settings
nodes	id, diagram_id, parent_ids (UUID[]), data (JSONB), position_x, position_y, style_overrides (JSONB)	Each box on the canvas; parent_ids is an array (single for org, multiple for ownership)
edges	id, diagram_id, source_node_id, target_node_id, metadata (JSONB: ownership_pct, share_class, etc.)	Connections between nodes with optional metadata
diagram_versions	id, diagram_id, snapshot (JSONB), created_by, created_at	Full diagram snapshots for version history
users	Managed by Supabase Auth	Authentication, profiles, roles
workspace_members	workspace_id, user_id, role (enum: owner | editor | viewer)	Access control per workspace
 
5. Functional Requirements
5.1 Canvas & Interaction
ID	Requirement	Priority	Acceptance Criteria
FR-C01	Infinite pannable and zoomable canvas	P0	User can pan via drag, scroll to zoom (10%–400%), pinch-to-zoom on touch devices
FR-C02	Add nodes via toolbar, double-click, or right-click context menu	P0	Node appears at click position with default field values from schema
FR-C03	Connect nodes by dragging from source handle to target handle	P0	Edge is created; ownership mode allows multiple incoming edges; org mode prevents it
FR-C04	Select single or multiple nodes (marquee / Shift+click)	P0	Selection highlights, shared toolbar appears for bulk actions (delete, move, style)
FR-C05	Undo / Redo (Ctrl+Z / Ctrl+Shift+Z) with 50-step history	P0	All canvas mutations are reversible including add, delete, move, connect, field edit
FR-C06	Minimap for navigation on large diagrams	P1	Minimap renders in corner, shows viewport rectangle, click-to-navigate
FR-C07	Keyboard shortcuts (Delete, Ctrl+A, Ctrl+D duplicate, Arrow keys nudge)	P1	Standard shortcuts work; custom shortcut panel accessible via ‘?’ key
FR-C08	Snap-to-grid and alignment guides while dragging	P1	Visual guides appear when nodes align horizontally or vertically with siblings
FR-C09	Node grouping / containers (e.g., group by department or legal entity)	P2	Groups are collapsible; child nodes move with group; group has its own label and color

5.2 Node Configuration & Field Schema
ID	Requirement	Priority	Acceptance Criteria
FR-N01	Configurable field schema per diagram type	P0	Admin defines fields: Name, Title, Department, Email, Phone, Employee ID, Cost Center, Photo URL. Each field has: label, type (text/email/select/url/number), required flag, default value
FR-N02	Field values are typed and validated on input	P0	Email fields validate format; select fields show dropdown; number fields accept only digits
FR-N03	Global field visibility toggles	P0	A panel lists all schema fields with on/off toggles. Toggling hides the field on ALL nodes simultaneously (for clean export views)
FR-N04	Per-node field override for visibility	P1	Right-click node → ‘Field Visibility’ → override global toggle for specific nodes
FR-N05	Inline editing on the canvas	P0	Double-click a node field to edit in place; Tab to move to next field; Enter to confirm
FR-N06	Node styling: color, border, shape (rectangle/rounded/pill), avatar/logo	P1	Style picker accessible from node context menu; colors apply to header bar of node card
FR-N07	Ownership edge metadata: percentage, share class, voting rights, effective date	P0	Edge inspector panel shows editable fields; percentage label renders on the edge connector
FR-N08	Custom field support: users can add their own fields to the schema	P1	Add Field button in schema editor; field appears on all nodes; drag to reorder

5.3 Auto-Layout Engine
ID	Requirement	Priority	Acceptance Criteria
FR-L01	One-click auto-layout that respects diagram type	P0	Org chart: top-down tree. Ownership: layered DAG. Layout runs via ELK.js with animation
FR-L02	Layout direction options: top-down, left-to-right, bottom-up, right-to-left	P1	Dropdown selector; layout re-runs on direction change
FR-L03	Configurable spacing (horizontal gap, vertical gap, node width)	P1	Sliders in layout settings panel; preview updates live
FR-L04	Preserve manual position overrides after auto-layout	P2	Nodes flagged as ‘pinned’ are excluded from auto-layout; others flow around them
FR-L05	Compact / Expanded layout modes	P1	Compact collapses empty space; Expanded maximizes readability for presentation
FR-L06	Subtree collapse/expand	P0	Click chevron on a node to collapse its entire subtree into a badge showing count (+12)
 
5.4 Import & Export
ID	Requirement	Priority	Acceptance Criteria
FR-IE01	Excel import (.xlsx / .csv) with relationship mapping	P0	Upload wizard: (1) Upload file, (2) Map columns to schema fields, (3) Map parent column (org) or parent columns + % (ownership), (4) Preview, (5) Import. Validation errors shown inline
FR-IE02	Excel template download (pre-configured with correct columns for each diagram type)	P0	Download button generates .xlsx with headers matching current schema + relationship columns + example rows
FR-IE03	PDF export (single page or multi-page for large diagrams)	P0	Export dialog: page size (A4/A3/Letter), orientation, margins, fit-to-page or multi-page tiling. Output is vector-quality PDF
FR-IE04	PNG / SVG export	P1	Export current viewport or full diagram; SVG preserves editability; PNG supports 1x/2x/3x resolution
FR-IE05	Excel export (data + relationships)	P1	Exports all node data with parent ID(s) and edge metadata back to .xlsx for round-trip editing
FR-IE06	PowerPoint export (.pptx)	P2	Generates a single slide (or multi-slide) with the diagram rendered as shapes for presentation use
FR-IE07	Shareable link (view-only or edit)	P1	Generate unique URL with optional password protection and expiration date

5.5 Collaboration & Access Control
ID	Requirement	Priority	Acceptance Criteria
FR-AC01	Workspace-based access: Owner, Editor, Viewer roles	P0	Owner manages members; Editor can modify diagrams; Viewer is read-only
FR-AC02	SSO / email-based authentication via Supabase Auth	P0	Email + password, Magic Link, and Google/Microsoft SSO support
FR-AC03	Real-time cursor presence (see who is viewing/editing)	P1	Colored cursors with name labels appear on the canvas for each active user
FR-AC04	Real-time change sync (collaborative editing)	P1	Node moves, field edits, and edge changes propagate to all connected users within 500ms
FR-AC05	Activity log per diagram (who changed what, when)	P2	Audit trail stored in Supabase; filterable by user, action type, date range
FR-AC06	Version history with restore capability	P1	Auto-save creates snapshot every 5 minutes and on major actions; user can browse and restore any version

5.6 Search & Navigation
ID	Requirement	Priority	Acceptance Criteria
FR-S01	Global search across all node fields (Ctrl+F)	P0	Fuzzy search highlights matching nodes; pressing Enter zooms to next match
FR-S02	Filter panel: filter visible nodes by department, location, entity type	P1	Multi-select filters; non-matching nodes fade to 20% opacity
FR-S03	Breadcrumb trail showing path from root to selected node	P1	Clickable breadcrumbs for quick navigation up the hierarchy
 
6. Non-Functional Requirements
Category	Requirement	Target
Performance	Canvas interaction (pan, zoom, drag) at 60fps	Up to 500 nodes rendered simultaneously without jank
Performance	Auto-layout computation	< 2 seconds for 500-node diagram
Performance	Initial page load (LCP)	< 2.5 seconds on 4G connection
Performance	PDF export generation	< 5 seconds for 200-node diagram
Scalability	Maximum diagram size	1,000 nodes per diagram; 50 diagrams per workspace
Availability	Uptime SLA (Vercel + Supabase)	99.9% monthly uptime
Security	Data at rest encryption	AES-256 via Supabase/Postgres
Security	Data in transit	TLS 1.3 enforced on all endpoints
Security	Authentication	Supabase Auth with JWT; sessions expire after 24h inactivity
Security	Row-level security (RLS)	All database queries enforced via Supabase RLS policies
Accessibility	WCAG 2.1 AA compliance	Keyboard-navigable canvas, ARIA labels, focus indicators, color contrast ratios
Browser Support	Latest 2 versions of Chrome, Firefox, Safari, Edge	Core functionality works; canvas rendering tested cross-browser
Responsiveness	Desktop-first; tablet usable	Minimum 1024px width; touch gestures for pan/zoom on tablet
Internationalization	UI language	English (initial); architecture supports i18n via next-intl for future locales
Data Residency	Supabase region	EU (Frankfurt) or US (East) — configurable per deployment
 
7. User Personas & Key User Stories
7.1 Personas
Persona	Role	Key Need
Anna (HR Director)	Maintains org charts for 3 group companies (~800 employees total)	Bulk import from HR system (Excel), toggle fields for presentation vs. data view, quick PDF export for board packs
Viktor (CFO / Legal)	Maintains corporate ownership structure across 15 legal entities	Multi-parent relationships with ownership %, share class labels, audit-ready PDF exports
Dmitri (IT Admin)	Manages user access and deployments	SSO integration, role-based access, deployment automation via GitHub
Elena (CEO)	Reviews and approves structures; presents at board meetings	Read-only view, clean presentation mode, shareable links

7.2 Key User Stories
1.	As Anna, I want to upload an Excel file with employee data and reporting relationships so that I can generate an org chart in seconds instead of hours in PowerPoint.
2.	As Anna, I want to toggle off Email and Phone fields before exporting to PDF so that the board pack shows only Name, Title, and Department.
3.	As Viktor, I want to create an ownership diagram where Entity C is owned 60% by Entity A and 40% by Entity B, with percentage labels on the connectors.
4.	As Viktor, I want the system to prevent me from creating a circular ownership loop (A owns B owns C owns A).
5.	As Elena, I want a view-only link with a clean, auto-aligned diagram that I can present directly in a board meeting without further editing.
6.	As Dmitri, I want to configure SSO via Google Workspace so that all employees can log in with their corporate email without separate credentials.
7.	As Anna, I want to search for an employee by name and have the canvas auto-zoom to their node so I can quickly verify their position.
8.	As Viktor, I want to export the ownership structure back to Excel so that I can share it with external auditors who don’t have access to the app.
 
8. UI/UX Specifications
8.1 Layout & Panels
•	Topbar: Workspace name, diagram name (editable), layout controls, export button, share button, user avatar menu.
•	Left Sidebar (collapsible): Diagram list, search, field schema editor, global field visibility toggles.
•	Canvas (center): The main infinite canvas area with React Flow rendering.
•	Right Sidebar (collapsible, context-sensitive): Node inspector (when node selected), Edge inspector (when edge selected), Layout settings.
•	Bottom Bar: Zoom controls, minimap toggle, grid toggle, help shortcut hint.
8.2 Node Card Design
•	Org Chart Node: Card with colored header bar (by department), avatar/photo (optional), Name (bold, primary), Title (secondary), and additional fields stacked below based on visibility settings.
•	Ownership Node: Card with entity logo (optional), Entity Name (bold), Entity Type tag (Holding, Subsidiary, JV, SPV, Trust, etc.), Jurisdiction, Registration Number, and additional custom fields.
•	Edge Labels: Ownership % displayed on the midpoint of the connector with a pill-shaped background. Hover to expand full metadata (share class, voting rights, effective date).
8.3 Interaction Patterns
•	Single-click: Select node/edge.
•	Double-click on canvas: Create new node at position.
•	Double-click on node: Enter inline edit mode for primary field.
•	Drag from handle: Create edge (connection).
•	Right-click: Context menu (Edit, Duplicate, Delete, Pin, Style, Collapse Subtree).
•	Ctrl+Drag: Multi-select marquee.
9. Excel Import Specification
The Excel import workflow is critical for bootstrapping large diagrams. Below are the expected template structures for each diagram type.
9.1 Org Chart Template
Column	Type	Required	Description
employee_id	String/Number	Yes	Unique identifier for this person/position
name	String	Yes	Full name of the employee
title	String	Yes	Job title
department	String	No	Department name (used for color coding)
email	Email	No	Work email address
phone	String	No	Phone number
reports_to	String/Number	Yes*	The employee_id of the direct manager. Blank = root node. *Root has no parent
location	String	No	Office location
photo_url	URL	No	URL to profile photo
9.2 Ownership Structure Template
Column	Type	Required	Description
entity_id	String/Number	Yes	Unique identifier for this entity
entity_name	String	Yes	Legal name of the entity
entity_type	Enum	Yes	Holding, Subsidiary, JV, SPV, Trust, Individual, etc.
jurisdiction	String	No	Country/state of incorporation
registration_no	String	No	Company registration / tax ID number
parent_entity_id	String/Number	Yes*	The entity_id of the parent owner. *One row per parent relationship
ownership_pct	Number	Yes*	Ownership percentage (0–100). *Required when parent is specified
share_class	String	No	Class of shares (Common, Preferred A, etc.)
voting_rights	Boolean	No	Whether this share class carries voting rights
effective_date	Date	No	Date the ownership became effective
Note: For ownership structures, an entity with two parents requires two rows in the spreadsheet — one per parent relationship. The import engine will deduplicate the entity node and create multiple incoming edges.
 
10. API Endpoints (Supabase + Next.js API Routes)
Method	Endpoint	Description	Auth
GET	/api/workspaces	List all workspaces for authenticated user	Required
POST	/api/workspaces	Create new workspace	Required (Owner)
GET	/api/workspaces/:id/diagrams	List diagrams in workspace	Required (Member)
POST	/api/workspaces/:id/diagrams	Create new diagram	Required (Editor+)
GET	/api/diagrams/:id	Get full diagram (nodes, edges, schema, layout)	Required (Member)
PATCH	/api/diagrams/:id	Update diagram metadata, schema, layout config	Required (Editor+)
POST	/api/diagrams/:id/nodes	Create node	Required (Editor+)
PATCH	/api/diagrams/:id/nodes/:nodeId	Update node data/position	Required (Editor+)
DELETE	/api/diagrams/:id/nodes/:nodeId	Delete node (cascades to edges)	Required (Editor+)
POST	/api/diagrams/:id/edges	Create edge	Required (Editor+)
PATCH	/api/diagrams/:id/edges/:edgeId	Update edge metadata	Required (Editor+)
DELETE	/api/diagrams/:id/edges/:edgeId	Delete edge	Required (Editor+)
POST	/api/diagrams/:id/import	Import from Excel (bulk upsert)	Required (Editor+)
GET	/api/diagrams/:id/export/pdf	Trigger PDF generation	Required (Viewer+)
GET	/api/diagrams/:id/versions	List version history	Required (Member)
POST	/api/diagrams/:id/versions/:vId/restore	Restore a version	Required (Editor+)
 
11. Glossary
Term	Definition
Org Chart	A single-parent hierarchical tree showing reporting relationships within an organization. Each person reports to exactly one manager.
Ownership Structure	A directed acyclic graph (DAG) showing how legal entities own or control other entities. A single entity can have multiple owners (parents).
DAG	Directed Acyclic Graph — a graph where edges have direction and no cycles exist. Used for ownership structures.
Node	A box/card on the canvas representing a person (org chart) or legal entity (ownership structure).
Edge	A connector/line between two nodes representing a relationship (reports-to or owns).
Field Schema	The configurable definition of what data fields appear on each node (e.g., Name, Title, Email).
ELK.js	Eclipse Layout Kernel compiled to JavaScript — an automatic graph layout engine.
React Flow	An open-source React library for building node-based UIs and interactive diagrams.
RLS	Row-Level Security — a Supabase/Postgres feature that enforces access control at the database level.
CRDT	Conflict-free Replicated Data Type — a data structure for eventual consistency in collaborative editing.
 
15. Appendix
15.1 Repository Structure
The recommended monorepo structure for the project:
orgcanvas/
├── .github/workflows/       # CI/CD: lint, test, deploy
├── public/                   # Static assets
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── (auth)/            # Login, signup, callback
│   │   ├── dashboard/         # Workspace & diagram list
│   │   └── canvas/[id]/       # Main canvas view
│   ├── components/
│   │   ├── canvas/            # React Flow wrapper, custom nodes, edges
│   │   ├── panels/            # Sidebar panels, inspectors
│   │   ├── import/            # Excel import wizard
│   │   └── ui/                # shadcn/ui components
│   ├── lib/
│   │   ├── supabase/          # Client, types, RLS helpers
│   │   ├── layout/            # ELK.js integration
│   │   ├── export/            # PDF, PNG, SVG generators
│   │   └── validation/        # Schema validation, DAG cycle check
│   ├── stores/                # Zustand stores
│   └── types/                 # TypeScript types & interfaces
├── supabase/
│   ├── migrations/            # SQL migration files
│   └── seed.sql               # Development seed data
├── tests/                    # Vitest + Playwright
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json

15.2 Environment Variables
Variable	Source	Description
NEXT_PUBLIC_SUPABASE_URL	Supabase Dashboard	Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY	Supabase Dashboard	Public anonymous API key
SUPABASE_SERVICE_ROLE_KEY	Supabase Dashboard (secret)	Server-side key for admin operations
NEXT_PUBLIC_APP_URL	Vercel	Deployment URL for OAuth redirects
SENTRY_DSN	Sentry Dashboard	Error monitoring endpoint
POSTHOG_KEY	PostHog Dashboard	Product analytics API key
