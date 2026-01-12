# Security Best Practices

> **idkarr** - Extended security practices and operational security guidelines

## Table of Contents

1. [Supply Chain Security](#supply-chain-security)
2. [Container Security](#container-security)
3. [Infrastructure Security](#infrastructure-security)
4. [Secure Development Lifecycle](#secure-development-lifecycle)
5. [Security Testing](#security-testing)
6. [Incident Response](#incident-response)
7. [Secret Rotation](#secret-rotation)
8. [Compliance & Privacy](#compliance--privacy)
9. [Security Monitoring](#security-monitoring)
10. [Third-Party Integration Security](#third-party-integration-security)

---

## Supply Chain Security

### Dependency Management

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      production-dependencies:
        dependency-type: "production"
      development-dependencies:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"
    ignore:
      # Ignore major version updates for critical packages
      - dependency-name: "drizzle-orm"
        update-types: ["version-update:semver-major"]
```

### Lock File Integrity

```typescript
// Verify lock file integrity in CI
interface LockFilePolicy {
  // Require lock file for all installs
  requireLockFile: true;

  // Fail if lock file is out of sync
  strictLockFile: true;

  // Audit dependencies on every install
  auditOnInstall: true;

  // Block packages with known vulnerabilities
  blockVulnerabilities: {
    critical: true;
    high: true;
    moderate: false; // Review manually
    low: false;
  };
}
```

```bash
#!/bin/bash
# scripts/check-dependencies.sh

set -e

echo "🔍 Checking dependency integrity..."

# Verify lock file exists and matches package.json
if ! bun install --frozen-lockfile; then
  echo "❌ Lock file out of sync with package.json"
  exit 1
fi

# Run security audit
echo "🔒 Running security audit..."
bun audit --level=high

# Check for outdated packages with known vulnerabilities
echo "📦 Checking for vulnerable packages..."
bun audit --json > audit-results.json

CRITICAL=$(jq '.vulnerabilities.critical' audit-results.json)
HIGH=$(jq '.vulnerabilities.high' audit-results.json)

if [ "$CRITICAL" -gt 0 ] || [ "$HIGH" -gt 0 ]; then
  echo "❌ Found $CRITICAL critical and $HIGH high severity vulnerabilities"
  exit 1
fi

echo "✅ Dependency check passed"
```

### Software Bill of Materials (SBOM)

```typescript
// Generate SBOM for releases
interface SBOMConfig {
  format: 'cyclonedx' | 'spdx';
  outputPath: string;
  includeDevDependencies: boolean;
}

// CI/CD step to generate SBOM
const sbomGeneration = {
  name: 'Generate SBOM',
  run: `
    npx @cyclonedx/cyclonedx-npm --output-format json --output-file sbom.json
    # Upload to artifact storage
    aws s3 cp sbom.json s3://artifacts/idkarr/\${VERSION}/sbom.json
  `,
};
```

```json
// Example SBOM entry (CycloneDX format)
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "metadata": {
    "timestamp": "2024-01-15T00:00:00Z",
    "component": {
      "name": "idkarr",
      "version": "1.0.0",
      "type": "application"
    }
  },
  "components": [
    {
      "type": "library",
      "name": "hono",
      "version": "4.0.0",
      "purl": "pkg:npm/hono@4.0.0",
      "licenses": [{ "license": { "id": "MIT" } }],
      "hashes": [
        {
          "alg": "SHA-256",
          "content": "abc123..."
        }
      ]
    }
  ]
}
```

### Allowed/Blocked Packages

```typescript
// package-policies.json
interface PackagePolicy {
  // Packages that are explicitly allowed
  allowList: string[];

  // Packages that are explicitly blocked
  blockList: {
    package: string;
    reason: string;
    alternative?: string;
  }[];

  // License restrictions
  allowedLicenses: string[];
  blockedLicenses: string[];

  // Source restrictions
  requireRegistry: 'npm' | 'github';
  blockPrivatePackages: boolean;
}

const packagePolicy: PackagePolicy = {
  allowList: ['*'], // Allow all by default

  blockList: [
    {
      package: 'event-stream',
      reason: 'Historical supply chain attack',
      alternative: 'Use native Node.js streams',
    },
    {
      package: 'colors',
      reason: 'Maintainer sabotaged package',
      alternative: 'chalk',
    },
  ],

  allowedLicenses: [
    'MIT',
    'Apache-2.0',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'ISC',
    '0BSD',
  ],

  blockedLicenses: [
    'GPL-3.0', // Copyleft incompatible with our license
    'AGPL-3.0',
  ],

  requireRegistry: 'npm',
  blockPrivatePackages: true,
};
```

---

## Container Security

### Docker Image Security

```dockerfile
# Dockerfile with security best practices

# Use specific version, not 'latest'
FROM oven/bun:1.1.0-slim AS base

# Create non-root user
RUN addgroup --system --gid 1001 idkarr && \
    adduser --system --uid 1001 --gid 1001 idkarr

# Set working directory
WORKDIR /app

# Copy only necessary files for dependency installation
COPY package.json bun.lockb ./

# Install dependencies (no devDependencies in production)
RUN bun install --production --frozen-lockfile

# Build stage
FROM base AS builder
COPY . .
RUN bun run build

# Production stage - minimal image
FROM oven/bun:1.1.0-slim AS production

# Security: Create non-root user
RUN addgroup --system --gid 1001 idkarr && \
    adduser --system --uid 1001 --gid 1001 idkarr

WORKDIR /app

# Copy only production artifacts
COPY --from=builder --chown=idkarr:idkarr /app/dist ./dist
COPY --from=builder --chown=idkarr:idkarr /app/node_modules ./node_modules
COPY --from=builder --chown=idkarr:idkarr /app/package.json ./

# Security: Remove unnecessary capabilities
# Security: Run as non-root user
USER idkarr

# Security: Read-only filesystem where possible
# Note: /app/data must be writable for config/db

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8989/api/v1/health || exit 1

# Expose only necessary port
EXPOSE 8989

# Use exec form to handle signals properly
CMD ["bun", "run", "dist/index.js"]
```

### Image Scanning

```yaml
# .github/workflows/security-scan.yml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 6 * * *' # Daily at 6 AM

jobs:
  trivy-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t idkarr:${{ github.sha }} .

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'idkarr:${{ github.sha }}'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
          exit-code: '1' # Fail on critical/high

      - name: Upload scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

  grype-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Grype scanner
        uses: anchore/scan-action@v3
        with:
          path: "."
          fail-build: true
          severity-cutoff: high
```

### Runtime Security

```yaml
# docker-compose.security.yml
version: '3.8'

services:
  idkarr:
    image: idkarr:latest
    user: "1001:1001" # Non-root
    read_only: true # Read-only filesystem
    tmpfs:
      - /tmp:mode=1777,size=100m
    volumes:
      - ./data:/app/data:rw # Only data directory writable
    security_opt:
      - no-new-privileges:true # Prevent privilege escalation
    cap_drop:
      - ALL # Drop all capabilities
    cap_add:
      - NET_BIND_SERVICE # Only if binding to port < 1024
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    networks:
      - internal
      - external
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8989/health"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  internal:
    internal: true # No external access
  external:
    driver: bridge
```

### Kubernetes Security Context

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: idkarr
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1001
        runAsGroup: 1001
        fsGroup: 1001
        seccompProfile:
          type: RuntimeDefault

      containers:
        - name: idkarr
          image: idkarr:latest
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
          resources:
            limits:
              cpu: "2"
              memory: "2Gi"
            requests:
              cpu: "500m"
              memory: "512Mi"
          volumeMounts:
            - name: data
              mountPath: /app/data
            - name: tmp
              mountPath: /tmp

      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: idkarr-data
        - name: tmp
          emptyDir:
            medium: Memory
            sizeLimit: 100Mi
```

---

## Infrastructure Security

### Network Policies

```yaml
# k8s/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: idkarr-network-policy
spec:
  podSelector:
    matchLabels:
      app: idkarr
  policyTypes:
    - Ingress
    - Egress

  ingress:
    # Allow traffic from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8989

    # Allow health checks from kubelet
    - from:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: 8989
          endPort: 8989

  egress:
    # Allow DNS
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53

    # Allow PostgreSQL
    - to:
        - podSelector:
            matchLabels:
              app: postgresql
      ports:
        - protocol: TCP
          port: 5432

    # Allow Redis
    - to:
        - podSelector:
            matchLabels:
              app: redis
      ports:
        - protocol: TCP
          port: 6379

    # Allow HTTPS to external services (indexers, metadata)
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - protocol: TCP
          port: 443
```

### Firewall Rules (UFW Example)

```bash
#!/bin/bash
# scripts/setup-firewall.sh

# Reset to default
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (rate limited)
ufw limit 22/tcp comment 'SSH rate limited'

# Allow HTTP/HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Allow idkarr web UI (if not behind reverse proxy)
# ufw allow 8989/tcp comment 'idkarr'

# Allow from specific IPs for management
ufw allow from 10.0.0.0/8 to any port 22 comment 'Internal SSH'

# Enable logging
ufw logging medium

# Enable firewall
ufw --force enable
ufw status verbose
```

### Reverse Proxy Hardening (Caddy)

```caddyfile
# Caddyfile with security headers
{
    admin off # Disable admin API
    auto_https on
}

idkarr.example.com {
    # TLS configuration
    tls {
        protocols tls1.2 tls1.3
        ciphers TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384 TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384
    }

    # Security headers
    header {
        # HSTS
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

        # Prevent clickjacking
        X-Frame-Options "DENY"

        # XSS protection
        X-XSS-Protection "1; mode=block"

        # Prevent MIME sniffing
        X-Content-Type-Options "nosniff"

        # Referrer policy
        Referrer-Policy "strict-origin-when-cross-origin"

        # CSP
        Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' wss:; frame-ancestors 'none';"

        # Permissions policy
        Permissions-Policy "geolocation=(), microphone=(), camera=()"

        # Remove server header
        -Server
    }

    # Rate limiting
    rate_limit {
        zone static {
            key static
            events 100
            window 1m
        }
    }

    # Proxy to idkarr
    reverse_proxy localhost:8989 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}

        # Timeouts
        transport http {
            dial_timeout 30s
            response_header_timeout 60s
        }
    }

    # Block sensitive paths
    @blocked path /api/v1/system/shutdown* /api/v1/system/restart*
    respond @blocked 403

    # Logging
    log {
        output file /var/log/caddy/idkarr.log {
            roll_size 100mb
            roll_keep 5
        }
        format json
    }
}
```

---

## Secure Development Lifecycle

### Security Gates in CI/CD

```yaml
# .github/workflows/security-gates.yml
name: Security Gates

on:
  pull_request:
    branches: [main, develop]

jobs:
  # Gate 1: Static Analysis
  static-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run ESLint security rules
        run: bun run lint:security

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/secrets
            p/typescript
            p/jwt
            p/sql-injection

  # Gate 2: Dependency Check
  dependency-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Audit dependencies
        run: |
          bun install
          bun audit --level=high

      - name: Check for known vulnerable packages
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  # Gate 3: Secret Scanning
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Scan for secrets with Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Scan for secrets with TruffleHog
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          extra_args: --only-verified

  # Gate 4: SAST
  sast:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v2
        with:
          languages: javascript, typescript

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2

  # Gate 5: Container Scan (if applicable)
  container-scan:
    runs-on: ubuntu-latest
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t idkarr:test .

      - name: Scan image with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'idkarr:test'
          severity: 'CRITICAL,HIGH'
          exit-code: '1'
```

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-merge-conflict
      - id: detect-private-key
      - id: detect-aws-credentials
      - id: check-added-large-files
        args: ['--maxkb=1000']

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks

  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']

  - repo: local
    hooks:
      - id: no-console-log
        name: Check for console.log
        entry: bash -c 'grep -rn "console\.log" --include="*.ts" src/ && exit 1 || exit 0'
        language: system
        types: [typescript]

      - id: no-hardcoded-secrets
        name: Check for hardcoded secrets
        entry: bash -c 'grep -rn "password\s*=\s*[\"'\''][^\"'\'']*[\"'\'']" --include="*.ts" src/ && exit 1 || exit 0'
        language: system
        types: [typescript]
```

### Security Code Review Checklist

```markdown
## Security Review Checklist

### Authentication & Authorization
- [ ] All endpoints have appropriate authentication
- [ ] Authorization checks use centralized middleware
- [ ] No hardcoded credentials or API keys
- [ ] Session handling follows security best practices

### Input Validation
- [ ] All user input is validated
- [ ] Input validation happens at API boundary
- [ ] File uploads are validated (type, size, content)
- [ ] Path traversal attacks are prevented

### Data Protection
- [ ] Sensitive data is encrypted at rest
- [ ] PII is not logged
- [ ] SQL queries use parameterization
- [ ] No sensitive data in URLs

### Error Handling
- [ ] Errors don't leak sensitive information
- [ ] Stack traces are not exposed in production
- [ ] Failed operations are logged appropriately

### Dependencies
- [ ] New dependencies have been reviewed
- [ ] Dependencies are pinned to specific versions
- [ ] No known vulnerabilities in dependencies

### API Security
- [ ] Rate limiting is applied
- [ ] CORS is properly configured
- [ ] Security headers are set
- [ ] API versioning is maintained
```

---

## Security Testing

### Penetration Testing Schedule

```typescript
interface PenTestSchedule {
  // Annual comprehensive test
  annual: {
    scope: 'full';
    provider: 'external';
    includesInfrastructure: true;
    includesApplication: true;
    includesSocialEngineering: boolean;
  };

  // Quarterly focused tests
  quarterly: {
    scope: 'targeted';
    focus: 'api' | 'web' | 'authentication';
    provider: 'external' | 'internal';
  };

  // Continuous automated scanning
  continuous: {
    dast: boolean; // Dynamic Application Security Testing
    sast: boolean; // Static Application Security Testing
    dependency: boolean;
    container: boolean;
  };
}

const penTestSchedule: PenTestSchedule = {
  annual: {
    scope: 'full',
    provider: 'external',
    includesInfrastructure: true,
    includesApplication: true,
    includesSocialEngineering: false,
  },
  quarterly: {
    scope: 'targeted',
    focus: 'api',
    provider: 'internal',
  },
  continuous: {
    dast: true,
    sast: true,
    dependency: true,
    container: true,
  },
};
```

### OWASP ZAP Automation

```yaml
# zap-automation.yaml
env:
  contexts:
    - name: "idkarr"
      urls:
        - "http://localhost:8989"
      includePaths:
        - "http://localhost:8989/.*"
      excludePaths:
        - "http://localhost:8989/static/.*"
      authentication:
        method: "form"
        parameters:
          loginUrl: "http://localhost:8989/login"
          loginRequestData: "username={%username%}&password={%password%}"
        verification:
          method: "response"
          loggedInRegex: "\\QLogout\\E"
      users:
        - name: "test-user"
          credentials:
            username: "testuser"
            password: "testpassword"

jobs:
  - type: spider
    parameters:
      context: "idkarr"
      user: "test-user"
      maxDuration: 5

  - type: spiderAjax
    parameters:
      context: "idkarr"
      maxDuration: 5

  - type: passiveScan-wait
    parameters:
      maxDuration: 10

  - type: activeScan
    parameters:
      context: "idkarr"
      user: "test-user"
      policy: "API-Scan"
      maxRuleDurationInMins: 5

  - type: report
    parameters:
      template: "sarif-json"
      reportFile: "zap-report.sarif"
```

---

## Incident Response

### Incident Response Plan

```typescript
interface IncidentResponsePlan {
  severity: IncidentSeverity;
  phases: IncidentPhase[];
  contacts: EmergencyContact[];
  communicationPlan: CommunicationPlan;
}

type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';

interface IncidentPhase {
  name: string;
  duration: string;
  actions: string[];
  responsible: string;
}

const incidentResponsePlan: IncidentResponsePlan = {
  severity: 'critical',
  phases: [
    {
      name: 'Detection & Identification',
      duration: '0-30 minutes',
      actions: [
        'Verify the incident is real (not false positive)',
        'Assess initial scope and impact',
        'Assign incident commander',
        'Begin incident log',
        'Alert key personnel',
      ],
      responsible: 'On-call Engineer',
    },
    {
      name: 'Containment',
      duration: '30 minutes - 2 hours',
      actions: [
        'Isolate affected systems',
        'Block malicious IPs/accounts',
        'Preserve evidence (logs, memory dumps)',
        'Disable compromised credentials',
        'Enable enhanced logging',
      ],
      responsible: 'Security Team',
    },
    {
      name: 'Eradication',
      duration: '2-24 hours',
      actions: [
        'Identify root cause',
        'Remove malicious code/access',
        'Patch vulnerabilities',
        'Reset all potentially compromised credentials',
        'Verify eradication complete',
      ],
      responsible: 'Security Team + Engineering',
    },
    {
      name: 'Recovery',
      duration: '24-72 hours',
      actions: [
        'Restore from clean backups if needed',
        'Gradually restore services',
        'Monitor for re-compromise',
        'Verify system integrity',
        'Resume normal operations',
      ],
      responsible: 'Engineering Team',
    },
    {
      name: 'Post-Incident',
      duration: '1-2 weeks',
      actions: [
        'Complete incident report',
        'Conduct post-mortem',
        'Identify lessons learned',
        'Update security controls',
        'Notify affected users if required',
        'File regulatory reports if required',
      ],
      responsible: 'Security Team + Leadership',
    },
  ],
  contacts: [
    { role: 'Incident Commander', name: 'TBD', phone: 'TBD', email: 'TBD' },
    { role: 'Security Lead', name: 'TBD', phone: 'TBD', email: 'TBD' },
    { role: 'Engineering Lead', name: 'TBD', phone: 'TBD', email: 'TBD' },
    { role: 'Legal/Compliance', name: 'TBD', phone: 'TBD', email: 'TBD' },
  ],
  communicationPlan: {
    internal: {
      channel: 'Dedicated Slack channel',
      updateFrequency: '30 minutes',
    },
    external: {
      statusPage: 'status.idkarr.app',
      userNotification: 'Email + In-app banner',
    },
  },
};
```

### Incident Playbooks

```markdown
## Playbook: Compromised API Key

### Indicators
- Unusual API traffic patterns
- Requests from unknown IPs
- Actions not matching user behavior

### Immediate Actions (< 15 minutes)
1. Revoke the compromised API key
2. Block suspicious IP addresses
3. Force logout all sessions for affected user
4. Enable enhanced logging for user account

### Investigation
1. Review API key usage logs
2. Identify what data/actions were accessed
3. Determine how key was compromised
4. Check for lateral movement

### Recovery
1. Generate new API key for user
2. Review and clean up any malicious actions
3. Notify user of compromise
4. Recommend user change password and enable 2FA

---

## Playbook: SQL Injection Attempt

### Indicators
- WAF alerts for SQL injection patterns
- Unusual database errors in logs
- Unexpected database queries

### Immediate Actions (< 15 minutes)
1. Block source IP at WAF/firewall
2. Review recent database queries
3. Check for data exfiltration

### Investigation
1. Identify vulnerable endpoint
2. Review code for SQL injection vulnerability
3. Assess if attack was successful
4. Check for similar vulnerabilities

### Recovery
1. Deploy patch for vulnerable code
2. Rotate database credentials
3. Review and audit all parameterized queries
4. Enhance input validation

---

## Playbook: Data Breach

### Indicators
- Unauthorized data access in audit logs
- External report of data exposure
- Unusual data export activity

### Immediate Actions (< 30 minutes)
1. Contain the breach (isolate systems)
2. Preserve all evidence
3. Notify incident commander
4. Begin breach assessment

### Investigation
1. Identify what data was accessed/exfiltrated
2. Determine number of affected users
3. Identify attack vector
4. Timeline of breach

### Recovery & Notification
1. Close attack vector
2. Assess legal notification requirements
3. Prepare user notification
4. Notify regulatory bodies if required
5. Offer identity protection if PII exposed
```

---

## Secret Rotation

### Automated Key Rotation

```typescript
interface SecretRotationPolicy {
  secretType: string;
  rotationInterval: number; // days
  gracePeriod: number; // hours - old key still valid
  notifyBefore: number; // days
  autoRotate: boolean;
}

const rotationPolicies: SecretRotationPolicy[] = [
  {
    secretType: 'database_password',
    rotationInterval: 90,
    gracePeriod: 24,
    notifyBefore: 7,
    autoRotate: true,
  },
  {
    secretType: 'api_keys',
    rotationInterval: 365,
    gracePeriod: 48,
    notifyBefore: 30,
    autoRotate: false, // User-managed
  },
  {
    secretType: 'jwt_signing_key',
    rotationInterval: 30,
    gracePeriod: 24,
    notifyBefore: 3,
    autoRotate: true,
  },
  {
    secretType: 'encryption_key',
    rotationInterval: 365,
    gracePeriod: 168, // 7 days
    notifyBefore: 30,
    autoRotate: true,
  },
];

class SecretRotationService {
  async rotateSecret(secretType: string): Promise<RotationResult> {
    const policy = this.getPolicy(secretType);

    switch (secretType) {
      case 'database_password':
        return this.rotateDatabasePassword(policy);
      case 'jwt_signing_key':
        return this.rotateJWTKey(policy);
      case 'encryption_key':
        return this.rotateEncryptionKey(policy);
      default:
        throw new Error(`Unknown secret type: ${secretType}`);
    }
  }

  private async rotateJWTKey(policy: SecretRotationPolicy): Promise<RotationResult> {
    // Generate new key
    const newKey = await generateSecureKey(256);

    // Store new key as primary
    await this.vault.set('jwt_signing_key_current', newKey);

    // Keep old key for grace period (to validate existing tokens)
    const oldKey = await this.vault.get('jwt_signing_key_current');
    await this.vault.set('jwt_signing_key_previous', oldKey, {
      ttl: policy.gracePeriod * 3600,
    });

    // Update application config
    await this.configService.update({
      jwtSigningKey: newKey,
      jwtPreviousKey: oldKey, // For validation during grace period
    });

    return {
      success: true,
      secretType: 'jwt_signing_key',
      rotatedAt: new Date(),
      gracePeriodEnds: new Date(Date.now() + policy.gracePeriod * 3600 * 1000),
    };
  }

  private async rotateEncryptionKey(policy: SecretRotationPolicy): Promise<RotationResult> {
    // Generate new key
    const newKey = await generateSecureKey(256);
    const newKeyId = crypto.randomUUID();

    // Store new key
    await this.vault.set(`encryption_key_${newKeyId}`, newKey);
    await this.vault.set('encryption_key_current_id', newKeyId);

    // Re-encrypt sensitive data with new key (background job)
    await this.queueService.add('reencrypt-data', {
      newKeyId,
      oldKeyId: await this.vault.get('encryption_key_previous_id'),
    });

    return {
      success: true,
      secretType: 'encryption_key',
      rotatedAt: new Date(),
      note: 'Re-encryption job queued',
    };
  }
}
```

---

## Compliance & Privacy

### GDPR Compliance

```typescript
interface GDPRCompliance {
  dataSubjectRights: {
    rightToAccess: boolean;
    rightToRectification: boolean;
    rightToErasure: boolean;
    rightToPortability: boolean;
    rightToRestriction: boolean;
    rightToObject: boolean;
  };

  dataProcessing: {
    lawfulBasis: 'consent' | 'contract' | 'legitimate_interest';
    purposeLimitation: string[];
    dataMinimization: boolean;
    storageLimitation: number; // days
  };

  technicalMeasures: {
    encryption: boolean;
    pseudonymization: boolean;
    accessControls: boolean;
    auditLogging: boolean;
  };
}

class GDPRService {
  /**
   * Export all user data (Right to Access / Portability)
   */
  async exportUserData(userId: number): Promise<UserDataExport> {
    const [
      profile,
      preferences,
      watchHistory,
      apiKeys,
      sessions,
      auditLogs,
    ] = await Promise.all([
      this.userService.getProfile(userId),
      this.preferenceService.getAll(userId),
      this.historyService.getAll(userId),
      this.apiKeyService.getAll(userId),
      this.sessionService.getAll(userId),
      this.auditService.getForUser(userId),
    ]);

    return {
      exportDate: new Date(),
      format: 'json',
      data: {
        profile: this.sanitizeProfile(profile),
        preferences,
        watchHistory,
        apiKeys: apiKeys.map(k => ({ name: k.name, createdAt: k.createdAt })),
        sessions: sessions.map(s => ({
          createdAt: s.createdAt,
          lastUsed: s.lastUsedAt,
          ipAddress: s.ipAddress,
        })),
        activityLog: auditLogs,
      },
    };
  }

  /**
   * Delete all user data (Right to Erasure)
   */
  async deleteUserData(userId: number): Promise<DeletionResult> {
    // Verify user identity first (require re-authentication)

    await this.db.transaction(async (tx) => {
      // Delete in order of dependencies
      await tx.delete(sessions).where(eq(sessions.userId, userId));
      await tx.delete(apiKeys).where(eq(apiKeys.userId, userId));
      await tx.delete(watchHistory).where(eq(watchHistory.userId, userId));
      await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
      await tx.delete(userTasteEmbeddings).where(eq(userTasteEmbeddings.userId, userId));

      // Anonymize audit logs (keep for compliance, remove PII)
      await tx.update(auditLogs)
        .set({ userId: null, ipAddress: null, userAgent: null })
        .where(eq(auditLogs.userId, userId));

      // Delete user account
      await tx.delete(users).where(eq(users.id, userId));
    });

    // Clear caches
    await this.cache.deletePattern(`user:${userId}:*`);

    return {
      success: true,
      deletedAt: new Date(),
      userId,
    };
  }
}
```

### Data Retention Policy

```typescript
interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: number; // days
  action: 'delete' | 'anonymize' | 'archive';
  legalBasis: string;
}

const retentionPolicies: DataRetentionPolicy[] = [
  {
    dataType: 'session_logs',
    retentionPeriod: 30,
    action: 'delete',
    legalBasis: 'No longer necessary',
  },
  {
    dataType: 'audit_logs',
    retentionPeriod: 365,
    action: 'anonymize',
    legalBasis: 'Legal compliance',
  },
  {
    dataType: 'watch_history',
    retentionPeriod: 730, // 2 years
    action: 'anonymize',
    legalBasis: 'User service improvement',
  },
  {
    dataType: 'deleted_user_data',
    retentionPeriod: 30,
    action: 'delete',
    legalBasis: 'GDPR compliance',
  },
  {
    dataType: 'backup_data',
    retentionPeriod: 90,
    action: 'delete',
    legalBasis: 'Business continuity',
  },
];
```

---

## Security Monitoring

### Real-Time Alerting

```typescript
interface SecurityAlert {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: SecurityAlertType;
  title: string;
  description: string;
  timestamp: Date;
  source: string;
  metadata: Record<string, unknown>;
}

type SecurityAlertType =
  | 'brute_force'
  | 'sql_injection'
  | 'xss_attempt'
  | 'unauthorized_access'
  | 'privilege_escalation'
  | 'data_exfiltration'
  | 'anomalous_behavior'
  | 'failed_auth_spike'
  | 'api_abuse';

const alertRules: AlertRule[] = [
  {
    name: 'Brute Force Detection',
    type: 'brute_force',
    condition: {
      event: 'auth.failed',
      threshold: 10,
      window: '5m',
      groupBy: ['ip_address'],
    },
    severity: 'high',
    actions: ['block_ip', 'alert_slack', 'create_incident'],
  },
  {
    name: 'SQL Injection Attempt',
    type: 'sql_injection',
    condition: {
      event: 'waf.blocked',
      pattern: 'sql_injection',
      threshold: 1,
      window: '1m',
    },
    severity: 'high',
    actions: ['block_ip', 'alert_slack', 'log_forensics'],
  },
  {
    name: 'Anomalous Data Access',
    type: 'data_exfiltration',
    condition: {
      event: 'api.response',
      metric: 'response_size',
      threshold: '100MB',
      window: '1h',
      groupBy: ['user_id'],
    },
    severity: 'medium',
    actions: ['alert_slack', 'flag_for_review'],
  },
  {
    name: 'API Abuse',
    type: 'api_abuse',
    condition: {
      event: 'api.request',
      threshold: 1000,
      window: '1m',
      groupBy: ['api_key'],
    },
    severity: 'medium',
    actions: ['rate_limit', 'alert_slack'],
  },
];
```

### Security Dashboard Metrics

```typescript
interface SecurityMetrics {
  // Authentication metrics
  auth: {
    loginAttempts: Counter;
    failedLogins: Counter;
    mfaUsage: Gauge;
    activeSessions: Gauge;
  };

  // Threat metrics
  threats: {
    blockedRequests: Counter;
    sqlInjectionAttempts: Counter;
    xssAttempts: Counter;
    bruteForceAttempts: Counter;
  };

  // Access metrics
  access: {
    apiRequestsByKey: Counter;
    unauthorizedAttempts: Counter;
    privilegeEscalations: Counter;
  };

  // Compliance metrics
  compliance: {
    dataExportRequests: Counter;
    dataDeletionRequests: Counter;
    auditLogVolume: Gauge;
  };
}

// Prometheus metrics
const securityMetrics = {
  loginAttempts: new Counter({
    name: 'idkarr_login_attempts_total',
    help: 'Total login attempts',
    labelNames: ['status', 'method'],
  }),

  blockedRequests: new Counter({
    name: 'idkarr_blocked_requests_total',
    help: 'Requests blocked by security rules',
    labelNames: ['reason', 'source'],
  }),

  activeApiKeys: new Gauge({
    name: 'idkarr_active_api_keys',
    help: 'Number of active API keys',
  }),

  secretAge: new Gauge({
    name: 'idkarr_secret_age_days',
    help: 'Age of secrets in days',
    labelNames: ['secret_type'],
  }),
};
```

---

## Third-Party Integration Security

### Webhook Verification

```typescript
interface WebhookSecurityConfig {
  // Signature verification
  signatureHeader: string;
  signatureAlgorithm: 'hmac-sha256' | 'hmac-sha512';
  secret: string;

  // Replay protection
  timestampHeader?: string;
  maxAge: number; // seconds

  // IP allowlist
  allowedIPs?: string[];
}

class WebhookVerifier {
  verify(request: Request, config: WebhookSecurityConfig): VerificationResult {
    // 1. Verify IP if configured
    if (config.allowedIPs) {
      const clientIP = request.headers.get('x-forwarded-for') ?? request.ip;
      if (!config.allowedIPs.includes(clientIP)) {
        return { valid: false, reason: 'ip_not_allowed' };
      }
    }

    // 2. Verify timestamp (replay protection)
    if (config.timestampHeader) {
      const timestamp = request.headers.get(config.timestampHeader);
      if (!timestamp) {
        return { valid: false, reason: 'missing_timestamp' };
      }

      const age = Date.now() - parseInt(timestamp) * 1000;
      if (age > config.maxAge * 1000) {
        return { valid: false, reason: 'timestamp_expired' };
      }
    }

    // 3. Verify signature
    const signature = request.headers.get(config.signatureHeader);
    if (!signature) {
      return { valid: false, reason: 'missing_signature' };
    }

    const expectedSignature = this.computeSignature(
      request.body,
      config.secret,
      config.signatureAlgorithm
    );

    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )) {
      return { valid: false, reason: 'invalid_signature' };
    }

    return { valid: true };
  }

  private computeSignature(
    body: string,
    secret: string,
    algorithm: string
  ): string {
    const hmac = crypto.createHmac(algorithm.replace('hmac-', ''), secret);
    hmac.update(body);
    return hmac.digest('hex');
  }
}
```

### External API Key Storage

```typescript
interface ExternalApiKeyConfig {
  // Encryption at rest
  encryptionKey: string;
  encryptionAlgorithm: 'aes-256-gcm';

  // Key metadata
  service: string;
  keyId: string;
  rotationDate?: Date;
  expirationDate?: Date;
}

class ExternalApiKeyStore {
  async store(service: string, apiKey: string): Promise<void> {
    // Encrypt the key
    const encrypted = await this.encrypt(apiKey);

    // Store with metadata
    await this.db.insert(externalApiKeys).values({
      service,
      encryptedKey: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      createdAt: new Date(),
    });

    // Also store in vault if available
    if (this.vault) {
      await this.vault.kv.put(`external/${service}/api_key`, apiKey, {
        metadata: { service, storedAt: new Date().toISOString() },
      });
    }
  }

  async retrieve(service: string): Promise<string> {
    // Try vault first
    if (this.vault) {
      const vaultKey = await this.vault.kv.get(`external/${service}/api_key`);
      if (vaultKey) return vaultKey;
    }

    // Fallback to database
    const record = await this.db
      .select()
      .from(externalApiKeys)
      .where(eq(externalApiKeys.service, service))
      .limit(1);

    if (!record.length) {
      throw new Error(`No API key found for service: ${service}`);
    }

    return this.decrypt({
      ciphertext: record[0].encryptedKey,
      iv: record[0].iv,
      authTag: record[0].authTag,
    });
  }
}
```

---

## Related Documents

- [SECURITY.md](./SECURITY.md) - Core security specification
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment security
- [MONITORING_OBSERVABILITY.md](./MONITORING_OBSERVABILITY.md) - Security monitoring
- [BACKUP_RECOVERY.md](./BACKUP_RECOVERY.md) - Disaster recovery
- [ERROR_HANDLING.md](./ERROR_HANDLING.md) - Secure error handling
