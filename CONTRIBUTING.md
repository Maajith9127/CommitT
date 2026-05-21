# Contributing to CommitT

Thank you for your interest in contributing to CommitT! We welcome contributions from the community to help make CommitT an even better accountability enforcer.

## Setup Instructions

1. Ensure you have the required dependencies installed (Node.js, Bun, React Native CLI, Expo CLI).
2. Clone the repository: `git clone https://github.com/Maajith9127/CommitT.git`
3. Install dependencies: `bun install`
4. Setup environment variables by copying `.env.example` to `.env` (if applicable).
5. Run the mobile application: `bun run android` or `bun run ios` inside `apps/native`.

## Branch Naming

Please use clear and descriptive branch names. Here is the convention we follow:
- `feature/description` (e.g., `feature/strict-mode-improvements`)
- `fix/description` (e.g., `fix/alarm-manager-crash`)
- `docs/description` (e.g., `docs/update-architecture`)

## Commit Conventions

We follow conventional commits to keep the commit history clean and readable. Please format your commit messages as follows:
- `feat: [description]` for new features
- `fix: [description]` for bug fixes
- `docs: [description]` for documentation changes
- `refactor: [description]` for code refactoring without changing behavior

## Pull Request Expectations

- Ensure your PR has a clear title and description of the changes made.
- Link any relevant issues to the PR.
- Ensure your code follows the existing code style.
- Test your changes thoroughly before submitting a PR.

By contributing to CommitT, you agree that your contributions will be licensed under the project's AGPL-3.0 license.

## Architectural Guide

Before contributing, we highly recommend reviewing our architecture documentation. CommitT uses a complex **Triple-Write Protocol** and relies heavily on native Android services for enforcement.

Understanding how the **Convex Backend**, **Local SQLite DB**, and **Kotlin Native Modules** interact is critical for building features that do not break the enforcement guarantees.

Read the full architecture guide here:
[CommitT Architecture Documentation](https://committ.mintlify.app/architecture/overview)
