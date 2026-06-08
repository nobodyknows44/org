1. Development Strategy & Principles
This development plan follows an iterative, phased approach designed for execution by an AI coding agent with Product Owner review. Each phase delivers a shippable increment that can be tested by stakeholders.
Core Principles:
•	Ship Early, Ship Often: Every sprint produces a deployable preview on Vercel. Stakeholders can test on real URLs.
•	Vertical Slices: Each feature is built end-to-end (UI + API + DB + test) rather than layer-by-layer. This ensures every sprint is demonstrable.
•	Schema-First Development: Database migrations and TypeScript types are defined before implementation begins. Supabase types are auto-generated.
•	Progressive Enhancement: The MVP works with basic features (no real-time, no ownership mode). Collaboration and advanced modes are layered on top.
•	Test as You Go: Every feature has unit tests (Vitest) and critical paths have E2E tests (Playwright). No separate “testing phase.”
•	AI-Agent Optimized: Tasks are structured as discrete, well-scoped units with clear acceptance criteria. Each task includes the files to create/modify, the patterns to follow, and the expected output.
 
2. Phase Overview & Timeline
The project spans 14 working weeks across 4 phases, plus a pre-development setup sprint and post-launch iteration track.

Phase	Name	Weeks	Sprints	Key Outcome
0	Project Setup & Infrastructure	Week 0 (3 days)	—	Repo, CI/CD, Supabase schema, Auth, empty shell deployed to Vercel
1	MVP: Core Canvas & Org Charts	Weeks 1–6	S1–S3	Fully functional org chart builder with Excel import, auto-layout, PDF export, and field toggles
2	Ownership Mode & Collaboration	Weeks 7–10	S4–S5	Multi-parent ownership diagrams, real-time collaboration, version history
3	Polish, Scale & Launch	Weeks 11–14	S6–S7	Advanced UX, search/filter, performance optimization, monitoring, production launch
4	Post-Launch Iteration	Weeks 15+	Ongoing	User feedback, PPTX export, node grouping, SSO providers, i18n

Visual Timeline:
Wk 0	Wk 1	Wk 2	Wk 3	Wk 4	Wk 5	Wk 6	Wk 7	Wk 8	Wk 9	Wk 10	Wk 11	Wk 12	Wk 13	Wk 14
Setup	S1	S1	S2	S2	S3	S3	S4	S4	S5	S5	S6	S6	S7	S7
P0	P1	P1	P1	P1	P1	P1	P2	P2	P2	P2	P3	P3	P3	P3
 
3. Phase 0 — Project Setup & Infrastructure
3.1 Repository & Scaffolding
•	Task 0.1: Initialize GitHub repository with branch protection (main → require PR, status checks must pass).
•	Task 0.2: Scaffold Next.js 14 project with App Router, TypeScript strict mode, ESLint, Prettier.
•	Task 0.3: Install and configure Tailwind CSS + shadcn/ui (Button, Dialog, Input, Select, Sheet, Tooltip, DropdownMenu, Tabs, Toast).
•	Task 0.4: Set up folder structure per PRD Appendix 15.1.
•	Task 0.5: Configure path aliases (@/components, @/lib, @/stores, @/types).
3.2 Supabase Setup
•	Task 0.6: Create Supabase project (EU region). Enable Auth, Realtime, Storage.
•	Task 0.7: Write initial SQL migration: workspaces, diagrams, nodes, edges, diagram_versions, workspace_members tables. Apply JSONB columns for data, field_schema, layout_config, style_overrides.
•	Task 0.8: Configure Row-Level Security (RLS) policies: workspace members can read/write their workspace’s data; public share links have read-only access.
•	Task 0.9: Enable Supabase Auth providers: Email/Password + Google OAuth. Configure redirect URLs for localhost and Vercel preview.
•	Task 0.10: Generate TypeScript types from Supabase schema (supabase gen types typescript). Set up auto-generation in CI.
•	Task 0.11: Create Supabase client utilities: createBrowserClient(), createServerClient(), middleware for session refresh.
3.3 CI/CD & Deployment
•	Task 0.12: Connect GitHub repo to Vercel project. Configure environment variables (see PRD 15.2).
•	Task 0.13: Create GitHub Actions workflow: lint → type-check → test → build on every PR.
•	Task 0.14: Set up Vercel preview deployments per PR (automatic via Vercel-GitHub integration).
•	Task 0.15: Verify: push to main → auto-deploy to production. PR → preview URL. All green.
Phase 0 Exit Criteria:
✓	Empty Next.js app deployed on Vercel at production URL.
✓	Supabase schema migrated and accessible from the app.
✓	Auth flow works: sign up, login, logout, Google SSO.
✓	CI pipeline passes: lint + type-check + build.
✓	Preview deployment created automatically on PR.
 
4. Phase 1 — MVP: Core Canvas & Org Charts
Goal: Interactive canvas with node CRUD, edge creation, and persistent storage.
Tasks:
•	Install and configure React Flow (@xyflow/react). Create <CanvasWrapper> component with pan, zoom, minimap placeholder.
•	Build <OrgChartNode> custom node component: card layout with header bar, Name (bold), Title, placeholder for additional fields.
•	Implement Zustand store (useCanvasStore): nodes[], edges[], addNode(), updateNode(), deleteNode(), addEdge(), deleteEdge(). Use Immer middleware for immutability.
•	Wire node creation: double-click on canvas → create node at position → save to Supabase → optimistic UI update.
•	Wire edge creation: drag from source handle → connect to target handle → validate single-parent constraint (org mode) → save to Supabase.
•	Build right-sidebar <NodeInspector> panel: when a node is selected, display all field values in editable form inputs.
•	Implement inline editing: double-click on node Name field → inline text input → Enter to save → persist to Supabase.
•	Implement undo/redo: Zustand temporal middleware with 50-step stack. Wire Ctrl+Z / Ctrl+Shift+Z.
•	Build basic <Topbar>: workspace name, diagram name (editable), placeholder buttons for layout/export.
•	Build <DashboardPage>: list workspaces, create workspace, list diagrams in workspace, create diagram (choose type: Org Chart or Ownership), delete diagram.
•	Write Vitest unit tests for Zustand store operations. Write Playwright E2E for: login → create workspace → create diagram → add node → connect nodes.
Deliverables:
✓	Interactive canvas with custom org chart nodes
✓	Node and edge CRUD persisted to Supabase
✓	Right-sidebar inspector with inline editing
✓	Undo/Redo working (Ctrl+Z / Ctrl+Shift+Z)
✓	Dashboard with workspace and diagram management
✓	E2E test passing: full create flow
Technical Notes:
◦	React Flow handles are positioned at top (input) and bottom (output) of nodes for org chart vertical tree layout.
◦	Single-parent enforcement: on edge creation, check if target node already has an incoming edge. If yes, prompt to replace or cancel.
◦	Supabase subscriptions are NOT enabled yet (Phase 2). All state syncs via standard CRUD at this stage.
 
Sprint 2
Goal: Field schema system, visibility toggles, auto-layout engine, and context menus.
Tasks:
•	Build <FieldSchemaEditor> component in left sidebar: list of fields (Name, Title, Department, Email, Phone, Employee ID, Cost Center, Photo URL). Each field row shows: label, type dropdown (text/email/select/url/number), required toggle, drag handle for reorder.
•	Implement “Add Custom Field” button: prompts for label + type → appends to schema → saved to diagrams.field_schema JSONB.
•	Build <FieldVisibilityPanel>: lists all fields from schema with toggle switches. Toggling a field hides/shows it on ALL nodes globally. Persist visibility state in diagrams.layout_config.fieldVisibility.
•	Update <OrgChartNode> to dynamically render fields based on schema definition and visibility toggles. Hidden fields collapse smoothly (CSS transition).
•	Integrate ELK.js: install elkjs. Create layoutEngine.ts utility that accepts nodes/edges and returns computed positions. Configure for ‘layered’ algorithm with ‘DOWN’ direction.
•	Wire “Auto Layout” button in Topbar: triggers ELK layout → animates nodes to new positions (React Flow fitView + transition).
•	Add layout direction selector: Top-Down, Left-Right, Bottom-Up, Right-Left. Re-run ELK on change.
•	Add layout spacing controls: horizontal gap slider (40–200px), vertical gap slider (40–200px). Live preview on adjustment.
•	Build right-click context menu on nodes: Edit, Duplicate, Delete, Pin (exclude from auto-layout), Style (open color picker).
•	Implement node duplication: duplicates node with offset position, copies all field values, creates new ID.
•	Implement multi-select: Ctrl+Click to add to selection, Ctrl+A to select all, marquee drag selection. Bulk delete, bulk move.
•	Add snap-to-grid option (toggle in bottom bar). Grid size: 20px. Visual grid overlay on canvas.
•	Write tests: schema editor CRUD, visibility toggle rendering, ELK layout produces non-overlapping positions.
Deliverables:
✓	Configurable field schema with custom fields
✓	Global field visibility toggles (show/hide per field)
✓	ELK.js auto-layout with 4 direction options and spacing controls
✓	Context menu with Duplicate, Delete, Pin, Style
✓	Multi-select with bulk operations
✓	Snap-to-grid
Technical Notes:
◦	ELK.js runs in a Web Worker to avoid blocking the UI thread on large diagrams. Use elkjs/lib/elk.bundled.js.
◦	Field visibility toggles update a shared config object; individual nodes read from it. This enables O(1) toggle vs O(n) per-node update.
◦	Pinned nodes: store a ‘pinned: true’ flag in node style_overrides. The ELK layout utility filters these out before computation.
 
Sprint 3 
Goal: Excel import, PDF export, subtree collapse, shareable links, and MVP polish.
Tasks:
•	Build <ExcelImportWizard> (multi-step dialog): Step 1: File upload (drag-and-drop zone, accept .xlsx/.csv). Step 2: Column mapping UI — for each schema field, user selects which Excel column maps to it. Auto-detect by header name similarity. Step 3: Map ‘reports_to’ column (the parent relationship). Step 4: Preview table showing parsed data with validation errors highlighted (missing required fields, invalid emails, unknown parent IDs, duplicate IDs). Step 5: Confirm → bulk insert nodes and edges to Supabase.
•	Implement SheetJS parsing logic: read workbook, extract first sheet, normalize headers, parse rows into node objects. Handle merged cells, empty rows, whitespace trimming.
•	Build Excel template download: button generates .xlsx with headers matching current schema + reports_to column + 3 example rows. Use SheetJS write.
•	Build <PDFExportDialog>: options for page size (A4, A3, US Letter), orientation (portrait/landscape), margins, “Fit to Page” toggle, multi-page tiling for large charts.
•	Implement PDF generation: capture canvas as SVG → convert to PDF via @react-pdf/renderer or jsPDF + svg2pdf.js. Ensure vector output (not rasterized).
•	Implement PNG export: html2canvas capture of canvas viewport or full diagram. Support 1x/2x resolution.
•	Build subtree collapse/expand: click chevron icon on any node → hides all descendants → shows badge with count (e.g., “+12”). Collapsed state persisted in node style_overrides.
•	Implement <SearchBar> (Ctrl+F): fuzzy search across all node fields → highlight matching nodes (glow effect) → Enter zooms to next match. Use Fuse.js for fuzzy matching.
•	Build shareable view-only links: generate unique UUID-based URL (/view/[shareId]). Public page renders canvas in read-only mode (no editing, no sidebar). Optional password protection.
•	Add Supabase RLS policy for share links: share_links table with diagram_id, share_id (UUID), password_hash (nullable), expires_at.
•	Add keyboard shortcuts: Delete (remove selected), Ctrl+D (duplicate), Arrow keys (nudge 1px, Shift+Arrow nudge 10px), ‘?’ key opens shortcut cheat sheet.
•	QA pass: fix visual bugs, test cross-browser (Chrome, Firefox, Safari, Edge), responsive check at 1024px+.
•	Write E2E tests: Excel import → auto-layout → toggle fields → export PDF.
Deliverables:
✓	Excel import wizard with column mapping and validation
✓	Excel template download
✓	PDF export (vector-quality, multi-page)
✓	PNG export (1x/2x)
✓	Subtree collapse/expand with count badge
✓	Global search (Ctrl+F) with fuzzy matching
✓	Shareable view-only links
✓	Keyboard shortcuts
✓	MVP feature-complete — internal alpha release
Technical Notes:
◦	SheetJS runs entirely client-side. No file upload to server. Parsed data is sent to Supabase as a batch insert via API route.
◦	PDF multi-page tiling: calculate diagram bounding box, divide into page-sized tiles, render each tile as a PDF page with crop.
◦	Fuse.js configured with threshold 0.3, keys matching all schema field names dynamically.
Phase 1 Exit Criteria (MVP Gate):
✓	A user can sign in, create a workspace, create an org chart diagram.
✓	A user can import 50+ employees from Excel and see a fully laid-out org chart in under 30 seconds.
✓	A user can toggle field visibility and export a clean PDF.
✓	A user can share a read-only link that renders the chart without login.
✓	All P0 functional requirements from PRD Section 5 are met.
✓	CI pipeline green. No critical bugs. Internal alpha deployed to Vercel production.
 
5. Phase 2 — Ownership Mode & Collaboration
Sprint 4
Goal: Ownership diagram mode with multi-parent edges, edge metadata, DAG validation, and ownership-specific layout.
Tasks:
•	Build <OwnershipNode> custom node component: entity logo placeholder, Entity Name (bold), Entity Type badge (Holding/Subsidiary/JV/SPV/Trust), Jurisdiction, Registration No, and dynamic schema fields.
•	Update canvas logic to support diagram type switching: when type === ‘ownership’, allow multiple incoming edges per node (remove single-parent constraint).
•	Build <EdgeInspector> panel (right sidebar when edge selected): editable fields for ownership_pct (0–100 number input with validation), share_class (text/dropdown), voting_rights (toggle), effective_date (date picker).
•	Render edge labels on canvas: ownership percentage displayed in a pill-shaped badge at edge midpoint. Hover expands to show full metadata tooltip.
•	Implement DAG cycle detection: on every edge creation, run DFS/BFS from target to check if source is reachable. If cycle detected, reject edge with toast error message.
•	Update ELK.js configuration for ownership mode: switch to ‘layered’ algorithm with ‘NETWORK_SIMPLEX’ node placement, increased edge spacing for multi-parent fan-in, edge routing ‘ORTHOGONAL’.
•	Update Excel import for ownership mode: support multiple rows per entity (one row per parent relationship). Import engine deduplicates entity nodes, creates multiple edges with metadata.
•	Update Excel template download for ownership mode: includes entity_id, entity_name, entity_type, jurisdiction, registration_no, parent_entity_id, ownership_pct, share_class, voting_rights, effective_date.
•	Update PDF export to render edge labels and ownership percentages cleanly.
•	Build entity type color coding: configurable color per entity type (e.g., Holding = blue, Subsidiary = green, JV = orange).
•	Write tests: multi-parent edge creation, cycle detection (should reject), ownership import with deduplication, layout non-overlapping.
Deliverables:
✓	Ownership node component with entity-specific fields
✓	Multi-parent edges with ownership percentage labels
✓	Edge inspector with metadata editing
✓	DAG cycle detection and prevention
✓	ELK.js layered layout for ownership DAGs
✓	Ownership Excel import and template
✓	Entity type color coding
Technical Notes:
◦	Cycle detection uses iterative DFS (not recursive) to avoid stack overflow on deep graphs. Stored as a utility in lib/validation/cycleCheck.ts.
◦	Ownership percentages are validated: all incoming edges to a node should ideally sum to 100%, but this is a warning (not a hard error) since partial ownership structures are common during drafting.
◦	Edge routing: ELK’s orthogonal routing prevents edge overlap. Fallback: bezier curves with offset for parallel edges.
 
Sprint 5
Goal: Real-time collaboration, version history, and role-based access control.
Tasks:
•	Enable Supabase Realtime: configure Broadcast channel per diagram ID. Subscribe to node/edge changes.
•	Implement optimistic UI sync: when User A moves a node, broadcast the position change. User B receives it and animates the node to new position. Conflict resolution: last-write-wins with visual flash indicator.
•	Build cursor presence: each connected user sends cursor position every 100ms via Supabase Presence. Render colored cursor dots with name labels on the canvas.
•	Build <CollaboratorsPanel>: shows list of users currently viewing/editing the diagram with colored dots matching their cursors. Shows online/offline status.
•	Implement version history: auto-save creates a full diagram snapshot (nodes + edges + schema as JSONB) every 5 minutes and on major actions (import, bulk delete, auto-layout).
•	Build <VersionHistoryPanel> in left sidebar: chronological list of snapshots with timestamp, author, and action label. Click to preview (read-only overlay). ‘Restore’ button creates a new version from the selected snapshot.
•	Implement role-based access control: Owner can manage members and delete workspace. Editor can modify diagrams. Viewer can only view and export. Enforce via Supabase RLS policies + UI guards.
•	Build <WorkspaceMembersPanel>: Owner can invite users by email, assign role, remove members. Invitation flow via Supabase Auth magic link.
•	Build <ActivityLog> page per diagram: table of actions (node created, edge deleted, layout changed, version restored) with user, timestamp, and description. Stored in activity_log table.
•	Write tests: real-time sync (two sessions), version restore, role enforcement (viewer cannot edit).
Deliverables:
✓	Real-time node/edge sync across sessions (< 500ms latency)
✓	Cursor presence with colored labels
✓	Version history with browse and restore
✓	Role-based access: Owner / Editor / Viewer
✓	Workspace member management with invitations
✓	Activity log
Technical Notes:
◦	Supabase Realtime Broadcast is preferred over Postgres Changes for performance. Broadcast sends arbitrary payloads without DB triggers.
◦	Cursor presence throttle: send every 100ms, render with CSS transition for smooth movement. Debounce to avoid flooding.
◦	Version snapshots are stored as compressed JSONB. For diagrams with 500+ nodes, consider storing diffs instead of full snapshots in a future optimization.
Phase 2 Exit Criteria:
✓	Ownership diagrams with multi-parent relationships render correctly with percentage labels.
✓	Two users can collaboratively edit the same diagram and see each other’s changes in real-time.
✓	Version history allows browsing and restoring past diagram states.
✓	Role-based access enforced: viewers cannot edit, editors cannot manage members.
 
6. Phase 3 — Polish, Scale & Launch
Sprint 6
Goal: Advanced UX, search and filter, Excel round-trip export, and SVG export.
Tasks:
•	Build minimap component: React Flow’s built-in <MiniMap> with custom styling to match theme. Position bottom-right, toggle via bottom bar button.
•	Implement alignment guides: when dragging a node, show horizontal/vertical guide lines when the node aligns with siblings or parents. Snap-to-guide with 5px threshold.
•	Build <FilterPanel> in left sidebar: multi-select dropdowns for Department, Location, Entity Type (dynamically generated from node data). Non-matching nodes fade to 20% opacity. Clear Filters button.
•	Build breadcrumb navigation: when a node is selected, show clickable breadcrumb trail from root → ... → parent → selected node. Clicking a breadcrumb zooms to that node.
•	Implement per-node field visibility override: right-click node → ‘Field Visibility’ submenu. Override global toggle for specific nodes (e.g., show email on executives but hide on everyone else).
•	Build Excel export (round-trip): export all node data + relationships back to .xlsx matching the import template format. Include all metadata for ownership edges.
•	Build SVG export: render full diagram as scalable SVG file. Preserve node styling, edge labels, colors.
•	Add onboarding flow: first-time user sees a brief tutorial overlay (3 steps: create node, connect, auto-layout) with skip option. Store onboarding_complete flag in user profile.
•	Add empty state illustrations: empty workspace, empty diagram, no search results — each with helpful CTA.
•	Write tests: filter panel, breadcrumbs, Excel round-trip (import → edit → export → re-import matches).
Deliverables:
✓	Minimap with themed styling
✓	Alignment guides during drag
✓	Filter panel (Department, Location, Entity Type)
✓	Breadcrumb navigation from root to selected node
✓	Per-node field visibility overrides
✓	Excel export (round-trip compatible)
✓	SVG export
✓	Onboarding tutorial overlay
Technical Notes:
◦	Alignment guides: calculate center X and center Y of all visible nodes. When dragging node’s center is within 5px of any other node’s center on either axis, render a dashed line and snap.
◦	Excel round-trip: the exported file uses the exact same column structure as the import template. Re-importing should produce an identical diagram (idempotent).
 
Sprint 7
Goal: Performance optimization, monitoring, security hardening, documentation, and production launch.
Tasks:
•	Performance: implement node virtualization — only render nodes visible in the current viewport. Use React Flow’s nodeExtent + onlyRenderVisibleElements. Benchmark at 500 nodes: target 60fps pan/zoom.
•	Performance: move ELK.js layout computation to a Web Worker. Show loading spinner during layout computation. Target < 2 seconds for 500 nodes.
•	Performance: optimize Supabase queries — add indexes on nodes(diagram_id), edges(diagram_id), edges(source_node_id), edges(target_node_id). Batch node position updates into single RPC call.
•	Performance: implement lazy loading for dashboard — paginate diagram list, virtualize workspace member list.
•	Security: audit all Supabase RLS policies. Test: unauthenticated user cannot access any data. Viewer role cannot mutate. Editor cannot access other workspaces. Run sqlc or pgTAP tests.
•	Security: rate limit API routes (Vercel Edge Middleware): 100 requests/minute per user. Add CSRF protection.
•	Integrate Sentry: install @sentry/nextjs. Configure for both client and server. Set up error alerts for 500-level errors and unhandled promise rejections.
•	Integrate PostHog: install posthog-js + posthog-node. Track key events: diagram_created, nodes_imported, pdf_exported, layout_applied, collaboration_session_started. Set up dashboard with core KPIs from PRD Section 13.
•	Build <SettingsPage>: user profile (name, avatar), workspace settings (name, default schema), danger zone (delete workspace with confirmation).
•	Write comprehensive README.md: setup instructions, environment variables, local development, deployment, architecture overview.
•	Write user documentation: Getting Started guide, Import Guide (with screenshots), Keyboard Shortcuts reference. Host as /docs route or Notion page.
•	Conduct full QA pass: cross-browser (Chrome, Firefox, Safari, Edge), responsive (1024px, 1440px, 1920px), accessibility audit (axe-core), performance audit (Lighthouse ≥ 90).
•	Create production deployment checklist: environment variables, DNS, custom domain, Supabase production project, Sentry release tracking.
•	Deploy to production. Announce internal launch.
Deliverables:
✓	60fps canvas at 500 nodes (virtualization)
✓	ELK.js in Web Worker (< 2s for 500 nodes)
✓	Supabase query optimization with indexes
✓	Sentry error monitoring live
✓	PostHog analytics tracking core events
✓	Settings page
✓	README + User documentation
✓	Cross-browser QA pass complete
✓	Lighthouse ≥ 90 on all categories
✓	PRODUCTION LAUNCH
Technical Notes:
◦	Node virtualization: React Flow’s built-in onlyRenderVisibleElements handles this when enabled. Test with 500+ node test dataset.
◦	Web Worker for ELK: use comlink library for type-safe Worker communication. Worker file at src/lib/layout/elk.worker.ts.
◦	Sentry source maps: upload during Vercel build step via @sentry/nextjs withSentryConfig in next.config.js.
Phase 3 Exit Criteria (Production Gate):
✓	60fps pan/zoom at 500 nodes in Chrome.
✓	Lighthouse score ≥ 90 on Performance, Accessibility, Best Practices.
✓	Sentry and PostHog receiving data in production.
✓	All critical and high bugs resolved. No P0 issues open.
✓	Documentation published. Stakeholders sign off.
 
7. Phase 4
Features are prioritized based on user feedback, analytics data, and strategic value. Estimated effort in T-shirt sizes.
Feature	Description	Effort	Priority
PPTX Export	Generate PowerPoint slides with diagram rendered as native shapes (editable in PPT). Single-slide or multi-slide.	L	P2
Node Grouping / Containers	Visual group boxes around related nodes (e.g., group by department). Collapsible. Child nodes move with group.	L	P2
Microsoft SSO	Add Microsoft/Azure AD as Supabase Auth provider for corporate SSO.	S	P1
SAML SSO	Enterprise SAML 2.0 SSO integration for large organizations.	M	P2
Internationalization (i18n)	Add multi-language support via next-intl. Initial languages: English, Russian, Dutch.	M	P2
API for External Integrations	Public REST API for programmatic diagram creation/update. Enables HR system integration (BambooHR, Workday).	L	P2
Diagram Templates	Pre-built templates: simple org chart, matrix org, holding company structure, fund structure.	M	P1
Comments / Annotations	Click on a node or area to leave a comment. Thread-based discussion. @mention users.	M	P2
Diff View	Visual comparison between two versions: highlight added, removed, and moved nodes.	L	P3
Mobile View (Read-Only)	Responsive read-only diagram viewer optimized for phone screens. Pinch-to-zoom, tap for details.	M	P3
Dark Mode	Full dark theme for the canvas and all UI components.	S	P3
Bulk Node Editing	Select multiple nodes → bulk edit a field value (e.g., change department for 20 people at once).	S	P1
Presentation Mode	Full-screen, chrome-free mode for presenting in meetings. Optional auto-zoom walkthrough animation.	M	P2
 
8. Sprint Ceremonies & Workflow
Each 2-week sprint follows this cadence:

Ceremony	When	Duration	Participants	Output
Sprint Planning	Day 1 (Monday)	1 hour	PO + AI Agent	Sprint backlog confirmed. Tasks decomposed with acceptance criteria.
Daily Standup / Check-in	Daily	Async (Slack/GitHub)	PO + AI Agent	Blockers flagged. Progress tracked via GitHub Issues.
Mid-Sprint Review	Day 5 (Friday)	30 min	PO	PO reviews preview deployment. Feedback logged as issues.
Sprint Demo	Day 10 (Friday)	30 min	PO + Stakeholders	Demo on Vercel preview URL. Stakeholder feedback captured.
Sprint Retrospective	Day 10 (Friday)	15 min	PO + AI Agent	What worked, what didn’t, adjustments for next sprint.

8.1 GitHub Workflow
•	Branching: main (production) ← develop (staging) ← feature/TASK-ID-short-description.
•	PR Process: Every feature branch → PR into develop. CI must pass. PO reviews. Squash merge.
•	Releases: At sprint end, merge develop → main. Vercel auto-deploys production.
•	Issue Tracking: GitHub Issues with labels: phase-0, phase-1, phase-2, phase-3, bug, enhancement, P0, P1, P2.
•	Project Board: GitHub Projects (Kanban): Backlog → Sprint → In Progress → Review → Done.
9. Definition of Done (DoD)
A task is considered “Done” when ALL of the following are true:
✓	Code is written in TypeScript with strict mode. No ‘any’ types unless explicitly justified.
✓	Feature works end-to-end: UI + API + DB + persistence verified.
✓	Unit tests cover core logic (Vitest). Minimum: happy path + 1 edge case.
✓	E2E test covers user-facing flow (Playwright) for P0 features.
✓	No ESLint errors or warnings.
✓	No TypeScript compiler errors.
✓	Code is self-documenting with JSDoc on exported functions.
✓	PR is created with description of changes, screenshots/recordings for UI changes.
✓	CI pipeline passes (lint + type-check + test + build).
✓	Feature is visible and functional on Vercel preview deployment.
✓	Supabase RLS policies cover the new data access patterns.
✓	No performance regressions (canvas stays at 60fps for test dataset).
 
10. Testing Strategy
Layer	Tool	Scope	When
Unit Tests	Vitest + React Testing Library	Zustand stores, utility functions (cycle detection, layout engine wrapper, Excel parser, field validation), individual React components	Every PR. Run in CI.
Integration Tests	Vitest + Supabase local	API routes with real database. CRUD operations. RLS policy enforcement.	Every PR. Run in CI with Supabase CLI local instance.
E2E Tests	Playwright	Critical user flows: Login → Create diagram → Import Excel → Auto-layout → Export PDF. Collaboration (two browser contexts).	Every PR for P0 flows. Nightly for full suite.
Visual Regression	Playwright screenshots	Canvas renders consistently across changes. Node card appearance. Export output.	Nightly. Review diffs on failure.
Performance	Lighthouse CI + Custom benchmarks	LCP < 2.5s. Canvas 60fps at 500 nodes. ELK layout < 2s at 500 nodes.	Weekly. Report in sprint demo.
Accessibility	axe-core + Manual audit	WCAG 2.1 AA. Keyboard navigation. Screen reader compatibility. Color contrast.	Every sprint. Full audit at Phase 3.
Security	RLS tests + Manual pen test	Supabase RLS policies. JWT validation. CSRF. Rate limiting.	End of Phase 2 and Phase 3.

10.1 Test Data
•	Small dataset: 15 nodes, 14 edges. Used for unit/integration tests.
•	Medium dataset: 100 nodes, 99 edges (org) / 120 edges (ownership). Used for E2E and visual tests.
•	Large dataset: 500 nodes, 499+ edges. Used for performance benchmarks.
•	Stress dataset: 1,000 nodes. Used for limit testing and degradation analysis.
Test datasets are stored as .json fixtures in /tests/fixtures/ and as .xlsx files for import testing.
11. Deployment & Release Strategy
Environment	URL	Branch	Auto-Deploy	Purpose
Preview	*.vercel.app (per-PR)	feature/*	Yes (on PR open)	PO review, stakeholder demos, QA
Staging	staging.orgcanvas.app	develop	Yes (on merge)	Integration testing, pre-production validation
Production	app.orgcanvas.app	main	Yes (on merge)	Live users

11.1 Release Process
1.	Feature branches merge into develop via squash-merge PRs.
2.	At sprint end, create release branch: release/vX.Y.Z from develop.
3.	Run full E2E suite against staging.
4.	If green: merge release branch into main (triggers production deploy).
5.	Tag release in GitHub: vX.Y.Z with changelog.
6.	Monitor Sentry and PostHog for 2 hours post-deploy.
7.	If issues: revert via Vercel instant rollback.

11.2 Database Migrations
•	All schema changes are written as sequential SQL migration files in /supabase/migrations/.
•	Migrations are applied automatically via Supabase CLI (supabase db push) in the CI pipeline.
•	Backward-compatible changes only: add columns (nullable), create tables. Never drop columns in production without a multi-step migration.
 
12. Risk Register & Contingency Plans
#	Risk	Phase	Impact	Likelihood	Mitigation	Contingency
R1	ELK.js layout quality poor for complex DAGs	P1–P2	High	Medium	Extensive parameter tuning; test with real ownership structures from Day 1	Swap to dagre or d3-dag if ELK is unsalvageable; both support layered layouts
R2	React Flow performance at 500+ nodes	P3	High	Medium	Enable node virtualization early; benchmark weekly	Implement canvas-based rendering (Konva/Pixi.js) as escape hatch for extreme cases
R3	Real-time collaboration conflicts	P2	Medium	High	Last-write-wins with toast notification; keep edits granular (per-field, not per-node)	Adopt Yjs CRDT library for true conflict-free merging if LWW causes data loss
R4	Excel import fails on messy data	P1	High	High	Robust validation with inline error messages; skip-and-continue mode; provide clean template	Allow manual correction in preview step before import; support drag-and-drop re-mapping
R5	Supabase Realtime rate limits	P2	Medium	Low	Throttle broadcasts to 10 msg/sec per channel; batch position updates	Fall back to polling (2s interval) if Realtime is unavailable
R6	PDF export doesn’t match canvas	P1	Medium	Medium	Dual pipeline: SVG-based (primary) + html2canvas (fallback); user can choose	Allow export as high-res PNG as acceptable alternative
R7	Scope creep from stakeholders	All	Medium	High	All feature requests go through backlog triage. PRD scope is contract.	Defer to Phase 4 backlog with clear priority ranking
R8	AI Agent produces low-quality code	All	High	Medium	Strict DoD, CI checks, PO code review on every PR	PO provides manual fixes; break tasks into smaller units with more prescriptive specs
 
13. Dependency Map
The following diagram shows critical path dependencies between sprints and features:

Feature / Task	Depends On	Blocks
Supabase schema + Auth (P0)	Nothing (foundation)	Everything else
React Flow canvas (S1)	Supabase schema	Nodes, edges, all canvas features
Zustand store (S1)	React Flow canvas	Undo/redo, inline editing, all state mutations
Field schema editor (S2)	Zustand store	Visibility toggles, node rendering, Excel import column mapping
ELK.js auto-layout (S2)	React Flow canvas + nodes/edges	Layout direction selector, spacing controls, subtree collapse
Excel import (S3)	Field schema + Supabase CRUD	Ownership import (S4), Excel export (S6)
PDF export (S3)	React Flow canvas rendering	Ownership PDF (S4)
Ownership mode (S4)	Single-parent mode working	Ownership import, edge metadata, DAG layout
Supabase Realtime (S5)	Supabase schema + Auth	Cursor presence, change sync
Version history (S5)	Supabase schema + node/edge CRUD	Version restore, diff view (P4)
Performance optimization (S7)	All features built	Production launch
Monitoring: Sentry + PostHog (S7)	Vercel deployment	Production launch
14. Resource & Tooling Requirements
14.1 Development Environment
Tool	Version	Purpose
Node.js	v20 LTS	Runtime for Next.js and build tools
pnpm	v9+	Package manager (faster, stricter than npm)
Supabase CLI	Latest	Local development, migrations, type generation
Docker	Latest	Supabase local (Postgres, GoTrue, Realtime, Storage)
VS Code / Cursor	Latest	IDE (or AI agent’s environment)
Git	v2.40+	Version control

14.2 Third-Party Services & Estimated Costs
Service	Plan	Monthly Cost (Est.)	Notes
Vercel	Pro	$20/month	Unlimited preview deploys, Edge Functions, Analytics
Supabase	Pro	$25/month	8GB DB, 250K auth MAUs, 500MB storage, Realtime
GitHub	Team (or Free)	$0–$4/user/month	Private repos, Actions minutes, Copilot (optional)
Sentry	Team	$26/month	50K errors, 10 seats, performance monitoring
PostHog	Free / Cloud	$0 (< 1M events)	Product analytics, session replay
Custom Domain	DNS provider	$10–$15/year	orgcanvas.app or similar
Estimated total: ~$75–$100/month during development; scaling with usage in production.

14.3 Key npm Packages
Package	Version	Purpose
next	14.x	React framework with App Router
@xyflow/react	12.x	Canvas / node-based graph UI
elkjs	0.9.x	Automatic graph layout engine
zustand	4.x	State management
immer	10.x	Immutable state updates
@supabase/supabase-js	2.x	Supabase client
@supabase/ssr	0.x	Supabase server-side helpers for Next.js
xlsx (SheetJS)	0.20.x	Excel import/export
fuse.js	7.x	Fuzzy search
jspdf + svg2pdf.js	2.x / 3.x	PDF generation from SVG
@sentry/nextjs	8.x	Error monitoring
posthog-js	1.x	Product analytics
tailwindcss	3.x	Utility-first CSS
vitest	2.x	Unit testing
@playwright/test	1.x	E2E testing
