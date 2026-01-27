# Deployment Prep Checklist

Use this checklist before promoting to production.

## Access & Secrets
- Production account access confirmed (cloud provider, container registry, DB console).
- Secrets stored in a secure manager (no .env files in repo); values validated and rotated if stale.
- KMS keys ready and permissions granted to runtime identities.
- TLS certificates/ACME ready for all domains (including wildcard or SANs).

## Configuration
- Environment variables reviewed for prod values (API URLs, DB URIs, KMS key IDs, logging level, allowed origins).
- Feature flags set for launch (enable only the ones intended for production).
- Email/SMS/provider configs pointed to production accounts (no sandbox/test keys).
- Monitoring/alerting destinations configured (PagerDuty/Slack/email).

## Data & Storage
- Production database provisioned; connectivity tested from staging runner.
- Backup/restore plan validated (recent backup + restore rehearsal or PITR verified).
- Storage buckets/containers created with correct IAM and encryption policies.
- Migration scripts reviewed and ready to run; rollback plan documented.

## Security
- AuthN/Z rules verified for prod (admin routes protected, CORS limited to prod origins).
- Security headers enabled (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
- Dependency scan and vulnerability check passed; critical/high issues triaged.
- Audit logging enabled for sensitive operations.

## Build & Tests
- Backend tests: unit/integration/e2e green in CI.
- Frontend build passes locally and in CI (production build artifact verified).
- Lint/type checks clean.
- Container images build successfully for the target architecture; SBOM stored if required.

## Observability
- Metrics/logs/traces destinations configured (e.g., CloudWatch/Datadog/ELK/OpenTelemetry collector).
- Dashboards and alerts created for key SLOs (latency, error rate, saturation, decrypt failures).

## Networking & Infra
- DNS records prepared/updated for production domains.
- Load balancer/ingress rules defined; health checks confirmed.
- WAF/rate limiting rules configured for auth and reveal/decrypt endpoints.
- Time sync, NTP, and timezone settings validated on hosts/containers.

## Operational Readiness
- Runbook updated with deploy/rollback steps and common failure modes.
- On-call schedule active for launch window; comms channel set (e.g., Slack/Teams/Bridge).
- Maintenance page/feature toggle ready if needed.
- Uptime checks/synthetic probes configured for key user flows.

## Final Go/No-Go
- Stakeholders sign-off recorded (product, security, data, ops).
- Change ticket created/approved per process.
- Deployment window agreed; freeze exceptions documented.
