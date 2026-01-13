# Claude Agent Quick Start Guide

> **Purpose**: Quick reference for spawning and managing Claude agents on idkarr tasks
> **Audience**: Developers/PMs managing the idkarr implementation

---

## TL;DR - Spawning an Agent

```bash
# 1. Select task from IDKARR_TASK_BREAKDOWN.md
# 2. Copy prompt from AGENT_TASK_PROMPTS.md
# 3. Provide to Claude with this context:

"You are implementing task [TASK_ID] for the idkarr project.

Read these files first:
- docs/08-project-management/CLAUDE_AGENT_INSTRUCTIONS.md
- docs/02-architecture/DATABASE_SCHEMA.md
- docs/02-architecture/DEEP_ARCHITECTURE.md

Then implement according to this specification:
[PASTE TASK PROMPT HERE]

Work in packages/[backend|frontend]/ directory.
Follow patterns in CLAUDE_AGENT_INSTRUCTIONS.md.
"
```

---

## Agent Types & When to Use

| Agent Type | Use For | Key Context Files |
|------------|---------|-------------------|
| **Backend** | APIs, services, database | DATABASE_SCHEMA.md, REST_API.md |
| **Frontend** | UI components, pages | UI_UX_SPECIFICATION.md, REST_API.md |
| **Database** | Schema, migrations | DATABASE_SCHEMA.md |
| **Testing** | Unit, integration, E2E tests | TESTING_STRATEGY.md |
| **DevOps** | Docker, CI/CD, monitoring | DEPLOYMENT.md, SECURITY.md |
| **Docs** | Documentation updates | Relevant feature docs |

---

## Standard Agent Prompt Template

```markdown
# Task: [TASK_ID] - [Task Name]

## Role
You are a [backend/frontend/full-stack] developer implementing [brief description].

## Project Context
idkarr is a unified media management app (Sonarr + Radarr + Overseerr + Prowlarr).

Tech Stack:
- Backend: Bun + Hono + Drizzle + PostgreSQL
- Frontend: Next.js 15 + shadcn/ui + TanStack Query

## Required Reading
Before coding, read these files:
1. docs/08-project-management/CLAUDE_AGENT_INSTRUCTIONS.md (patterns)
2. docs/02-architecture/DATABASE_SCHEMA.md (data model)
3. [task-specific docs]

## Task Description
[Paste from AGENT_TASK_PROMPTS.md or IDKARR_TASK_BREAKDOWN.md]

## Acceptance Criteria
[Copy from task breakdown]

## Constraints
- Follow existing code patterns
- Use TypeScript strict mode
- No `any` types
- Write tests for new code
- Update documentation if needed

## Output Expected
- Implementation files
- Test files
- Summary of changes
- Any blockers or decisions needed
```

---

## Parallel Agent Strategy

### Phase 0 (All can run in parallel)
```
Agent 1: P0-001 Schema Naming → outputs updated docs
Agent 2: P0-004 Permission Rules → outputs decision doc
Agent 3: P0-005 Error Format → outputs error schema
Agent 4: P0-006 WebSocket Events → outputs event catalog
```

### Phase 1 (3 parallel streams)
```
Stream A (Backend):
  Agent-Backend-1: P1-A-001 → P1-A-002 → P1-A-003 → P1-A-004
  Agent-Backend-2: P1-A-005 (can start after P1-A-001)

Stream B (Frontend):
  Agent-Frontend: P1-B-001 → P1-B-002 + P1-B-003 (parallel)

Stream C (DevOps):
  Agent-DevOps: P1-C-001 → P1-C-002 + P1-C-003 (parallel)
```

### Dependency Handoffs

When Agent A completes a task that Agent B depends on:

```markdown
## Handoff: [Task A] → [Task B]

**Completed**: [Task A description]
**Files created**:
- path/to/file1.ts
- path/to/file2.ts

**Interfaces exposed**:
```typescript
export interface IServiceName {
  method1(): Promise<Type>;
  method2(arg: Type): Promise<Type>;
}
```

**Ready for**: [Task B] to begin implementation
**Notes**: [Any context needed]
```

---

## Common Agent Instructions

### For All Agents
```markdown
## Standard Instructions

1. **File naming**: Use kebab-case (my-component.tsx)
2. **Imports**: Use @/ path aliases
3. **Types**: Export from types/ directory
4. **Tests**: Co-locate in __tests__/ or tests/
5. **No console.log**: Use logger service
6. **No TODO without ID**: Use TODO(P1-A-001): format
```

### For Backend Agents
```markdown
## Backend-Specific

1. **Services**: Constructor injection, interface-first
2. **Routes**: Use Hono with zValidator
3. **Database**: Use Drizzle, never raw SQL in app code
4. **Validation**: Zod schemas for all inputs
5. **Errors**: Use custom error classes
6. **Logging**: Structured JSON with Pino
```

### For Frontend Agents
```markdown
## Frontend-Specific

1. **Components**: Functional with TypeScript props
2. **State**: Zustand for client, TanStack Query for server
3. **Styling**: Tailwind only, no inline styles
4. **Accessibility**: ARIA labels, keyboard nav, focus management
5. **Loading**: Always handle loading/error/empty states
6. **Forms**: React Hook Form + Zod
```

---

## Verifying Agent Output

### Quick Verification
```bash
# Run these after agent completes:
cd packages/backend && bun run typecheck
cd packages/backend && bun run lint
cd packages/backend && bun run test
cd packages/frontend && bun run typecheck
cd packages/frontend && bun run lint
```

### Acceptance Criteria Check
```markdown
For each acceptance criterion in the task:
- [ ] Criterion 1: [Verified how]
- [ ] Criterion 2: [Verified how]
- [ ] Tests passing: [X/Y tests]
- [ ] No TypeScript errors: [Yes/No]
- [ ] No lint errors: [Yes/No]
```

---

## Troubleshooting Agents

### Agent is stuck
```markdown
Prompt: "You seem stuck. Please:
1. State what you're trying to do
2. State what's blocking you
3. Propose 2-3 alternatives
4. Recommend which alternative and why"
```

### Agent deviating from patterns
```markdown
Prompt: "Your implementation differs from project patterns.
Please re-read docs/08-project-management/CLAUDE_AGENT_INSTRUCTIONS.md
and refactor to match the [specific pattern] shown there."
```

### Agent making assumptions
```markdown
Prompt: "Before implementing, please confirm:
1. You've read [specific doc]
2. You understand that [specific decision]
3. Your approach handles [edge case]
If any of these are unclear, ask before proceeding."
```

### Agent not testing
```markdown
Prompt: "Please add tests for this implementation:
- Unit tests for [service/component]
- Integration tests for [API endpoint]
- Cover these edge cases: [list]
Minimum 80% coverage for new code."
```

---

## Task Status Tracking

### Task States
```
📋 BACKLOG    - Not started
🏃 IN_PROGRESS - Agent working
👀 REVIEW     - Awaiting verification
✅ DONE       - Verified complete
🚫 BLOCKED    - Waiting on dependency
```

### Status Update Template
```markdown
## Task Status: [TASK_ID]

**Status**: [STATE]
**Agent**: [Agent identifier/session]
**Started**: [Date]
**Updated**: [Date]

**Progress**:
- [x] Step 1 completed
- [x] Step 2 completed
- [ ] Step 3 in progress
- [ ] Step 4 pending

**Blockers**: [None / Description]
**Notes**: [Any relevant context]
```

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT SPAWN CHECKLIST                         │
├─────────────────────────────────────────────────────────────────┤
│ □ Task ID from IDKARR_TASK_BREAKDOWN.md                         │
│ □ Prompt from AGENT_TASK_PROMPTS.md                             │
│ □ Context files listed                                           │
│ □ Acceptance criteria clear                                      │
│ □ Dependencies completed                                         │
├─────────────────────────────────────────────────────────────────┤
│                    AGENT COMPLETE CHECKLIST                      │
├─────────────────────────────────────────────────────────────────┤
│ □ All acceptance criteria met                                    │
│ □ Tests passing                                                  │
│ □ TypeScript compiles                                           │
│ □ Lint passes                                                   │
│ □ Documentation updated                                         │
│ □ Handoff notes written                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Example: Spawning a Backend Agent

```markdown
# Complete Example: Task P1-A-003 (API Framework Setup)

You are implementing task P1-A-003 for the idkarr project.

## Required Reading
Before starting, read these files in order:
1. docs/08-project-management/CLAUDE_AGENT_INSTRUCTIONS.md
2. docs/02-architecture/DEEP_ARCHITECTURE.md
3. docs/03-api-specification/REST_API.md
4. docs/06-development/ERROR_HANDLING.md

## Your Task
Set up the Hono API framework with:
- Middleware: requestId, logger, cors, auth, errorHandler
- Health check endpoint at /api/health
- OpenAPI documentation at /api/docs
- Custom error classes

## Acceptance Criteria
- [ ] Hono app configured with Bun
- [ ] All middleware implemented and ordered correctly
- [ ] Health check returns 200 with system status
- [ ] Error responses follow standard format
- [ ] OpenAPI spec generated from routes

## File Structure
packages/backend/src/
├── api/
│   ├── index.ts
│   ├── routes/health.ts
│   └── middleware/[auth,error,logger,cors].ts
└── lib/[logger,config,errors].ts

## Constraints
- Follow patterns in CLAUDE_AGENT_INSTRUCTIONS.md
- Use Zod for all validation
- No console.log (use Pino logger)
- TypeScript strict mode

Begin by reading the required files, then implement.
```

---

*This guide enables rapid, consistent agent deployment for idkarr development.*
