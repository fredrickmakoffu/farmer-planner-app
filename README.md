# Tapp

Tapp is a local-first family budgeting app built around a single low-friction action: tap once at the moment of spend, then review and correct later. The product is designed for shared household visibility, intermittent connectivity, and fast daily use on mobile devices.

The current app is built on Ignite Red, Expo Router, and Expo SDK 55. The product direction, architecture, and decision records live in the repository and should drive implementation more than the upstream Ignite boilerplate defaults.

## What This Project Is

Tapp is being built as:

- a React Native app with Ignite Red as the UI and styling foundation
- a local-first mobile experience with durable on-device storage
- a modular, domain-oriented codebase with explicit boundaries
- a family budgeting product that prioritizes habit formation and fast logging over heavy financial workflows

Product direction is documented in [docs/prd-docs/# Tapp — Single-Button Family Budgeting PRD.md](docs/prd-docs/%23%20Tapp%20%E2%80%94%20Single-Button%20Family%20Budgeting%20PRD.md).

Architecture direction is documented in [docs/architecture.md](docs/architecture.md).

Architecture decisions are recorded in [docs/adr/README.md](docs/adr/README.md).

The implementation starting point and ordered task list are documented in [docs/start-here.md](docs/start-here.md).

## Core Product Idea

The primary interaction is a persistent single-button expense log. A tap creates a local expense event immediately, predicts category from routine and context, and defers correction to a lightweight review flow. The system is optimized for:

- quick logging with minimal friction
- family and multi-member visibility
- offline resilience
- eventual sync and projections
- simple budgeting and reporting workflows

## Current Technical Direction

The implementation direction for this repo is:

- Ignite Red components and styling conventions for presentation
- Expo Router for navigation
- TanStack Query for server state
- SQLite plus Drizzle for durable local data
- MMKV for lightweight preferences only
- constructor-injected application use cases behind a composition root
- Maestro for end-to-end coverage and Jest for unit and integration testing

The main ADRs currently in force are:

- [ADR-001: Adopt TanStack Query for Server State](docs/adr/001-adopt-tanstack-query.md)
- [ADR-002: Use SQLite and Drizzle for Durable Local Data](docs/adr/002-use-sqlite-and-drizzle.md)
- [ADR-003: Define a Local-First Sync Engine Contract](docs/adr/003-sync-engine-contract.md)
- [ADR-004: Use Composition-Root Dependency Injection and Thin App Bootstrap](docs/adr/004-dependency-injection-and-bootstrap.md)

## Getting Started

### Prerequisites

- Node.js 20 or newer
- pnpm
- Expo and EAS-compatible local mobile tooling
- Android Studio and/or Xcode if you need native device or simulator builds

### Install

```bash
pnpm install
```

### Start the App

```bash
pnpm run start
```

Useful platform commands:

```bash
pnpm run android
pnpm run ios
pnpm run web
```

If you are running on a simulator or physical device with the Expo dev client workflow, build the native shell first when needed:

```bash
pnpm run build:android:device
pnpm run build:ios:device
```

Other available local build shortcuts live in [package.json](package.json).

## How We Are Building It

### Architecture Rules

- code is moving toward `src/modules/<feature>` with `domain`, `application`, `infrastructure`, and `presentation` layers
- Expo Router files stay thin and should bind routes to feature presentation entry points only
- presentation code should not import concrete infrastructure implementations directly
- server state, durable local data, device preferences, and UI state are treated as separate concerns

### Styling and UI

- use Ignite Red built-in components first
- follow Ignite styling practices: colocated themed styles, `$`-prefixed style variables, and preset-based reuse
- add generic reusable UI through Ignite generators and project templates, not ad hoc file creation
- avoid introducing a second UI framework unless a specific gap forces it

### Data and Sync

- the app is local-first by design
- durable business data is intended to live in SQLite
- sync is modeled around an outbox, checkpoints, and explicit conflict policies
- background work is opportunistic and must respect mobile platform constraints

### Testing

- write tests as features are built, in the same pull request
- colocate feature tests with the code they verify when possible
- use Jest for unit and integration coverage
- use Maestro for critical end-to-end user journeys
- treat missing tests as missing deliverables, not deferred polish

Useful commands:

```bash
pnpm run compile
pnpm run lint:check
pnpm run test
pnpm run test:watch
pnpm run test:maestro
pnpm run depcruise
```

## Project Structure

Current repo structure still contains the standard Ignite baseline in places, but the target structure is documented in [docs/architecture.md](docs/architecture.md) and centers on:

- `src/app` for Expo Router route bindings
- `src/modules` for feature code
- `src/shared` for stable cross-feature abstractions and platform services
- `src/bootstrap` for dependency wiring and startup orchestration
- `docs` for product, architecture, and decision records

## Releases and Delivery

Releases are intended to be automated through CI/CD rather than manual operator workflows.

The expected delivery model is:

- pull requests run lint, typecheck, tests, and architecture boundary checks
- merges to `main` produce QA-ready preview artifacts
- signed builds are produced through EAS Build
- OTA updates are delivered through EAS Update only when native compatibility allows it
- conventional commits drive versioning and release notes

## Assets and Generators

- use Ignite's app-icon generator for launcher and app icon generation
- use Ignite's splash-screen generator for splash assets
- keep generator source assets in `ignite/templates`
- customize project generators so generated output matches the chosen module architecture and styling conventions

To inspect the generators available in this repo:

```bash
npx ignite-cli generate --list
```

## Documentation Map

- Product requirements: [docs/prd-docs/# Tapp — Single-Button Family Budgeting PRD.md](docs/prd-docs/%23%20Tapp%20%E2%80%94%20Single-Button%20Family%20Budgeting%20PRD.md)
- Architecture: [docs/architecture.md](docs/architecture.md)
- Start here: [docs/start-here.md](docs/start-here.md)
- ADR index: [docs/adr/README.md](docs/adr/README.md)

## Notes for Contributors

- prefer minimal, architecture-aligned changes over broad refactors
- keep feature code inside the intended module boundaries
- do not treat the current Ignite boilerplate layout as the long-term target architecture
- if a change affects architecture, sync behavior, storage boundaries, or startup wiring, update the relevant docs or ADRs in the same change
