# GitHub Actions CI/CD Pipeline

## Overview

This GitHub Actions workflow automates the testing, building, linting, and security checks for the CipherVault project. The pipeline runs on every push to main/develop/master branches and on all pull requests.

**Repository**: `prajjwal6122/CipherVault`  
**Workflow File**: `.github/workflows/ci.yml`

---

## Pipeline Structure

### 1. **Test Job** (Parallel Node Versions)

Tests the codebase using Node 18.x and 20.x in a matrix strategy.

**Steps**:

- Checkout code
- Setup Node.js cache
- Install dependencies for backend, frontend, CLI
- Run Jest tests for all projects
- Generate test coverage reports

**Duration**: ~5-7 minutes per Node version
**Success Criteria**: All tests pass with zero failures

---

### 2. **Lint Job**

Validates code quality and style consistency.

**Steps**:

- Checkout code
- Setup Node.js
- Install frontend dependencies
- Run ESLint checks

**Duration**: ~2 minutes
**Notes**: ESLint errors in frontend will fail the job (can be made non-blocking)

---

### 3. **Build Job** (Depends on: test, lint)

Verifies that all projects build successfully.

**Steps**:

- Checkout code
- Setup Node.js
- Build backend (npm run build)
- Build frontend (npm run build with Vite)
- Build CLI (npm run build)

**Duration**: ~3-5 minutes
**Success Criteria**: All builds complete without errors

---

### 4. **Security Job**

Scans dependencies for known vulnerabilities using npm audit.

**Steps**:

- Checkout code
- Run npm audit on backend
- Run npm audit on frontend
- Run npm audit on CLI
- Report any vulnerabilities

**Duration**: ~2-3 minutes
**Notes**: Continues on error (non-blocking) to allow preview of issues

---

### 5. **Notify Job** (Depends on all)

Provides summary of all checks and notifications.

**Outputs**:

- ✅ Success message if all checks pass
- ❌ Error messages if any job fails
- Test and build status summary

---

## Workflow Triggers

The CI/CD pipeline runs automatically on:

```yaml
on:
  push:
    branches:
      - main
      - develop
      - master

  pull_request:
    branches:
      - main
      - develop
      - master
```

### Manual Trigger (Optional)

You can enable manual workflow dispatch by adding:

```yaml
workflow_dispatch:
```

Then run from: Actions → CI/CD Pipeline → Run workflow

---

## Environment

- **Runner OS**: Ubuntu Latest (`ubuntu-latest`)
- **Node Versions**: 18.x, 20.x (matrix strategy)
- **npm**: Latest stable (auto-installed)

---

## Test Matrix

Tests run on multiple Node versions to ensure compatibility:

| Node Version | Backend | Frontend | CLI |
| ------------ | ------- | -------- | --- |
| 18.x         | ✅      | ✅       | ✅  |
| 20.x         | ✅      | ✅       | ✅  |

---

## Required Status Checks

The following checks must pass before merging to `main`:

- ✅ `test` (all matrix combinations)
- ✅ `lint` (ESLint)
- ✅ `build` (all projects)
- ✅ `security` (npm audit)

---

## Viewing Results

### In GitHub

1. Go to **Actions** tab in repository
2. Select **CI/CD Pipeline** workflow
3. Click on the run to see detailed logs
4. Each job can be expanded to view step details

### Checking Status on PR

- Branch protection rules require these checks to pass
- Red ❌ = Failed, must fix before merge
- Green ✅ = Passed, ready to merge (if approved)

---

## Troubleshooting

### Tests Failing

1. Check detailed logs in Actions → failed run
2. Run `npm test` locally in the project directory
3. Fix issues and push again

### Build Failing

1. Check build logs for specific project
2. Run `npm run build` locally
3. Verify all dependencies are installed
4. Check for TypeScript/syntax errors (if applicable)

### Lint Errors

1. Review ESLint output in workflow logs
2. Run `npm run lint` locally in frontend/
3. Fix linting issues or update ESLint config
4. Some errors can be auto-fixed: `npm run lint -- --fix`

### Security Vulnerabilities

1. Check npm audit output in Security job
2. Run `npm audit` locally
3. Update vulnerable packages: `npm audit fix`
4. Document exceptions if update not possible

### Matrix Tests Timing Out

1. Increase timeout values in workflow
2. Check for infinite loops or blocking operations
3. Optimize test performance

---

## Best Practices

### ✅ DO

- Write tests for new features
- Keep tests focused and isolated
- Run tests locally before pushing
- Update tests when changing code
- Document dependencies clearly
- Keep dependencies up to date
- Use consistent code style

### ❌ DON'T

- Push code without running tests locally
- Disable required checks
- Commit code that breaks builds
- Ignore linting warnings
- Skip security audits
- Force push to protected branches

---

## Adding New Projects

To add a new project to the CI/CD pipeline:

1. Create project directory (e.g., `/myapp`)
2. Add `package.json` with test script
3. Update `.github/workflows/ci.yml`:

   ```yaml
   - name: Install myapp dependencies
     run: npm install
     working-directory: ./myapp

   - name: Run myapp tests
     run: npm test
     working-directory: ./myapp
   ```

4. Commit and push to trigger workflow

---

## Performance Optimization

### Current Strategy

- **Matrix testing**: Run tests on multiple Node versions in parallel
- **Dependency caching**: npm cache speeds up installations
- **Conditional steps**: Some steps skip if not needed

### Recommendations

- Split long-running tests into parallel jobs
- Use `continue-on-error` for non-critical checks
- Cache build artifacts between jobs
- Consider limiting matrix testing to essential versions

---

## Security Considerations

### npm audit

- Runs on production dependencies only
- Vulnerabilities are reported but don't block merge
- Review and address critical vulnerabilities

### Code Coverage

- Consider adding coverage thresholds
- Fail build if coverage drops below threshold
- Track coverage trends over time

### Secrets Management

- Never commit API keys or secrets
- Use GitHub Secrets for sensitive data
- Reference secrets in workflow: `${{ secrets.SECRET_NAME }}`

---

## Cost Considerations

GitHub Actions free tier includes:

- ✅ 2,000 minutes/month for private repos
- ✅ Unlimited runs for public repos
- ✅ 500 MB storage for artifacts

### Current Usage

- Estimated ~10-15 minutes per workflow run
- With 10 PRs/day: ~150 minutes/month
- Well within free tier

---

## Integration with Branch Protection

This workflow integrates with GitHub's branch protection rules:

1. **Main Branch**: All checks must pass
2. **Develop Branch**: Tests and build must pass
3. **PR Reviews**: Minimum 1 approval required

See [BRANCH_PROTECTION.md](./BRANCH_PROTECTION.md) for detailed configuration.

---

## Monitoring & Alerts

GitHub automatically notifies:

- ❌ Failed workflow runs (email)
- 📧 Status check failures on PRs
- 🔔 Required review requests

---

## Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Branch Protection Rules](./BRANCH_PROTECTION.md)
- [PR Template](./ pull_request_template.md)

---

## Version History

| Version | Date         | Changes                      |
| ------- | ------------ | ---------------------------- |
| 1.0     | Jan 24, 2026 | Initial CI/CD pipeline setup |
