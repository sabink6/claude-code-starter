# GitHub Repository Setup

This document summarizes the GitHub configuration used for this repository.

## Repository Visibility

The repository is **public**.

Other users can:

- View the source code
- Clone the repository
- Fork the repository

Other users cannot push changes directly to the repository unless they are explicitly granted write access.

---

## Main Branch Protection

The `main` branch is protected using a GitHub branch ruleset.

The ruleset includes:

- Require a pull request before merging into `main`
- Require status checks to pass before merging
- Block force pushes to `main`
- Restrict deletion of the `main` branch
- No approving reviewer is required because this is currently a solo project

The goal is to prevent direct or accidental changes to `main` and ensure changes go through the pull request workflow.

---

## GitHub Actions CI

A GitHub Actions CI workflow is configured in:

`.github/workflows/ci.yml`

The CI workflow runs when:

- A pull request targets `main`
- Changes are pushed or merged into `main`

The CI pipeline performs the following checks:

1. Install dependencies

   `npm ci`

2. Run ESLint

   `npm run lint`

3. Run Vitest tests in non-watch mode

   `npm test -- --run`

4. Create a production Next.js build

   `npm run build`

If any command fails, the CI job fails.

Once the CI status check is configured as required in the `main` branch ruleset, pull requests cannot be merged until CI passes.

---

## Dependabot

Dependabot alerts are enabled to detect known vulnerabilities in project dependencies.

Dependabot security updates can automatically create pull requests when GitHub can determine a safe dependency upgrade.

Some vulnerabilities may require manual intervention when Dependabot cannot find a compatible upgrade path.

A moderate PostCSS vulnerability was detected through a transitive Next.js dependency. Dependabot currently cannot automatically resolve the dependency conflict, so the alert should be monitored and resolved through an appropriate dependency upgrade when available.

---

## CodeQL

CodeQL Default Setup is enabled for automated source-code security scanning.

Configuration:

- CodeQL Default Setup: Enabled
- Copilot Autofix: Enabled
- AI Findings (Preview): Disabled
- Security alert failure threshold: High or higher
- Standard alert failure threshold: Errors only

CodeQL scans the codebase for supported security vulnerabilities and coding errors.

---

## Secret Protection

GitHub secret protection features are enabled.

Configuration:

- Secret scanning: Enabled
- Push protection: Enabled

These features help detect supported API keys, access tokens, credentials, and other secrets that may accidentally be committed to the repository.

Sensitive information such as `.env` files, API keys, passwords, and tokens must never be intentionally committed.

---

## Development Workflow

The intended development workflow is:

1. Create a feature branch from `main`.
2. Make and test changes locally.
3. Commit the changes.
4. Push the feature branch to GitHub.
5. Open a pull request targeting `main`.
6. GitHub Actions runs:
   - Dependency installation
   - ESLint
   - Vitest tests
   - Next.js production build
7. Security checks run where applicable.
8. All required status checks must pass.
9. Merge the pull request into `main`.

Example:

    Feature Branch
          |
          v
    Make Changes
          |
          v
    Commit & Push
          |
          v
    Pull Request -> main
          |
          v
    GitHub Actions CI
      - npm ci
      - ESLint
      - Vitest
      - Next.js Build
          |
          v
    Security Checks
          |
          v
    Required Checks Pass
          |
          v
    Merge into main

---

## Summary

The repository uses a lightweight professional development workflow consisting of:

- Public repository with controlled write access
- Protected `main` branch
- Feature branch development
- Pull requests before merging
- Required CI checks
- Automated linting
- Automated testing
- Production build validation
- Dependabot dependency vulnerability monitoring
- CodeQL security scanning
- Secret scanning and push protection

This setup keeps the repository suitable for experimentation and learning while applying common GitHub CI and security practices.

---
GitHub repository
│
├── GitHub Actions CI
│   ├── npm ci
│   ├── ESLint
│   ├── Vitest
│   └── Next.js build
│
├── Dependabot
│   └── Dependency vulnerabilities
│
├── CodeQL
│   └── Source-code vulnerabilities
│
└── Secret Protection
    └── Accidentally committed credentials
---