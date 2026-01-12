# Changelog Template & Guidelines

> **idkarr** - Changelog format and release notes guidelines

## Table of Contents

1. [Overview](#overview)
2. [Changelog Format](#changelog-format)
3. [Version Numbering](#version-numbering)
4. [Release Categories](#release-categories)
5. [Writing Guidelines](#writing-guidelines)
6. [Example Changelogs](#example-changelogs)
7. [Automation](#automation)

---

## Overview

### Goals

1. **Transparency**: Clearly communicate changes to users
2. **Consistency**: Maintain uniform format across releases
3. **Discoverability**: Make it easy to find relevant changes
4. **Automation**: Support automated changelog generation

### Format Standard

We follow [Keep a Changelog](https://keepachangelog.com/) principles with modifications for idkarr's specific needs.

---

## Changelog Format

### File Structure

```markdown
# Changelog

All notable changes to idkarr will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- New features that are in development

### Changed
- Changes to existing functionality

### Fixed
- Bug fixes

---

## [1.2.0] - 2024-02-15

### Added
- Feature description

### Changed
- Change description

### Deprecated
- Features being phased out

### Removed
- Features that were removed

### Fixed
- Bug fix description

### Security
- Security-related changes

---

## [1.1.0] - 2024-01-15
...
```

### Entry Format

```markdown
### Category

- **Component**: Brief description of change ([#123](link-to-issue))
  - Additional details if needed
  - Breaking change notice if applicable
```

---

## Version Numbering

### Semantic Versioning

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

Examples:
1.0.0        - Initial stable release
1.1.0        - New features, backward compatible
1.1.1        - Bug fixes only
2.0.0        - Breaking changes
2.0.0-beta.1 - Beta pre-release
2.0.0-rc.1   - Release candidate
```

### Version Increment Rules

| Change Type | Version Bump | Example |
|-------------|--------------|---------|
| Breaking API change | MAJOR | 1.x.x → 2.0.0 |
| Breaking config change | MAJOR | 1.x.x → 2.0.0 |
| Database migration (breaking) | MAJOR | 1.x.x → 2.0.0 |
| New feature | MINOR | 1.1.x → 1.2.0 |
| New integration | MINOR | 1.1.x → 1.2.0 |
| Non-breaking enhancement | MINOR | 1.1.x → 1.2.0 |
| Bug fix | PATCH | 1.1.1 → 1.1.2 |
| Performance improvement | PATCH | 1.1.1 → 1.1.2 |
| Documentation | PATCH | 1.1.1 → 1.1.2 |

### Pre-release Versions

```markdown
## [2.0.0-beta.1] - 2024-03-01

> ⚠️ This is a pre-release version. Not recommended for production use.

### ⚠️ Breaking Changes
- List breaking changes prominently

### Added
- New features in beta
```

---

## Release Categories

### Added

New features and capabilities.

```markdown
### Added

- **Series**: Support for anime series with absolute episode numbering ([#156](link))
- **Search**: Added multi-episode search capability ([#162](link))
- **UI**: New calendar view with week/month toggle ([#170](link))
- **API**: New endpoint `/api/v1/calendar/ical` for calendar export ([#175](link))
- **Integration**: Added Jellyfin media server support ([#180](link))
```

### Changed

Changes to existing functionality.

```markdown
### Changed

- **Parser**: Improved release title parsing accuracy for anime ([#185](link))
- **UI**: Redesigned series detail page for better usability ([#190](link))
- **Performance**: Optimized database queries for large libraries ([#195](link))
- **Config**: Renamed `downloadClient` to `downloadClients` in settings (see migration guide)
```

### Deprecated

Features being phased out (will be removed in future).

```markdown
### Deprecated

- **API**: The `/api/v1/series/lookup` endpoint is deprecated, use `/api/v1/search/series` instead
- **Config**: The `legacyAuth` setting will be removed in v2.0
- **Integration**: Support for Sonarr v2 import will be removed in next major version
```

### Removed

Features that have been removed.

```markdown
### Removed

- **Integration**: Removed support for deprecated NZBMatrix indexer
- **API**: Removed `/api/v1/system/shutdown` endpoint (use Docker signals)
- **UI**: Removed legacy grid view (replaced by new responsive grid)
```

### Fixed

Bug fixes.

```markdown
### Fixed

- **Import**: Fixed issue where files with special characters weren't imported ([#200](link))
- **Search**: Fixed search failing when indexer returns malformed XML ([#205](link))
- **UI**: Fixed dark mode contrast issues in settings page ([#210](link))
- **API**: Fixed pagination returning incorrect total count ([#215](link))
- **Queue**: Fixed downloads getting stuck in "Processing" state ([#220](link))
```

### Security

Security-related changes.

```markdown
### Security

- **Auth**: Fixed session tokens not being invalidated on password change ([#225](link))
- **API**: Added rate limiting to authentication endpoints ([#230](link))
- **Dependencies**: Updated axios to fix CVE-2024-XXXXX ([#235](link))
- **XSS**: Fixed XSS vulnerability in series search ([#240](link))
```

---

## Writing Guidelines

### General Principles

1. **User-focused**: Write for end users, not developers
2. **Concise**: One line per change when possible
3. **Specific**: Mention affected components/features
4. **Linked**: Reference issues/PRs for details
5. **Consistent**: Use same terminology throughout

### Do's and Don'ts

```markdown
# Good Examples ✓

- **Search**: Added support for searching by IMDB ID
- **Queue**: Fixed downloads not starting when disk space is low
- **UI**: Improved loading performance on series list page

# Bad Examples ✗

- Fixed bug (too vague)
- Updated dependencies (missing context)
- Refactored SeriesService.ts (internal detail)
- Added feature requested by user (missing description)
```

### Breaking Changes

Always highlight breaking changes prominently.

```markdown
## [2.0.0] - 2024-06-01

### ⚠️ Breaking Changes

> **Migration Required**: Please read the [migration guide](./docs/migration-v2.md) before upgrading.

- **Database**: PostgreSQL 15+ is now required (was 13+)
- **API**: Response format changed for `/api/v1/series` endpoint
  - `episodes` array is no longer included by default
  - Use `?includeEpisodes=true` to include episodes
- **Config**: `config.json` format has changed
  - Run `idkarr migrate-config` to update your configuration
- **Docker**: Base image changed from Node to Bun
  - Environment variable `NODE_ENV` renamed to `BUN_ENV`
```

### Security Disclosures

```markdown
### Security

- **CRITICAL**: Fixed authentication bypass in API key validation
  - Affected versions: 1.5.0 - 1.5.3
  - CVE: CVE-2024-XXXXX
  - All users should upgrade immediately
  - See [security advisory](link) for details

- **HIGH**: Fixed SQL injection in search endpoint ([#500](link))
  - Affected versions: 1.4.0 - 1.5.3
```

---

## Example Changelogs

### Major Release

```markdown
## [2.0.0] - 2024-06-01

> 🎉 idkarr 2.0 is here! This major release includes a complete UI redesign,
> movie support, and significant performance improvements.

### ⚠️ Breaking Changes

- **Database**: PostgreSQL 15+ is now required
- **API**: See [API migration guide](./docs/api-v2-migration.md)
- **Config**: Configuration format updated (auto-migration available)

### Added

- **Movies**: Full movie management support ([#300](link))
  - Add and monitor movies
  - Automatic quality upgrades
  - Collection management
- **UI**: Completely redesigned interface ([#350](link))
  - Modern, responsive design
  - Dark mode by default
  - Improved accessibility
- **Search**: New unified search across series and movies ([#400](link))
- **Integration**: Added support for 5 new download clients ([#450](link))
- **API**: GraphQL API alongside REST ([#500](link))

### Changed

- **Performance**: 50% faster page loads through optimized queries
- **Parser**: Rewritten release parser with 30% better accuracy
- **Queue**: New queue management with priority support

### Fixed

- Over 100 bug fixes. See full list in [milestone](link).

### Migration

See the [v2.0 migration guide](./docs/migration-v2.md) for detailed upgrade instructions.
```

### Minor Release

```markdown
## [1.5.0] - 2024-04-15

### Added

- **Calendar**: Added iCal export for episode calendars ([#250](link))
- **Notifications**: Added Telegram notification support ([#255](link))
- **UI**: Added bulk edit mode for series ([#260](link))
- **API**: Added `/api/v1/health/detailed` endpoint ([#265](link))

### Changed

- **Search**: Improved search result ranking algorithm ([#270](link))
- **UI**: Updated episode list to show quality badges ([#275](link))
- **Performance**: Reduced memory usage for large libraries ([#280](link))

### Fixed

- **Import**: Fixed multi-episode files not being detected correctly ([#285](link))
- **Notifications**: Fixed Discord webhook failing for long messages ([#290](link))
- **UI**: Fixed calendar showing wrong dates in some timezones ([#295](link))
```

### Patch Release

```markdown
## [1.5.1] - 2024-04-20

### Fixed

- **Import**: Fixed regression causing some imports to fail ([#300](link))
- **API**: Fixed series endpoint returning 500 error ([#305](link))
- **Queue**: Fixed queue items not updating in real-time ([#310](link))

### Security

- **Dependencies**: Updated lodash to fix prototype pollution vulnerability
```

---

## Automation

### Conventional Commits

Use conventional commits to enable automated changelog generation.

```bash
# Format
<type>(<scope>): <description>

[optional body]

[optional footer(s)]

# Types
feat:     New feature (MINOR)
fix:      Bug fix (PATCH)
docs:     Documentation only
style:    Code style (formatting)
refactor: Code refactoring
perf:     Performance improvement
test:     Tests
build:    Build system
ci:       CI configuration
chore:    Other changes
BREAKING CHANGE: Breaking change (MAJOR)

# Examples
feat(search): add IMDB ID search support

fix(queue): prevent stuck downloads when disk full

Closes #123

feat(api)!: change response format for series endpoint

BREAKING CHANGE: The episodes array is no longer included by default.
Use ?includeEpisodes=true query parameter.
```

### Automated Generation

```typescript
// scripts/generate-changelog.ts
import { execSync } from 'child_process';

interface Commit {
  hash: string;
  type: string;
  scope?: string;
  subject: string;
  body?: string;
  breaking: boolean;
  issues: string[];
}

function parseCommits(since: string): Commit[] {
  const log = execSync(
    `git log ${since}..HEAD --format="%H|%s|%b|||"`
  ).toString();

  return log.split('|||').filter(Boolean).map(parseCommit);
}

function parseCommit(raw: string): Commit {
  const [hash, subject, body] = raw.split('|');
  const match = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);

  if (!match) {
    return {
      hash,
      type: 'other',
      subject,
      body,
      breaking: false,
      issues: extractIssues(body),
    };
  }

  const [, type, scope, bang, description] = match;

  return {
    hash,
    type,
    scope,
    subject: description,
    body,
    breaking: !!bang || body?.includes('BREAKING CHANGE'),
    issues: extractIssues(body),
  };
}

function generateChangelog(commits: Commit[], version: string): string {
  const sections = {
    breaking: commits.filter(c => c.breaking),
    feat: commits.filter(c => c.type === 'feat' && !c.breaking),
    fix: commits.filter(c => c.type === 'fix'),
    perf: commits.filter(c => c.type === 'perf'),
    security: commits.filter(c => c.type === 'security'),
  };

  let changelog = `## [${version}] - ${new Date().toISOString().split('T')[0]}\n\n`;

  if (sections.breaking.length) {
    changelog += `### ⚠️ Breaking Changes\n\n`;
    changelog += sections.breaking.map(formatCommit).join('\n');
    changelog += '\n\n';
  }

  if (sections.feat.length) {
    changelog += `### Added\n\n`;
    changelog += sections.feat.map(formatCommit).join('\n');
    changelog += '\n\n';
  }

  if (sections.fix.length) {
    changelog += `### Fixed\n\n`;
    changelog += sections.fix.map(formatCommit).join('\n');
    changelog += '\n\n';
  }

  if (sections.perf.length) {
    changelog += `### Performance\n\n`;
    changelog += sections.perf.map(formatCommit).join('\n');
    changelog += '\n\n';
  }

  if (sections.security.length) {
    changelog += `### Security\n\n`;
    changelog += sections.security.map(formatCommit).join('\n');
    changelog += '\n\n';
  }

  return changelog;
}

function formatCommit(commit: Commit): string {
  const scope = commit.scope ? `**${commit.scope}**: ` : '';
  const issues = commit.issues.length
    ? ` (${commit.issues.map(i => `[#${i}](link/${i})`).join(', ')})`
    : '';

  return `- ${scope}${commit.subject}${issues}`;
}
```

### GitHub Release Notes

```yaml
# .github/release.yml
changelog:
  exclude:
    labels:
      - skip-changelog
      - documentation
    authors:
      - dependabot
  categories:
    - title: ⚠️ Breaking Changes
      labels:
        - breaking-change
    - title: 🚀 New Features
      labels:
        - enhancement
        - feature
    - title: 🐛 Bug Fixes
      labels:
        - bug
        - fix
    - title: 🔒 Security
      labels:
        - security
    - title: 📈 Performance
      labels:
        - performance
    - title: 📦 Dependencies
      labels:
        - dependencies
    - title: 🏗️ Other Changes
      labels:
        - "*"
```

---

## Related Documents

- [PROJECT_PLAN.md](./PROJECT_PLAN.md) - Release planning
- [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) - Release testing
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Release deployment
