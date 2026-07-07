# Deterministic algorithms in the React Native app

This document describes **deterministic logic** implemented in `apps/mobile` — rules where the same inputs always produce the same outputs on the client. It covers sorting, filtering, gating, state machines, formatting, and presentation math.

**Scope:** `apps/mobile/src` only.

**Important distinction:** Many product numbers (streak counts, feed ordering, insight percentages, explore-chat rankings, home metrics) come from the **API**. The app merges, filters, gates, and renders them. Those server-owned values are listed in [What the API owns](#what-the-api-owns) at the end.

---

## 1. Exploration progress percentage

**Location:** `apps/mobile/src/hooks/useUserExplorations.js` — `computeProgress`

**Logic:**
1. If `weeksTotal` is falsy → return `0`.
2. Otherwise → `Math.round((weekCurrent / weeksTotal) * 100)`.

**Inputs:** `weekCurrent`, `weeksTotal`  
**Outputs:** Integer 0–100

---

## 2. User exploration merge

**Location:** `apps/mobile/src/hooks/useUserExplorations.js`, `apps/mobile/src/context/ConsentContext.js`

For each exploration in the API catalog, the app builds a merged object:

1. `userConsented` = `explorationConsents[id].granted`
2. `weekCurrent` = run’s `weekCurrent`, or `1` if consented with no run, else `null`
3. `weeksTotal` = run’s `weeksTotal`, or first number in `duration` (regex `/\d+/`), else `null`
4. `streakDays` = run’s `streakDays`, or `0` if consented, else catalog `ex.streak` (display only — not incremented on device)
5. `progress` = computed percentage (#1) if consented, else static catalog `ex.progress`
6. `active` = `activeExplorationId === id`
7. `statusBadge` = `"Week X of Y"` when consented with both week values, else catalog `statusBadge`

Server sync (`applyServerExplorations` in ConsentContext) maps `/me/explorations` into consents, runs, and the active exploration ID.

**Inputs:** Exploration catalog, consent map, run map, active ID  
**Outputs:** Merged exploration objects keyed by ID

---

## 3. Consented exploration lists

**Locations:**
- `listConsentedExplorations` — `useUserExplorations.js`
- `listConsentedExplorationForms` — `utils/explorationLogState.js`
- Profile / consent summary screens

**Logic:**
1. Filter `explorationConsents` where `granted === true`.
2. Map to display objects; title = `feedLabel || title || id`.
3. Log-form variant additionally requires `fields.length > 0`.
4. Profile variants add `consentedAt`, `active`, week/streak/progress fields.

**Inputs:** Consent map, exploration catalog  
**Outputs:** Arrays of consented exploration summaries or log forms

---

## 4. Exploration start gate

**Location:** `useExplorationStart` in `useUserExplorations.js`, `ExplorationConsentScreen.js`

**Logic:**
1. If `privacyPrefs.globalConsent` is false → show toast, abort.
2. If user has not granted per-exploration consent → navigate to `ExplorationConsent`, abort.
3. Else → `activateExploration(id)`, show success toast.

On the consent screen: `canContinue = globalConsent && optIn toggle`. Blocker UI shown when master consent is off.

**Inputs:** Privacy prefs, per-exploration consent, navigation  
**Outputs:** Boolean started / navigation side effects

---

## 5. Privacy and consent preference mapping

**Location:** `ConsentContext.js`, `ExplorerOnboardingScreen.js`

Onboarding answers map to stored privacy prefs:

| Onboarding answer key | Privacy pref key |
|----------------------|------------------|
| `consentPrivacy` | `globalConsent` |
| `consentCitizenScience` | `science` |
| `consentDiscoverable` | `visible` |

Daily reminders (`privacyPrefs.reminders`) are set via the Profile screen, not during onboarding.

**`normalizePrefs`:** Merges with defaults; migrates legacy `consent` → `globalConsent`.

**Demo seed (unauthenticated, pre-onboarding):** If API provides `annaDefaults.exploration_participation`, auto-grant `"morning-rules"` and set it active.

**Revoke exploration:** Removes consent entry; clears active ID if it matched the revoked exploration.

**Inputs:** Onboarding answers, AsyncStorage, API payloads  
**Outputs:** `privacyPrefs`, consent choices, `explorationConsents`, `activeExplorationId`

---

## 6. Daily check-in state machine

**Locations:** `HomeScreen.js`, `utils/explorationLogState.js`

### Today’s date key
`new Date().toISOString().slice(0, 10)` — UTC date string (`YYYY-MM-DD`).

### Pending vs complete
1. Build logged set from API `home.loggedExplorationIds` (+ optional local saved IDs).
2. **Pending** = consented log forms not in logged set (`getPendingLogExplorations`).
3. **Complete** = all consented forms logged (`allExplorationsLogged`).

### UI state selection

| Condition | UI shown |
|-----------|----------|
| `starterMode` && no consented forms && not saved && check-in not open | “Log today's data” button |
| Has forms && pending > 0 && not saved && check-in not open | Log button (shows “N remaining” if partially logged) |
| All logged today && not saved && check-in not open | “Already logged today” card |
| Check-in open && `starterMode` && no forms | `StarterCheckinCard` (browse explorations) |
| Check-in open && has forms && not prefilling | `DailyCheckinCard` |
| Saved | Confirmation card |

### Reminder banner
Shown when **all** of:
- `privacyPrefs.reminders`
- User has ≥1 consented exploration
- Banner not dismissed for today
- Pending logs exist
- Not in saved or open-check-in state

Dismissal persisted in AsyncStorage `@kind/reminder_banner_dismissed` — must equal today’s date string.

### Prefill and save
- **Prefill:** GET `/me/logs?explorationId=&date=today` per form; parse into field values.
- **Save:** POST `/me/logs` for all consented forms; refresh runs, home, insight.

**Inputs:** Home payload, consents, log form list, UI flags  
**Outputs:** Check-in UI mode, pending count, confirmation copy

---

## 7. Log field value build, format, and parse

**Locations:** `utils/explorationLogState.js`, `components/logging/ExplorationLogFields.js`

### Initial values (`buildInitialFieldValues`)
- `checks` → array of `false`, one per option
- `range` → `Number(field.val ?? field.min ?? 0)`
- `select` → `Number(field.sel ?? 0)` (option index)

### Format for API (`formatLogFieldValues`)
- `checks` → array of selected option **strings** where index is checked
- `range` → number
- `select` → option string at selected index

### Parse from API (`parseLogFieldValues`)
- `checks` → boolean array via `selected.includes(opt)`
- `range` → number
- `select` → index of string in `opts`, fallback `field.sel ?? 0`

### Range slider snap
`Math.round(v / step) * step` (default step = 1).

### Checkbox interaction
- `multi: true` → toggle individual index
- `multi: false` → clear all, set one

**Inputs:** Field schema, form/API values  
**Outputs:** Form state objects, API `fieldValues` payloads

---

## 8. Exploration start content builder

**Locations:** `utils/explorationStartContent.js`, `data/explorationStartInstructions.js`, `ExplorationStartedScreen.js`

**Logic:**
1. Curated instructions = `exploration.startInstructions` OR static map by ID OR null.
2. `phaseName` = first phase’s name.
3. If curated instructions exist → use them.
4. Else → push `phase.desc`, then for each field: `"Each day, log: {label}."`
5. `buildLogFieldSummary` → array of field labels.

**Week display fallback:** `weeksTotal ?? duration.match(/\d+/)?.[0] ?? "?"`

**Inputs:** Exploration object  
**Outputs:** `{ phaseName, instructions }`, log field labels

---

## 9. Home feed filtering and pagination

**Locations:** `HomeScreen.js`, `components/home/FeedFilterEmptyState.js`

### Feed assembly
1. Base list = `home.feed.items`
2. Append `extraFeedItems` from “More tips/science” loads
3. Filter by chip: `"all"` → everything; else `item.type === chip`

### Pagination
GET `/home/feed?type=tip|science&offset=1`; append returned items; set expanded flag.

“More” buttons shown when chip is `all` or matching type, API reports `hasMoreTips` / `hasMoreScience`, and not yet expanded.

### Empty filter state
When `chip !== "all"` and visible list is empty → `FeedFilterEmptyState` with filter-specific copy and conditional navigation links.

### Feed item tap routing (priority order)
1. `route` param
2. `userId` → explorer profile
3. `type === "insight"`
4. `type === "science"`
5. `explorationId`

**Inputs:** Home feed API data, chip selection, expansion state  
**Outputs:** Visible feed list, empty states, navigation targets

---

## 10. Explore screen search (debounced, API-ranked)

**Location:** `ExploreScreen.js`

**Logic:**
1. Build `explorationsForChat` map from active + available explorations.
2. On query change: if empty → clear chat.
3. Else set loading; after **700 ms** debounce POST `/explore/chat` with `{ query, explorers }`.
4. Render `chat.explorationIds` in **API order** (client does not rank).

**Inputs:** Search query, exploration map  
**Outputs:** Chat message + exploration ID list from API

---

## 11. Global search filter

**Location:** `SearchModalScreen.js`

**Logic:**
1. `query = q.trim().toLowerCase()`
2. For each section, keep rows where query is empty OR `title` OR `sub` contains query (case-insensitive substring).
3. Drop sections with zero matching rows.
4. Preserve API section order and row order within sections.

**Inputs:** `/search` API sections, query string  
**Outputs:** Filtered section list

---

## 12. Community browse: merge, filter, sort, paginate

**Locations:** `CommunityScreen.js`, `data/mock.js`

### People list
1. Merge rich profiles (`commUsers`) + `basicUsers` + `followerOnly`.
2. Base sort: `name.localeCompare` (A–Z).

**Filter (when query non-empty):** Match `name`, `meta`, or `loc` (substring, lowercased).

**Sort (when query non-empty):**
1. Followed users first (`isFollowing ? 0 : 1`)
2. Then `name.localeCompare`

### Explorations tab
- Base order: `explorePage.explorationOrder` ?? all exploration keys.
- Filter: match title, category, description, or research lead name.
- Sort when searching: active explorations first, then title A–Z.

### Researchers and evidence tabs
- Substring filter on relevant text fields.
- When searching, active-linked items first (same pattern as explorations).

### Pagination constants
- `INITIAL_VISIBLE = 8`
- `PAGE_SIZE = 8`
- `INITIAL_PANEL_HEIGHT = 420`
- Height step `+220` per “Show more”
- Reset visible count and panel height on tab or query change

### Exploration row badge
- `active` → amber “Active”
- `userConsented` → blue “Joined”
- else → teal “View”

**Inputs:** Community API data, user explorations, search query, follow state  
**Outputs:** Paginated panel lists per tab

---

## 13. Follow graph and self-exclusion

**Locations:** `FollowContext.js`, `FollowListScreen.js`, `ExplorersListScreen.js`, `CommunityScreen.js`, `ExplorerProfileScreen.js`

### Hydration
- `following` = API `followingExplorerIds` minus `profile.viewerSlug` (self)
- `followingResearchers`, `followerIdSet` from API social meta

### Toggle follow
1. If `userId === selfSlug` → no-op.
2. Optimistic add/remove in local Set.
3. PATCH `/social/follows` with `followSlug` or `unfollowSlug`.
4. Revert on API error.

### Follow button visibility
Hidden when `isSelf(userId)` on community, explorer profile, explorers list, and follow list screens.

### List ordering
Follow/follower lists use **API array order** — no client re-sort.

**Inputs:** Social API meta, `viewerSlug`, user actions  
**Outputs:** Follow sets, counts, button visibility

---

## 14. Explorer profile resolution

**Location:** `data/mock.js` — `getUserProfile`

**Logic:**
1. If `commUsers[userId]` exists → return with `follower = cu.follower || followerIdSet.has(userId)`.
2. Else find in `basicUsers` + `followerOnly`; if missing → `null`.
3. For basic users: synthesize bio, default exploration stub, activity stub; set `follower` from set.
4. Derive `sceneKey` from `avatarUrl` via URL→key map (`getSceneKeyFromAvatarUrl`).

**Inputs:** `userId`, community payload, follower set  
**Outputs:** Normalized profile object or null

---

## 15. Avatar, initials, and image resolution

**Locations:** `ProfileContext.js`, `components/primitives/Avatar.js`, `assets/sceneAvatars.js`, `assets/imageManifest.js`

### Initials (`initialsFromName`)
1. Trim name, split on whitespace.
2. First character of each word, uppercase, joined.
3. Truncate to **2 characters**.
4. Fallback `"?"` if empty.

**Priority:** `profile.navProfile.initials` → computed from display name → `"?"`

### Avatar key parsing (`avatarFromProfile`)
- `scene-{key}` → `{ type: "scene", key }`
- `pravatar-{n}` → `{ type: "pravatar", id: n }`

### Render priority (`Avatar`)
1. `photoUri` (device library photo)
2. `pravatar-{img}` or `scene-{key}` from bundled manifest
3. Initials fallback on image load error

### Fallback colors
Background and text colors cycle by pravatar ID: index = `Math.abs((img ?? 0) % 5)`.

### Scene URL reverse lookup
Strip query string from URL; exact match against `SCENE_AVATARS` values.

### Profile hydration (authenticated)
Prefer locally stored scene/photo avatar over API pravatar; display name from API → onboarding → AsyncStorage.

**Inputs:** Profile API, display name, avatar selection  
**Outputs:** Avatar props, initials, image source

---

## 16. Explorer onboarding step machine

**Locations:** `data/explorerOnboarding.js`, `ExplorerOnboardingScreen.js`, `components/onboarding/OnboardingProgressBar.js`

### Visible steps (`getVisibleSteps`)
Hide auth steps (`signup`, `login`, `auth-choice`) when the user is already authenticated.

### Progress bar
- Fill width = `(current / total) * 100%`, capped at 100%.
- Total = visible steps with `showProgress: true`.
- Current index = count of progress steps from 0 through current step inclusive.

### Step validation (`validateStep`)

| Step type | Rule |
|-----------|------|
| welcome, message, createAccount | always valid |
| yesNo | answered; if `requireYes`, must be `true` |
| text | trimmed length > 0 |
| year | integer 1920 … (current year − 13) |
| singleSelect | non-null selection |
| multiSelect | array length > 0 |

### Stage clamp
When visible steps shrink (e.g. user becomes authenticated), `stage = min(stage, visibleSteps.length − 1)`.

### App entry gate (`AppNavigator`)
Show `ExplorerOnboarding` if onboarding not completed; else `MainTabs`.

**Inputs:** Step config, answers, stage index  
**Outputs:** Can-continue flag, progress UI, navigation

---

## 17. Legacy onboarding consent wizard

**Location:** `OnboardingConsentScreen.js`

**Stage machine:** 0 = intro, 1…N = consent steps, N+1 = complete. Review mode starts at stage 1.

**Required check:** All consents marked `required: true` must be checked in draft to advance.

**Initial draft:** Review mode pre-fills from saved choices; fresh flow starts all false (opt-in).

**Progress fill:** `(stage / (totalSteps + 1)) * 100%`

**Inputs:** API consent steps, review flag, draft toggles  
**Outputs:** Saved consent choices, summary navigation

---

## 18. Notification permission gating

**Locations:** `lib/notifications.js`, `ProfileScreen.js`

**Permission request (profile):** On web → unavailable; if already granted → skip; else request OS permission via `requestDailyReminderPermission()`.

**Profile reminders toggle:** On native, turning reminders on requests permission; if denied, show toast and **do not** update the pref.

**Note:** There is no client-side notification **scheduling** (no cron or trigger times) — only permission gating.

**Inputs:** Platform, permission API, user actions  
**Outputs:** Permission status strings, pref updates

---

## 19. Consent date formatting

**Location:** `formatConsentDate` in `useUserExplorations.js`

**Logic:** Parse ISO string → `toLocaleDateString` with `{ month: "long", year: "numeric" }`; return null on missing/invalid.

**Example output:** `"June 2026"`

---

## 20. Data bootstrap and community tier bucketing

**Location:** `DataContext.js`

**Explorations:** API array → map keyed by `id`.

**Community individuals split by `tier`:**
- `"comm"` → `commUsers[id]`
- `"basic"` → `basicUsers[]`
- else → `followerOnly[]`

**Inputs:** Parallel API fetches on app load  
**Outputs:** Normalized app data tree

---

## 21. Hardcoded exploration display order (fallback)

**Location:** `data/mock.js` — `explorationOrderUi`

**Order:** `["morning-rules", "eating", "screen-sleep", "relaxation", "upf-mood"]` filtered to keys present in catalog.

Community screen prefers `explorePage.explorationOrder` from API when available.

---

## 22. Insight charts and tab selection

**Location:** `InsightScreen.js`

- **Default tab:** Route param `community ? 1 : 0`; syncs when param changes.
- **Personal charts shown when:** `insight.hasPersonalData && energyTrend.bars.length > 0`.
- **Bar height:** `Math.max(4, (90 * b.h) / 100)` pixels — `b.h` is 0–100 from API.
- **Crash bars:** Orange if `b.crash`, else green.
- **Community highlight:** Row highlighted if `c.id === route.params.feedItemId`.
- **Observation icon:** Amber if `tone === "!"`, else green.
- **Adherence bars:** Width from API percentage strings (e.g. `"72%"`).

**Inputs:** Insight API payload, route params  
**Outputs:** Chart dimensions, tab content, highlighted row

---

## 23. Exploration report chart geometry

**Location:** `ExplorationReportScreen.js`

### PhaseChart
- Plot area: width 300, height 150; padding left 26, right 8.
- X: evenly spaced across `points.length − 1`.
- Y: linear map of value from `[min, max]` to plot height.
- Y-axis tick step: 1 if `max − min ≤ 4`, else 2.
- Area fill under polyline.

### StackedBar
Flex widths = segment `w` values; colors from data.

### Compare text
Split on regex `([+\-]\d+\.?\d*)` to bold numeric deltas.

**Inputs:** Report content data points  
**Outputs:** SVG coordinates, styled text segments

---

## 24. Explorer profile “nice” counter

**Location:** `ExplorerProfileScreen.js`

**Logic:** Display count = `(activity.nc || 0) + (locally toggled nice ? 1 : 0)` per activity row.

**Inputs:** Activity base count, local toggle state  
**Outputs:** Updated “👌 nice N” label (local UI only)

---

## 25. API auth retry (401 state machine)

**Locations:** `lib/api.js`, `AuthContext.js`

**Logic:**
1. On HTTP 401 (non-public request, not yet retried): call `onRefresh()`.
2. If refresh succeeds → retry request once with `retried: true`.
3. Else → `onUnauthorized()` (clear session).

**Startup:** Prefer refresh-token exchange; fall back to stored access token.

**Inputs:** HTTP responses, stored tokens  
**Outputs:** Retried request or cleared auth

---

## 26. Feed bank grouping

**Location:** `FeedBankScreen.js`

Iterate `feed.feedExpIds` in API order; for each ID load tips/science rows from nested map; skip IDs with no rows.

**Inputs:** Feed API maps, kind param (`tips` | `science`)  
**Outputs:** Grouped supplemental feed sections

---

## 27. Rich text parsing

**Location:** `utils/RichText.js`

Split HTML on `/<\/?strong>/i`; odd segments render bold; strip other tags via `/<[^>]+>/g`.

**Inputs:** HTML string  
**Outputs:** Nested `<Text>` segments

---

## 28. Nav profile avatar merge

**Location:** `navigation/MainTabShell.js`

`navProfile = { ...apiAvatarProps, ...localAvatarProps, initials: local || API || "?" }` — local avatar overrides API.

---

## 29. Multi-select toggle (onboarding)

**Location:** `components/onboarding/stepRenderers.js`

If value already in array → remove it; else append.

---

## 30. Saved check-in confirmation copy

**Location:** `HomeScreen.js`

1. Strip leading `"Your data has been saved. "` from API confirm body.
2. If multiple explorations saved → `"Daily check-in complete for A and B. {tail}"`.
3. Single → `"Daily check-in complete for {name}. {tail}"`.

---

## What the API owns

These are **not** computed deterministically on the client (values and ordering come from the server):

| Domain | Typical source |
|--------|----------------|
| Streak day counts (after enrollment) | `/me/explorations` → `streakDays` |
| Home feed item order and timestamps | `/home`, `/feed` |
| Home metric values and units | `/home` |
| Which explorations are logged today | `/home` → `loggedExplorationIds` |
| Explore chat ranking and reply text | POST `/explore/chat` |
| Notification list content and unread state | `/notifications` |
| Phase status (active / complete) | Exploration catalog API |
| Researcher / explorer list membership | Community API |
| Insight observation and adherence percentages | `/insights` |
| Starter-mode feed content | `/home` (when `starterMode`) |

---

## Summary by category

| Category | Main client rules |
|----------|-------------------|
| **Exploration lifecycle** | Progress %, consent gating, catalog + user state merge |
| **Check-in** | Pending/complete detection, field serialization, UTC date key, prefill |
| **Onboarding / consent** | Step visibility, validation thresholds, preference mapping |
| **Discovery UI** | Substring search, follow-first sort, active-first sort, 8-item pagination |
| **Identity** | Initials derivation, avatar key parsing, color cycling |
| **Presentation** | Chart bar heights, SVG plot scaling, progress bars, rich text |
| **Social** | Self-follow exclusion, optimistic follow toggle with API sync |

For product or compliance discussions, treat **ranking, streaks, and feed ordering as server-owned** unless new client-side rules are added.
