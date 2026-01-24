# GitHub Branch Protection Configuration

This document outlines the recommended branch protection rules for the CipherVault repository.

## Main Branch Protection Rules

### Branch: `main`

#### Required Checks

- ✅ All CI/CD checks must pass (test, lint, build, security)
- ✅ Code review approval required (minimum 1)
- ✅ Status checks must pass before merging

#### Protection Settings

```
- Require a pull request before merging: YES
- Require approvals: 1
- Require status checks to pass before merging: YES
  - ci/test
  - ci/lint
  - ci/build
  - ci/security
- Require branches to be up to date before merging: YES
- Include administrators in restrictions: YES
- Allow force pushes: NO
- Allow deletions: NO
```

### Branch: `develop`

#### Required Checks

- ✅ CI/CD checks must pass (test, lint, build)
- ✅ Code review approval required (minimum 1)

#### Protection Settings

```
- Require a pull request before merging: YES
- Require approvals: 1
- Require status checks to pass before merging: YES
  - ci/test
  - ci/build
- Require branches to be up to date before merging: NO (for faster development)
- Include administrators in restrictions: NO
- Allow force pushes: NO (for develop)
- Allow deletions: NO
```

## Implementation Steps (Manual via GitHub UI)

1. Go to: Settings → Branches
2. Click "Add rule" under "Branch protection rules"
3. Fill in the following for each branch:

### For `main` branch:

- Branch name pattern: `main`
- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass before merging
  - Select all workflow checks
- ✅ Require branches to be up to date before merging
- ✅ Include administrators in restrictions
- ✅ Restrict who can push to matching branches (optional)

### For `develop` branch:

- Branch name pattern: `develop`
- ✅ Require a pull request before merging
- ✅ Require approvals: 1
- ✅ Require status checks to pass before merging
  - Select: ci/test, ci/build

## Code Owners (Optional Enhancement)

Create `.github/CODEOWNERS` file:

```
# Global code owners
* @prajjwal6122

# Backend code owners
/backend/ @prajjwal6122

# Frontend code owners
/frontend/ @prajjwal6122

# CLI code owners
/cli/ @prajjwal6122

# Configuration and workflow owners
/.github/ @prajjwal6122
/.*/ @prajjwal6122
```

## Pull Request Template

A pull request template (`.github/pull_request_template.md`) should be created to ensure consistent PR descriptions:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

Describe testing performed:

## Checklist

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No breaking changes
```

## CI/CD Status Requirements

All of the following must pass before merge:

1. **Tests**: Jest tests for backend, frontend, CLI
2. **Linting**: ESLint checks for frontend
3. **Build**: Successful builds for all projects
4. **Security**: npm audit checks

## Automated Workflows

The CI/CD pipeline runs automatically on:

- ✅ Push to main/develop/master
- ✅ Pull requests to main/develop/master
- ✅ Node versions: 18.x, 20.x (matrix strategy)

## Monitoring & Alerts

GitHub Actions provides automatic notifications:

- Failed workflow runs
- Status checks that fail
- Reviews required before merge

## See Also

- [GitHub Documentation: Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [CI/CD Workflow File](./workflows/ci.yml)
