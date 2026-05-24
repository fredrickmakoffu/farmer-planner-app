# Tapp Code Quality Guide

This document defines code quality expectations for Tapp as a React Native, Expo, Ignite Red, and local-first mobile application.

It is intentionally not a copy of a web React guide. Mobile constraints, offline data, native platform boundaries, and Ignite conventions change what good code looks like here.

Related references:

- [README](../README.md)
- [Architecture](./architecture.md)
- [Start Here](./start-here.md)
- [ADR Index](./adr/README.md)
- [AGENTS.md](../AGENTS.md)

## Core Principles

### 1. Keep Product-Critical Paths Simple

The tap-to-log flow is the heart of the product. Code on this path should be direct, fast, and easy to reason about.

Implications:

- avoid unnecessary abstractions in the tap loop
- avoid heavy rendering work on the home and review flows
- keep business rules explicit and testable

### 2. Separate Concerns Relentlessly

This project is intentionally moving away from generic folders like `screens`, `services`, and `utils` as the long-term home for everything.

Good code in this repo:

- keeps business rules in domain or application code
- keeps UI rendering in presentation code
- keeps storage, API, notifications, and background work in infrastructure

### 3. Optimize for Local-First Correctness

Correctness is more important than cleverness. Expense records, budgets, sync metadata, and conflict behavior must be explicit.

Good code in this repo:

- treats local persistence as a first-class concern
- keeps sync behavior deterministic
- uses migrations for durable schema evolution

### 4. Respect Mobile Constraints

React Native is not the web. We do not have unlimited render budget, exact background scheduling, or browser-oriented assumptions.

Good code in this repo:

- uses virtualized lists for larger collections
- avoids unnecessary bridge churn and rerenders
- does not rely on guaranteed background execution
- handles poor connectivity gracefully

### 5. Keep the Future Architecture Cheap to Reach

Some approved tools are not fully wired yet. New code should still be written so the migration path remains short.

Examples:

- do not invent a new server-state solution while TanStack Query is the approved direction
- do not build a second design system while Ignite Red is the chosen presentation foundation
- do not put durable business data into MMKV when SQLite plus Drizzle is the planned foundation

## What Good Code Looks Like Here

### Presentation

- uses Ignite Red components first
- keeps screens focused on layout, composition, and user interaction
- does not fetch data directly from raw API clients
- does not contain embedded domain policy logic that belongs in a use case or value object

### Application

- exposes user-facing actions as use cases or orchestration functions
- coordinates local writes, validation, query invalidation, and sync preparation
- remains easy to test with fakes

### Domain

- models real business concepts such as money, budgets, routines, and transactions
- uses explicit types and invariants
- avoids framework imports entirely

### Infrastructure

- owns SDK, transport, database, storage, notification, and background task code
- maps raw external data into internal shapes
- hides platform details from the rest of the app

## React Native-Specific Delivery Rules

1. Mobile-first by default. Design and implementation should work well on phones before considering larger layouts.
2. Use existing Ignite wrappers and theme utilities before creating new component primitives.
3. Prefer `FlatList` and `SectionList` over `ScrollView` for dynamic datasets.
4. Keep screen startup light; do not pile initialization logic into route files.
5. Use safe area handling intentionally.
6. Treat animation as optional and meaningful, not decorative by default.
7. Optimize for mid-range hardware and unstable connectivity, not just ideal development conditions.

## Anti-Pattern Catalogue

### AP-01: Route Files Doing Real Work

Problem:

- Expo Router files start containing data fetching, startup logic, and business rules

Fix:

- route files should mainly bind to feature presentation entry points

### AP-02: Screens Importing Infrastructure Directly

Problem:

- screens import API clients, MMKV, SQLite adapters, notification SDKs, or sync runners directly

Fix:

- move that code behind application and infrastructure boundaries

### AP-03: MMKV Used as a Database

Problem:

- complex, durable, queryable business data stored as unversioned JSON blobs in key-value storage

Fix:

- keep MMKV for preferences and lightweight device state only
- use SQLite plus migrations for durable relational data

### AP-03b: Schema Changes Without a Migration

Problem:

- a table column is added, renamed, or removed by editing `initDatabase()` or similar bootstrap code instead of writing a migration

Fix:

- every schema change gets a new migration file via `pnpm migrate:make <name>`
- never edit an existing migration file — add a new one
- see [docs/migrations.md](./migrations.md) for the full workflow

### AP-04: Business Logic in JSX

Problem:

- category prediction, conflict rules, budget rules, or validation logic embedded directly in screens and components

Fix:

- extract into domain objects, policies, validators, or use cases

### AP-05: Startup Logic Spread Across the App

Problem:

- initialization happens partially in `_layout.tsx`, partially in utilities, and partially in random hooks

Fix:

- centralize startup sequencing in bootstrap modules per ADR-004

### AP-06: Background Tasks Used as Guaranteed Infrastructure

Problem:

- product correctness depends on iOS or Android definitely running a task on a schedule

Fix:

- design for foreground, reconnect, and explicit user-triggered recovery paths

### AP-07: Cross-Feature Deep Imports

Problem:

- one module reaches into another module's private files

Fix:

- import through the feature entry point only

### AP-08: Tests Missing for New Feature Work

Problem:

- code ships without layer-appropriate tests, with coverage deferred to later

Fix:

- add tests in the same pull request as the feature

### AP-09: Unsafe Data at Boundaries

Problem:

- raw API or persisted payloads flow into application and presentation code without validation

Fix:

- validate and map at the boundary, then pass typed internal shapes onward

### AP-10: Performance-Insensitive Lists

Problem:

- large collections rendered eagerly with unstable item renderers and inline objects everywhere

Fix:

- virtualize, memoize where justified, and keep row props stable

## Review Checklist

Before merging, review against this list:

### Architecture

- does the code live in the correct layer and module
- are boundaries respected
- are cross-feature imports going through public entry points

### Mobile Behavior

- is the UI responsive on smaller devices
- does the code avoid unnecessary rerenders and large eager renders
- does it behave safely under poor or no connectivity

### Data and Sync

- are durable data changes versioned or migration-ready
- is sync behavior explicit, deterministic, and outside the UI layer
- are secrets and sensitive values kept out of MMKV and logs

### Testing

- are tests included in the same pull request
- are the right layers covered
- does the feature need a Maestro flow update

### Documentation

- if architecture, startup, sync, storage, or feature boundaries changed, were docs updated

## Definition of Done for New Feature Work

The feature is not done until:

1. the code lives in the right architectural layer
2. the feature respects Ignite Red presentation conventions
3. tests ship with the code
4. persistence and sync implications are handled explicitly
5. docs are updated when the change affects shared engineering rules

## Current Quality Priorities

Right now, the highest-value quality work in this repo is:

1. enforce boundaries with dependency-cruiser
2. keep startup logic moving into bootstrap
3. establish the database and server-state foundations cleanly
4. build the first product slice without architectural shortcuts that will have to be undone later

This means quality work is not mainly about polish yet. It is mainly about keeping the repo from drifting away from the chosen architecture while the foundation is still being built.
