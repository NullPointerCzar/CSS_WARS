# Graph Report - .  (2026-07-05)

## Corpus Check
- Corpus is ~25,165 words - fits in a single context window. You may not need a graph.

## Summary
- 291 nodes · 347 edges · 26 communities (20 shown, 6 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.89)
- Token cost: 164,407 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Prisma Schema & Data Models|Prisma Schema & Data Models]]
- [[_COMMUNITY_Frontend Dependency Graph|Frontend Dependency Graph]]
- [[_COMMUNITY_Backend Dependency Graph|Backend Dependency Graph]]
- [[_COMMUNITY_Agent Governance (AGENTS.md)|Agent Governance (AGENTS.md)]]
- [[_COMMUNITY_Graphify CLI Surface|Graphify CLI Surface]]
- [[_COMMUNITY_Frontend TS Config|Frontend TS Config]]
- [[_COMMUNITY_Graphify Pipeline Internals|Graphify Pipeline Internals]]
- [[_COMMUNITY_Backend TS Config|Backend TS Config]]
- [[_COMMUNITY_Frontend Node TS Config|Frontend Node TS Config]]
- [[_COMMUNITY_Root Workspace Package|Root Workspace Package]]
- [[_COMMUNITY_Frontend Identity & App Shell|Frontend Identity & App Shell]]
- [[_COMMUNITY_Backend Routes & Admin|Backend Routes & Admin]]
- [[_COMMUNITY_Rendering Pipeline Security|Rendering Pipeline Security]]
- [[_COMMUNITY_Leaderboard & Admin Controls|Leaderboard & Admin Controls]]
- [[_COMMUNITY_Database Migration|Database Migration]]
- [[_COMMUNITY_Pixelmatch Comparison Tools|Pixelmatch Comparison Tools]]
- [[_COMMUNITY_Frontend TS Project References|Frontend TS Project References]]
- [[_COMMUNITY_Prisma Seed Script|Prisma Seed Script]]
- [[_COMMUNITY_Project Graphify Activation|Project Graphify Activation]]
- [[_COMMUNITY_Frontend QueryClient Bootstrap|Frontend QueryClient Bootstrap]]
- [[_COMMUNITY_Opacity Compare Slider|Opacity Compare Slider]]
- [[_COMMUNITY_Split Compare Slider|Split Compare Slider]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `compilerOptions` - 14 edges
3. `compilerOptions` - 13 edges
4. `Prisma Schema (TASK-01)` - 13 edges
5. `CSS Battle Project Plan` - 12 edges
6. `Challenge Model` - 11 edges
7. `User Model` - 10 edges
8. `graphify SKILL.md (top-level skill)` - 10 edges
9. `Submission Model` - 9 edges
10. `scripts` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Locked Tech Stack (AGENTS.md section 1)` --semantically_similar_to--> `Tech Stack Table (Project Plan section 4)`  [INFERRED] [semantically similar]
  AGENTS.md → CSS-Battle-Project-Plan.md
- `Rendering Pipeline Security Rules` --semantically_similar_to--> `Security Considerations (Project Plan section 11)`  [INFERRED] [semantically similar]
  AGENTS.md → CSS-Battle-Project-Plan.md
- `Module Boundaries (identity, challenges, submissions, scoring, rendering, leaderboard, admin)` --semantically_similar_to--> `Backend Module Structure (Project Plan section 6)`  [INFERRED] [semantically similar]
  AGENTS.md → CSS-Battle-Project-Plan.md
- `Project README` --references--> `AGENTS.md - Coding Agent Rules`  [EXTRACTED]
  README.md → AGENTS.md
- `Project README` --references--> `CSS Battle Project Plan`  [EXTRACTED]
  README.md → CSS-Battle-Project-Plan.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AGENTS.md governance ruleset** — agents_non_negotiable_constraints, agents_locked_tech_stack, agents_rendering_pipeline_security, agents_module_boundaries, agents_scope_discipline [INFERRED 0.85]
- **Project Plan MVP scope (participant + admin features)** — plan_identity_not_auth, plan_comparison_tools, plan_submission_scoring_pipeline, plan_database_schema, plan_module_boundaries, plan_frontend_structure [INFERRED 0.75]
- **docker-compose PostgreSQL stack** — compose_postgres_service, compose_pgdata_volume [EXTRACTED 1.00]
- **Submission → Score → Leaderboard Pipeline** — tasks_task_04_monaco_editor_preview_monaco_editor, tasks_task_05_rendering_service_rendering_service, tasks_task_06_submission_flow_submission_flow, tasks_task_07_leaderboard_leaderboard [EXTRACTED 1.00]
- **Client/Server Sandboxing Parity (No Script Execution)** — tasks_task_04_monaco_editor_preview_sandboxed_iframe, tasks_task_05_rendering_service_playwright_pipeline, tasks_task_05_rendering_service_sanitization [EXTRACTED 1.00]
- **Prisma Schema Consumer Chain** — tasks_task_01_prisma_schema_prisma_schema, tasks_task_02_identity_flow_identity_flow, tasks_task_03_challenges_crud_challenges_crud, tasks_task_06_submission_flow_submission_flow, tasks_task_07_leaderboard_leaderboard, tasks_task_08_admin_panel_admin_panel [EXTRACTED 1.00]
- **graphify build pipeline (9 ordered steps)** — references_skill, concept_pipeline, concept_ast_vs_semantic, concept_community_detection, concept_outputs, concept_audit_trail [EXTRACTED 1.00]
- **graphify query/path/explain/save-result (post-build query layer)** — concept_cli_query, concept_cli_path, concept_cli_explain, concept_cli_save_result, concept_query_expansion [EXTRACTED 1.00]
- **Always-on graphify rule (rules + workflow + claude install)** — rules_graphify, workflows_graphify, concept_always_on, concept_fast_path, concept_cli_update [EXTRACTED 1.00]

## Communities (26 total, 6 thin omitted)

### Community 0 - "Prisma Schema & Data Models"
Cohesion: 0.08
Nodes (40): Challenge Model, CompetitionState Model, CompetitionStatus Enum, Difficulty Enum, Initial Migration, Prisma Schema (TASK-01), Role Enum, Prisma Seed Script (+32 more)

### Community 1 - "Frontend Dependency Graph"
Cohesion: 0.07
Nodes (28): dependencies, clsx, framer-motion, lucide-react, react, react-dom, react-router-dom, tailwind-merge (+20 more)

### Community 2 - "Backend Dependency Graph"
Cohesion: 0.07
Nodes (26): dependencies, cors, express, @prisma/client, description, devDependencies, prisma, tsx (+18 more)

### Community 3 - "Agent Governance (AGENTS.md)"
Cohesion: 0.11
Nodes (22): AGENTS.md - Coding Agent Rules, Locked Tech Stack (AGENTS.md section 1), Module Boundaries (identity, challenges, submissions, scoring, rendering, leaderboard, admin), Non-Negotiable Constraints, Rendering Pipeline Security Rules, Scope Discipline (no over-building), pgdata Docker Volume, cssbattle-postgres service (postgres:16-alpine) (+14 more)

### Community 4 - "Graphify CLI Surface"
Cohesion: 0.19
Nodes (21): Always-on graphify rule for the project, Semantic extraction cache (.graphify_cached.json), CLI: graphify add <url> (ingest URL), CLI: graphify claude (CLAUDE.md integration), CLI: graphify explain (plain-language node explanation), CLI: graphify hook (post-commit rebuild), CLI: graphify path (shortest path between concepts), CLI: graphify query (BFS/DFS, --budget) (+13 more)

### Community 5 - "Frontend TS Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 6 - "Graphify Pipeline Internals"
Cohesion: 0.18
Nodes (17): AST + semantic split (Part A / Part B / Part C), Honesty / audit trail (EXTRACTED/INFERRED/AMBIGUOUS), CLI: graphify clone (GitHub repo fetch), CLI: graphify export (obsidian/wiki/html/neo4j/falkordb/svg/graphml), CLI: graphify merge-graphs (cross-repo merge), Community detection + god nodes + surprising connections, Confidence rubric (EXTRACTED=1.0, INFERRED=0.55-0.95, AMBIGUOUS=0.1-0.3), graphify extraction JSON schema (+9 more)

### Community 7 - "Backend TS Config"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, module, moduleResolution, outDir, resolveJsonModule (+7 more)

### Community 8 - "Frontend Node TS Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, isolatedModules, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 9 - "Root Workspace Package"
Cohesion: 0.12
Nodes (15): description, devDependencies, concurrently, @types/node, name, private, scripts, build (+7 more)

### Community 10 - "Frontend Identity & App Shell"
Cohesion: 0.21
Nodes (9): clearIdentity(), getIdentity(), setIdentity(), useIdentity(), UserIdentity, IdentitySelection(), Participant, App() (+1 more)

### Community 11 - "Backend Routes & Admin"
Cohesion: 0.21
Nodes (7): adminCheck(), adminRouter, identityRouter, createApp(), globalForPrisma, app, PORT

### Community 12 - "Rendering Pipeline Security"
Cohesion: 0.29
Nodes (7): Debounced Preview Re-render, Sandboxed Iframe Live Preview, Hard Render Timeout, Isolated Renderer Process, Playwright Browser Pipeline, Submission HTML/CSS Sanitization, Synchronous Per-Request Render

### Community 13 - "Leaderboard & Admin Controls"
Cohesion: 0.33
Nodes (6): Tie-Break Ranking Logic, CSV Leaderboard Export, PATCH /api/admin/leaderboard/freeze, Leaderboard Freeze Snapshot, GET /api/leaderboard, Polling (No WebSockets)

### Community 14 - "Database Migration"
Cohesion: 0.70
Nodes (4): "Challenge", "CompetitionState", "Submission", "User"

### Community 15 - "Pixelmatch Comparison Tools"
Cohesion: 0.50
Nodes (4): Client-side Pixelmatch, Difference Mode (Client Pixelmatch), Pixelmatch Library, Server-side Pixelmatch Scoring

## Knowledge Gaps
- **146 isolated node(s):** `name`, `version`, `private`, `description`, `main` (+141 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Submission Model` connect `Prisma Schema & Data Models` to `Leaderboard & Admin Controls`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `POST /api/submissions` connect `Prisma Schema & Data Models` to `Rendering Pipeline Security`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _152 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Prisma Schema & Data Models` be split into smaller, more focused modules?**
  _Cohesion score 0.08205128205128205 - nodes in this community are weakly interconnected._
- **Should `Frontend Dependency Graph` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Backend Dependency Graph` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Agent Governance (AGENTS.md)` be split into smaller, more focused modules?**
  _Cohesion score 0.11462450592885376 - nodes in this community are weakly interconnected._