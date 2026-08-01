# Pocket Heist — Claude Code Starter

[![CI](https://github.com/sabink6/claude-code-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/sabink6/claude-code-starter/actions)
[![CodeQL](https://img.shields.io/badge/CodeQL-Enabled-brightgreen)](https://github.com/sabink6/claude-code-starter/security/code-scanning)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Claude Code](https://img.shields.io/badge/Claude-Code-blueviolet)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://claude-code-starter-rho.vercel.app/)

> Exploring AI-assisted software engineering through specification-driven development, context engineering and production-grade workflows.

🔗 **Live Demo:** [Pocket Heist](https://claude-code-starter-rho.vercel.app/)

The demo application — **Pocket Heist** (“Small heists. Big chaos.”) — is a working full-stack application built through this process. It provides a realistic environment for applying the workflow end to end, including authentication, Firestore data and security rules, automated testing, CI, security scanning and production deployment.

---

## Objectives

This project explores:

- AI-assisted software development with Claude Code
- Specification-driven development
- Context engineering with `CLAUDE.md`
- Planning before implementation
- AI-assisted testing and code review
- CI/CD and automated quality checks
- Secure development practices

---

## Engineering Capabilities

### AI Engineering

- Context engineering (`CLAUDE.md`)
- Specification-driven development
- Claude Code workflows
- AI-assisted implementation
- Automated AI code review
- Custom Claude Code commands & subagents

### Software Engineering

- Full-stack Next.js application
- Firebase Authentication & Firestore
- Automated testing (Vitest)
- GitHub Actions CI
- CodeQL
- Dependabot
- Secret scanning
- Production deployment (Vercel)

## Development Workflow

Each feature follows a structured workflow:

```text
Feature Request
      │
      ▼
Specification (_specs/)
      │
      ▼
Claude Plan Mode
      │
      ▼
Saved Plan (_plans/)
      │
      ▼
Architecture Review
      │
      ▼
Implementation
      │
      ▼
Human Review
      │
      ▼
Automated Tests
      │
      ▼
CI / CodeQL / Security Checks
      │
      ▼
Merge
```

> **Engineering principle:** AI accelerates implementation, while architecture, security, validation, code review and final approval remain human responsibilities.

---

## Key Concepts

### Context Engineering

Project-specific knowledge is stored in `CLAUDE.md`, providing the AI with consistent context including:

- project architecture
- coding conventions
- workflows
- testing requirements
- project constraints

Providing structured context results in more accurate and consistent AI-generated solutions.

`CLAUDE.md` at the repo root is the current, refined version. 

Custom Claude Code tooling lives in `.claude/`:

- `commands/` — repo-specific slash commands (`/spec`, `/component`, `/code-review`, `/commit-message`)
- `agents/` — subagents used by those commands (`a11y-reviewer`, `code-quality-reviewer`, `figma-design-extractor`)

---

### Specification-Driven Development

Features begin with written specifications stored in `_specs/`.

Instead of prompting AI to directly generate code, requirements are defined first, implementation plans are reviewed, and changes are delivered incrementally.

---

### AI-Assisted Development Lifecycle

Claude Code is used to assist with:

- implementation
- refactoring
- code explanation
- documentation
- test generation
- planning
- code review

All generated code is reviewed and validated before acceptance.

---

## Quality & Delivery Pipeline

The repository incorporates modern engineering practices including:

- GitHub Actions
- Continuous Integration
- CodeQL
- Dependabot
- Secret Scanning
- TypeScript
- ESLint
- Vitest
- Pull request-based delivery

These workflows help ensure that AI-assisted development remains reliable, secure and maintainable.

See [`SECURITY.md`](SECURITY.md) for the vulnerability disclosure policy, [`_docs/github-setup.md`](_docs/github-setup.md) for the full GitHub configuration (branch ruleset, Dependabot, CodeQL, secret scanning), and [`_docs/responsive-design.md`](_docs/responsive-design.md) for the breakpoint and layout conventions the app follows.

---

## Technology Stack

Framework      Next.js 16
Language       TypeScript
Database       Firestore
Authentication Firebase Auth
Styling        Tailwind CSS
Testing        Vitest
CI/CD          GitHub Actions
Deployment     Vercel
AI             Claude Code

---

## Repository Structure

```text
.claude/
├── commands/          Slash commands (/spec, /component, /code-review, /commit-message)
├── agents/            Subagents (a11y-reviewer, code-quality-reviewer, figma-design-extractor)
└── skills/            Repo-specific skills (e.g. firestore-schemas)

.github/workflows/     CI/CD and automation

_docs/                 Project/setup documentation (GitHub config, responsive design)
_plans/                Saved implementation plans for specs not yet built
_specs/                Feature specifications

app/
├── (public)/          Splash, login, signup, preview — no nav
└── (dashboard)/       Heists list, create, detail — wrapped in shared Navbar

components/            UI components, one folder per component
lib/
├── firebase/          Firebase config, auth context, auth/data actions
└── ...                Other app logic (codenames, date formatting)

tests/                 Test suite, mirrors the source path

CLAUDE.md              AI project context
```

---

## Lessons Learned

The project demonstrates that effective AI-assisted development depends less on prompting and more on engineering discipline.

Key observations include:

- Well-defined specifications improve implementation quality.
- Persistent project context produces more consistent AI output.
- Small, incremental changes are easier to review and validate.
- Automated testing and CI remain essential.
- AI shifts engineering effort from routine implementation toward problem definition, architecture, context design, validation and review.

---

## Future Exploration

Areas for continued experimentation include:

- Multi-agent development workflows
- Richer MCP integrations
- Automated specification validation
- AI-generated architecture proposals
- Evaluation of AI coding performance
- AI-assisted pull request generation
