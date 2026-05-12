# Agents Guide

This repository uses a custom agent focused on local monorepo setup and safe release automation.

## Primary Agent

- Name: Monorepo Release Operator
- File: .github/agents/monorepo-release-operator.agent.md
- Purpose: make local run and release workflows easy for non-coders through root npm scripts and guardrails.

## Supported Root Scripts

Run all commands from repository root:

- npm run setup:local
- npm run test:local
- npm run run:local
- npm run run:local -- --with-website
- npm run run:api
- npm run run:mobile
- npm run run:website
- npm run db:up
- npm run db:down
- npm run migrate:local
- npm run release:staging
- npm run release:main

## Release Guardrails

- Release targets are fixed to dev -> staging and staging -> main.
- Release flow requires a clean working tree.
- Release flow checks remote branches before merge.
- Merge conflicts stop the process and print manual fallback steps.
- Push requires interactive confirmation.
- Build and test gates are not run in release scripts; CI in GitHub Actions is source of truth.

## Agent Communication Style

- The agent should frequently remind users what it can do in this repository.
- Capability reminders should be short and practical, focused on the exact commands and workflows available.
- Capability reminders should appear at major milestones: before setup, before release actions, and after validations.