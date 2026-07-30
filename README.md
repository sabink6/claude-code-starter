# Claude Code Starter

![CI](https://github.com/sabink6/claude-code-starter/actions/workflows/ci.yml/badge.svg)
![CodeQL](https://github.com/sabink6/claude-code-starter/actions/workflows/codeql.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue)

> An AI-first software engineering project exploring agentic development workflows with Claude Code.

This repository demonstrates how AI can be integrated into a modern software engineering workflow while maintaining high standards for architecture, testing, security and code quality.

Rather than using AI solely for code generation, the project focuses on building repeatable engineering processes around AI-assisted development.

---

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

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

The AI agent accelerates implementation, while engineering decisions, validation and final approval remain human responsibilities.

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

---

### Specification-Driven Development

Features begin with written specifications stored in `_specs/`.

Instead of prompting AI to directly generate code, requirements are defined first, implementation plans are reviewed, and changes are delivered incrementally.

---

### AI-Assisted Engineering

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

## Engineering Practices

The repository incorporates modern engineering practices including:

- GitHub Actions
- Continuous Integration
- CodeQL
- Dependabot
- Secret Scanning
- TypeScript
- ESLint
- Vitest
- Pull Request reviews

These workflows help ensure that AI-assisted development remains reliable, secure and maintainable.

---

## Technology Stack

- Next.js
- TypeScript
- Firebase
- Tailwind CSS
- Claude Code
- GitHub Actions
- Vitest

---

## Repository Structure

```text
_specs/              Feature specifications
.github/workflows/   CI/CD and automation
CLAUDE.md            AI project context
src/                 Application source code
```

---

## Lessons Learned

The project demonstrates that effective AI-assisted development depends less on prompting and more on engineering discipline.

Key observations include:

- Well-defined specifications improve implementation quality.
- Persistent project context produces more consistent AI output.
- Small, incremental changes are easier to review and validate.
- Automated testing and CI remain essential.
- AI increases implementation speed but does not replace engineering judgement.

---

## Future Exploration

Areas for continued experimentation include:

- Multi-agent development workflows
- MCP integrations
- Automated evaluation pipelines
- AI-assisted architectural reviews
- Deployment automation
