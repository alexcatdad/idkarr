# idkarr Documentation

> Sonarr Rebuild Project - TypeScript + Bun Modern Stack

## Documentation Structure

This documentation is organized by scope to help you find what you need quickly.

---

### 01 - Project Overview
High-level project information, planning, and terminology.

| Document | Description |
|----------|-------------|
| [PROJECT_PLAN.md](01-project-overview/PROJECT_PLAN.md) | Executive summary, architecture overview, implementation roadmap |
| [GLOSSARY.md](01-project-overview/GLOSSARY.md) | Terms, definitions, and concepts reference |
| [SPEC_GAP_ANALYSIS.md](01-project-overview/SPEC_GAP_ANALYSIS.md) | Gap analysis between current specs and requirements |

---

### 02 - Architecture
System design, database schemas, and architectural decisions.

| Document | Description |
|----------|-------------|
| [DEEP_ARCHITECTURE.md](02-architecture/DEEP_ARCHITECTURE.md) | Technology stack, backend/frontend architecture, patterns |
| [DATABASE_SCHEMA.md](02-architecture/DATABASE_SCHEMA.md) | Complete database schema definitions |
| [DATA_FLOW_DIAGRAMS.md](02-architecture/DATA_FLOW_DIAGRAMS.md) | System data flow and process diagrams |
| [PLUGIN_ARCHITECTURE.md](02-architecture/PLUGIN_ARCHITECTURE.md) | Plugin system design and extension points |

---

### 03 - API Specification
REST API and real-time communication protocols.

| Document | Description |
|----------|-------------|
| [REST_API.md](03-api-specification/REST_API.md) | Complete REST API v3 documentation |
| [WEBSOCKET_EVENTS.md](03-api-specification/WEBSOCKET_EVENTS.md) | WebSocket event definitions and protocols |

---

### 04 - Features
Detailed specifications for application features and capabilities.

| Document | Description |
|----------|-------------|
| [UNIFIED_MEDIA_MANAGER.md](04-features/UNIFIED_MEDIA_MANAGER.md) | Media management across TV/Movies/Music |
| [DISCOVERY_REQUESTS.md](04-features/DISCOVERY_REQUESTS.md) | Content discovery and request system |
| [SEARCH_SPECIFICATION.md](04-features/SEARCH_SPECIFICATION.md) | Search functionality specification |
| [PARSER_SPECIFICATION.md](04-features/PARSER_SPECIFICATION.md) | Release name parsing rules and logic |
| [AI_RECOMMENDATIONS.md](04-features/AI_RECOMMENDATIONS.md) | AI-powered recommendation system |
| [MULTI_INSTANCE_SONARR.md](04-features/MULTI_INSTANCE_SONARR.md) | Multi-instance deployment and management |
| [MULTI_USER_ACL.md](04-features/MULTI_USER_ACL.md) | Multi-user access control lists |
| [TRASH_SUPPORT.md](04-features/TRASH_SUPPORT.md) | Soft delete and recovery functionality |
| [FILE_NAMING_RULES.md](04-features/FILE_NAMING_RULES.md) | File naming patterns and conventions |
| [AGENTS.md](04-features/AGENTS.md) | Background agents and automation |
| [CACHING.md](04-features/CACHING.md) | Caching strategies and implementation |

---

### 05 - Infrastructure
Deployment, operations, security, and integrations.

| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](05-infrastructure/DEPLOYMENT.md) | Docker & Kubernetes deployment guide |
| [BACKUP_RECOVERY.md](05-infrastructure/BACKUP_RECOVERY.md) | Backup and disaster recovery procedures |
| [MONITORING_OBSERVABILITY.md](05-infrastructure/MONITORING_OBSERVABILITY.md) | Logging, metrics, and observability |
| [SECURITY.md](05-infrastructure/SECURITY.md) | Security architecture and policies |
| [SECURITY_BEST_PRACTICES.md](05-infrastructure/SECURITY_BEST_PRACTICES.md) | Security implementation guidelines |
| [INTEGRATION_SPECIFICATIONS.md](05-infrastructure/INTEGRATION_SPECIFICATIONS.md) | External service integrations |

---

### 06 - Development
Development workflows, testing, and contribution guidelines.

| Document | Description |
|----------|-------------|
| [TESTING_STRATEGY.md](06-development/TESTING_STRATEGY.md) | Testing philosophy, tools, and coverage |
| [ERROR_HANDLING.md](06-development/ERROR_HANDLING.md) | Error handling patterns and codes |
| [PERFORMANCE_REQUIREMENTS.md](06-development/PERFORMANCE_REQUIREMENTS.md) | Performance benchmarks and targets |
| [MIGRATION_GUIDE.md](06-development/MIGRATION_GUIDE.md) | Migration from existing Sonarr |
| [CHANGELOG_TEMPLATE.md](06-development/CHANGELOG_TEMPLATE.md) | Changelog format and conventions |
| [INTERNATIONALIZATION.md](06-development/INTERNATIONALIZATION.md) | i18n and localization support |
| [ANALYTICS_REPORTING.md](06-development/ANALYTICS_REPORTING.md) | Analytics and reporting features |

---

### 07 - Reference
UI/UX specifications and design references.

| Document | Description |
|----------|-------------|
| [UI_UX_SPECIFICATION.md](07-reference/UI_UX_SPECIFICATION.md) | User interface and experience design |

---

## Quick Links

**Getting Started:** Start with [PROJECT_PLAN.md](01-project-overview/PROJECT_PLAN.md) for an overview

**API Development:** See [REST_API.md](03-api-specification/REST_API.md) and [WEBSOCKET_EVENTS.md](03-api-specification/WEBSOCKET_EVENTS.md)

**Deployment:** Follow [DEPLOYMENT.md](05-infrastructure/DEPLOYMENT.md) for Docker/Kubernetes setup

**Contributing:** Review [TESTING_STRATEGY.md](06-development/TESTING_STRATEGY.md) before submitting PRs

---

## External Resources

- **Sonarr Source Code:** `./Sonarr/` directory contains the original C# implementation for reference
