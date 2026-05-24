# Tapp Start Here

This document turns the product and architecture documents into an execution order. It answers two questions:

- where do we begin
- what should be built next

Use this as the working implementation checklist until a more detailed project board exists.

For code quality and implementation guardrails while executing this plan, see `AGENTS.md` and `docs/CODE_QUALITY.md`.

## Where To Begin

The foundations (Phases 0–4) are complete. The core product loop is built and working. Current focus is hardening the product: adding missing data fields, replacing placeholder screens with real data, and improving data layer reliability before sync work begins.

## Recent implementation summary

Changes are grouped by the branch/PR that shipped them.

### feat/review-edit-flow
- Added `EditExpenseSheet` — bottom sheet with amount editing (numeric input + validation), horizontal category pill picker, and delete action
- Added date navigation to `DailyReviewScreen` — prev/next chevrons, tap-to-open date picker (iOS modal spinner, Android native dialog)
- Time-slot grouping in review (Early morning → Night) matching the routines design

### feat/onboarding-routines
- Added onboarding screen at `/onboarding` — shown on first launch, guides user through routine setup
- Routine-driven prediction: first prediction pass uses user-configured routine windows before falling back to time-of-day buckets

### feat/tap-real-flow (PRs #11–16, multiple iterations)
- Wired routine prediction to tap; removed all hardcoded placeholder amounts
- Added `PickRoutineSheet` — shown when no routine matches the current time; lets user pick a routine on the fly
- Added `RoutinesScreen` (`/routines`) — full CRUD: create, edit, delete, reorder
- Added `SettingsScreen` (`/settings`) — hub linking to Routines, Categories, and future settings
- Added icon and `is_system` fields to `Category` entity and SQLite schema
- Seeded 8 default system categories in the DB migration (Food, Transport, Groceries, etc.)
- Migrated entire data layer from expo-sqlite async callback API to the v55 synchronous API
- Built Android home-screen widget (`modules/tapp-widget`) — 1×1 icon-only button with category color; reads the active routine from expo-sqlite directly, creates an expense on tap, and bridges back to the React Native app
- Built iOS widget (`modules/tapp-widget/ios/TappWidget/`) — Swift WidgetKit extension mirroring the Android widget

### feat/review (confirm day)
- Added `ConfirmDaySheet` — confirmation bottom sheet summarising the day total before confirming
- `confirmDay` use-case marks all events for the day as confirmed and enqueues outbox entries
- Scheduled 8 PM push notification via Expo Notifications prompting the user to review the day

### feat/routine-ordering
- Drag-to-reorder routines in `RoutinesScreen` using `react-native-draggable-flatlist`
- Round-robin prediction: when multiple routines are valid for the current time, cycles through them across taps
- Time-grouped review in `DailyReviewScreen` (slot headers with label, time range, and slot subtotal)

### fix/tap-screen-daily-total (current branch)
- Scoped daily total and last-event card on the tap screen to today only (was showing all-time)

---

## Task List

### Phase 0: Repo Foundation

- [x] create `src/bootstrap`
- [x] create `src/modules` (scaffolded `expenses` module)
- [x] create `src/shared`
- [x] define public entry-point conventions for modules
- [x] keep `src/app` limited to Expo Router bindings

### Phase 1: Application Bootstrap

- [x] `src/bootstrap/app-bootstrap.ts`
- [x] `src/bootstrap/container.ts` (singleton `container`)
- [x] `src/bootstrap/query-client.ts` wired to providers
- [x] startup orchestration in `AppProviders`, not `_layout.tsx`
- [x] `src/bootstrap/register-infrastructure.ts`
- [x] migration runner invoked during bootstrap in dev

### Phase 2: Local Data Foundation

- [x] `expo-sqlite` installed and configured
- [x] idempotent `initDatabase()` creating all tables (categories, routines, expense_events, outbox, sync_checkpoints)
- [x] migrated data layer to expo-sqlite v55 synchronous API
- [x] 8 default system categories seeded in DB migration
- [x] category `icon` and `is_system` fields added to schema and entity
- [x] on-device migration runner — sequential `_migrations`-table runner in `src/shared/infrastructure/database/migrator.ts`; replaces idempotent `initDatabase()`; legacy DB detection stamps all migrations on first run so existing dev data is preserved
- [x] remove dev-only in-memory DB fallback before release

### Phase 3: Server-State Foundation

- [x] `@tanstack/react-query` installed
- [x] shared query client wired via `AppProviders`
- [x] basic query key factories (`src/shared/query-keys.ts`)
- [x] adopt TanStack Query hooks in screens — all five screens migrated from manual `useState`/`loadData` to `useQuery`/`useMutation`; `expensesKeys.prediction()` added (PR #20)

### Phase 4: Module Scaffolding

- [x] `src/modules/expenses` with domain / application / infrastructure / presentation layers
- [x] route wrappers under `src/app/expenses`
- [x] presentation resolves repos from `container`, not constructing infra directly
- [ ] dependency-cruiser rules in CI to enforce module boundaries (pending)
- [ ] Ignite generator template for new modules (placeholder only)

### Phase 5: Core Product Loop

#### 5.1 Categories and routines

- [x] category CRUD — `CategoriesScreen` with color picker, icon selection, delete
- [x] system categories seeded on first install (8 defaults)
- [x] routine CRUD — `RoutinesScreen` with time window, category, amount
- [x] drag-to-reorder routines
- [x] `SettingsScreen` hub linking to routines and categories

#### 5.2 Onboarding

- [x] onboarding screen shown on first launch
- [x] guided routine setup during onboarding

#### 5.3 Single-tap expense logging

- [x] `TapToLogScreen` — coral 200×200 tap button, hero amount, predicted category pill, last-event card (scoped to today)
- [x] `createExpense` use-case; enqueues to outbox
- [x] routine-driven prediction wired to tap (round-robin across matching routines)
- [x] `PickRoutineSheet` — fallback when no routine matches current time

#### 5.4 Daily review

- [x] `DailyReviewScreen` — day-name header, time-grouped event cards, daily total, date navigation
- [x] `EditExpenseSheet` — amount edit, category reassignment, delete
- [x] `ConfirmDaySheet` — confirm-day flow; marks all events confirmed, enqueues outbox entries
- [x] 8 PM push notification prompting daily review
- [ ] notes/memo field — `ExpenseEvent` has no `notes` column; adding it requires a schema migration, entity update, repository update, and a notes input in `EditExpenseSheet`

#### 5.5 Family screen

- [x] `FamilyScreen` — member rows, per-category spend heat bars, live SQLite data for the current user
- [ ] "You" placeholder and invite CTA need real multi-device identity and sync (Phase 6 dependency)

### Phase 6: Home-Screen Widget

- [x] Android widget — 1×1 icon-only, category color, reads active routine from SQLite, creates expense on tap
- [x] iOS widget — WidgetKit Swift extension (TappWidget)
- [ ] iOS widget tap-through reliability — verify that tapping the widget correctly bridges back to the app and logs the expense end-to-end on device
- [ ] widget routine selection UI — currently uses the first matching routine; expose a way to switch the active routine from within the widget or the app's widget settings

### Phase 7: Sync and Multi-Device

- [x] `outbox` and `sync_checkpoints` tables in schema
- [x] `SyncEngine` contract
- [x] minimal `SqliteSyncEngine` — persists outbox rows, supports best-effort `flush()` (dev-only)
- [ ] production sync runner — retries, idempotence, HTTP sender, background flush; this is the prerequisite for family/multi-device features
- [ ] family identity — user ID, family ID, invite code flow
- [ ] multi-device conflict resolution strategy (ADR needed)

---

## Tests and how to run

```bash
# Unit tests (Node/Jest)
pnpm test

# Native integration tests (requires device or emulator)
RUN_NATIVE_INTEGRATION_TESTS=1 pnpm test
```

---

## What remains (prioritised)

### Must-do before any external users

~~1. **On-device migration runner**~~ ✅ Done — sequential `_migrations`-table runner; legacy DB detection preserves existing dev data.

### Core product completeness

2. **iOS widget end-to-end verification** — test tap-through on a real device; confirm the expense is written and the app reflects it.
3. **Widget active-routine switching** — let the user choose which routine the widget logs against, rather than always picking the first match.

### Data and quality

4. **Harden tests** — add use-case unit tests for `createExpense`, `updateExpense`, `confirmDay`, `predictCategory`; add a repository integration test for routines; determine CI strategy for running native tests on emulators.
5. **Dependency-cruiser CI rules** — enforce that presentation never imports infra directly and domain never imports React/Expo.

### Phase 2 (multi-device)

6. **Production sync runner** — retries, idempotence, HTTP sender, background flush. This unlocks the family screen and multi-device use.
7. **Family identity and invite flow** — user ID, family ID, invite code; replace the placeholder "You" row and invite CTA in `FamilyScreen`.

---

### Completed this session (2026-05-24)

- ✅ **Notes/memo on expenses** — `notes TEXT` column added via migration, `ExpenseEvent` entity updated, `updateExpense` use-case updated, notes input added to `EditExpenseSheet`, notes shown in `DailyReviewScreen` event row meta (PR #19)
- ✅ **Remove dev-only in-memory DB fallback** — removed entirely in commit `3ceeb50` when the data layer was migrated to expo-sqlite v55 synchronous API
- ✅ **TanStack Query adoption** — all five screens (`CategoriesScreen`, `DailyReviewScreen`, `RoutinesScreen`, `TapToLogScreen`, `FamilyScreen`) migrated from manual `useState`/`loadData` to `useQuery`/`useMutation`; `expensesKeys.prediction()` added (PR #20)
- ✅ **On-device migration runner** — sequential `_migrations`-table runner (`src/shared/infrastructure/database/migrator.ts`); replaces error-swallowing idempotent `initDatabase()`; legacy DB detection stamps existing installs so no data is lost on upgrade (feat/migration-runner)
