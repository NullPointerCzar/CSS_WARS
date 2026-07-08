# Graph Report - cssbattle  (2026-07-05)

## Corpus Check
- 50 files · ~25,174 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 457 nodes · 506 edges · 38 communities (31 shown, 7 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `83cef95e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

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
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `CSS Battle Platform — Project Plan (Yatra Edition)` - 16 edges
3. `compilerOptions` - 14 edges
4. `compilerOptions` - 13 edges
5. `Prisma Schema (TASK-01)` - 13 edges
6. `CSS Battle Project Plan` - 12 edges
7. `What You Must Do When Invoked` - 11 edges
8. `Challenge Model` - 11 edges
9. `/graphify` - 10 edges
10. `User Model` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Locked Tech Stack (AGENTS.md section 1)` --semantically_similar_to--> `Tech Stack Table (Project Plan section 4)`  [INFERRED] [semantically similar]
  AGENTS.md → CSS-Battle-Project-Plan.md
- `Rendering Pipeline Security Rules` --semantically_similar_to--> `Security Considerations (Project Plan section 11)`  [INFERRED] [semantically similar]
  AGENTS.md → CSS-Battle-Project-Plan.md
- `Module Boundaries (identity, challenges, submissions, scoring, rendering, leaderboard, admin)` --semantically_similar_to--> `Backend Module Structure (Project Plan section 6)`  [INFERRED] [semantically similar]
  AGENTS.md → CSS-Battle-Project-Plan.md
- `frontend/index.html (Vite React entry)` --implements--> `Frontend Structure (Project Plan section 7)`  [INFERRED]
  frontend/index.html → CSS-Battle-Project-Plan.md
- `Identity, Not Auth (deliberate simplification)` --rationale_for--> `Locked Tech Stack (AGENTS.md section 1)`  [INFERRED]
  CSS-Battle-Project-Plan.md → AGENTS.md

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

## Communities (38 total, 7 thin omitted)

### Community 0 - "Prisma Schema & Data Models"
Cohesion: 0.06
Nodes (49): 1. Schema to Implement, `Challenge`, Challenge Model, `CompetitionState`, CompetitionState Model, `CompetitionStatus` (enum), `Difficulty` (enum), Initial Migration (+41 more)

### Community 1 - "Frontend Dependency Graph"
Cohesion: 0.07
Nodes (28): dependencies, clsx, framer-motion, lucide-react, react, react-dom, react-router-dom, tailwind-merge (+20 more)

### Community 2 - "Backend Dependency Graph"
Cohesion: 0.07
Nodes (26): dependencies, cors, express, @prisma/client, description, devDependencies, prisma, tsx (+18 more)

### Community 3 - "Agent Governance (AGENTS.md)"
Cohesion: 0.08
Nodes (26): Locked Tech Stack (AGENTS.md section 1), Module Boundaries (identity, challenges, submissions, scoring, rendering, leaderboard, admin), Non-Negotiable Constraints, Rendering Pipeline Security Rules, Scope Discipline (no over-building), pgdata Docker Volume, cssbattle-postgres service (postgres:16-alpine), frontend/index.html (Vite React entry) (+18 more)

### Community 4 - "Graphify CLI Surface"
Cohesion: 0.08
Nodes (31): Always-on graphify rule for the project, Semantic extraction cache (.graphify_cached.json), CLI: graphify add <url> (ingest URL), CLI: graphify claude (CLAUDE.md integration), CLI: graphify explain (plain-language node explanation), CLI: graphify hook (post-commit rebuild), CLI: graphify path (shortest path between concepts), CLI: graphify query (BFS/DFS, --budget) (+23 more)

### Community 5 - "Frontend TS Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleDetection, moduleResolution (+11 more)

### Community 6 - "Graphify Pipeline Internals"
Cohesion: 0.10
Nodes (21): AST + semantic split (Part A / Part B / Part C), CLI: graphify clone (GitHub repo fetch), CLI: graphify export (obsidian/wiki/html/neo4j/falkordb/svg/graphml), CLI: graphify merge-graphs (cross-repo merge), Community detection + god nodes + surprising connections, Neo4j and FalkorDB export, Outputs: graph.html, GRAPH_REPORT.md, graph.json, obsidian/, wiki/, graphify build pipeline (9 steps) (+13 more)

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
Cohesion: 0.22
Nodes (9): Debounced Preview Re-render, Sandboxed Iframe Live Preview, Hard Render Timeout, Isolated Renderer Process, Playwright Browser Pipeline, Submission HTML/CSS Sanitization, Synchronous Per-Request Render, isBest Race-Safe Transaction (+1 more)

### Community 13 - "Leaderboard & Admin Controls"
Cohesion: 0.08
Nodes (23): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+15 more)

### Community 14 - "Database Migration"
Cohesion: 0.70
Nodes (4): "Challenge", "CompetitionState", "Submission", "User"

### Community 15 - "Pixelmatch Comparison Tools"
Cohesion: 0.50
Nodes (4): Client-side Pixelmatch, Difference Mode (Client Pixelmatch), Pixelmatch Library, Server-side Pixelmatch Scoring

### Community 26 - "Community 26"
Cohesion: 0.09
Nodes (23): 10. Submission → Scoring Pipeline, 11. Security Considerations, 12. 25-Day Timeline, 13. Operational Features Organizers Will Actually Need, 14. Post-Event Roadmap (Not for v1), 15. Summary Checklist, 1. What We're Building, 2. Why This Scope (Context) (+15 more)

### Community 27 - "Community 27"
Cohesion: 0.15
Nodes (13): 0. Non-Negotiable Constraints, 1. Locked Tech Stack — Do Not Substitute, 2. Critical Security Rules for the Rendering Pipeline, 3. Scope Discipline, 4. Working Conventions, 5. Environment & Secrets, 6. Reference Documents, AGENTS.md — Rules for AI Coding Agents (+5 more)

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (8): 1. Backend Endpoints, 2. Frontend, 3. What NOT to Do, 4. Verification Checklist, Admin-facing, Context, Participant-facing, Task: Challenges CRUD + Publishing Flow

### Community 29 - "Community 29"
Cohesion: 0.25
Nodes (7): 2. Migration, 3. Seed Script, 4. Verification Checklist, 5. What NOT to Do, 6. Handoff Notes for the Next Task, Context, Task: Prisma Schema, Migration & Seed Data

### Community 30 - "Community 30"
Cohesion: 0.25
Nodes (7): 1. Backend Endpoints, 2. Frontend, 3. Admin Identity, 4. What NOT to Do, 5. Verification Checklist, Context, Task: Identity Flow (Name + PIN Selection)

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (7): 1. Editor, 2. Live Preview (Sandboxed), 3. Comparison Tools, 4. What NOT to Do, 5. Verification Checklist, Context, Task: Monaco Editor, Live Preview & Comparison Tools

### Community 32 - "Community 32"
Cohesion: 0.25
Nodes (7): 1. Rendering Service, 2. Scoring, 3. Resource Limits, 4. What NOT to Do, 5. Verification Checklist, Context, Task: Rendering & Scoring Service (Playwright + Pixelmatch)

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (6): 1. Backend Endpoint, 2. Frontend, 3. What NOT to Do, 4. Verification Checklist, Context, Task: Submission Flow

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (6): 1. Backend Endpoint, 2. Frontend, 3. What NOT to Do, 4. Verification Checklist, Context, Task: Leaderboard

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (6): 1. Backend Endpoints, 2. Frontend — Admin Panel, 3. What NOT to Do, 4. Verification Checklist, Context, Task: Admin Competition Controls

### Community 36 - "Community 36"
Cohesion: 0.53
Nodes (5): Honesty / audit trail (EXTRACTED/INFERRED/AMBIGUOUS), Confidence rubric (EXTRACTED=1.0, INFERRED=0.55-0.95, AMBIGUOUS=0.1-0.3), graphify extraction JSON schema, Node ID format: {parent_dir}_{filename}_{entity}, graphify reference: extraction subagent prompt

## Knowledge Gaps
- **271 isolated node(s):** `name`, `version`, `private`, `description`, `main` (+266 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `graphify SKILL.md (top-level skill)` connect `Graphify CLI Surface` to `Community 36`, `Graphify Pipeline Internals`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `CSS Battle Platform — Project Plan (Yatra Edition)` connect `Community 26` to `Agent Governance (AGENTS.md)`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `Submission Model` connect `Prisma Schema & Data Models` to `Rendering Pipeline Security`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _277 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Prisma Schema & Data Models` be split into smaller, more focused modules?**
  _Cohesion score 0.06377551020408163 - nodes in this community are weakly interconnected._
- **Should `Frontend Dependency Graph` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Backend Dependency Graph` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._