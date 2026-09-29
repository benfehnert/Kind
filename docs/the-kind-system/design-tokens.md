# Design Tokens

*Kind System version 2026.09.29. Values recorded from the codebase at commit `15a1016`, 29 September 2026.*

This is the visual layer of the Design System as it exists in code today. It is the interim source of truth that Section 2.1 of [`the-kind-system.md`](the-kind-system.md) assigns to Storybook until Storybook exists (see [`implementation-status.md`](implementation-status.md)).

> **The code is authoritative for values.** This document records what the code held at the commit above, and why. If this document and `apps/mobile/src/theme/` disagree, the code wins until a decision in [`decisions/`](decisions/README.md) resolves the drift. That decision either changes the code to match an intended value, or updates this document to record the new one. Neither side is edited quietly to match the other.

## Source files

| File | Contents |
|---|---|
| `apps/mobile/src/theme/colors.js` | `colors`, `fontFamily`; re-exports every token group from `tokens.js` |
| `apps/mobile/src/theme/tokens.js` | `spacing`, `radius`, `fontSize`, `lineHeight`, `letterSpacing`, `iconSize`, `heights`, `layoutWidth`, and the `rem()` / `px()` helpers |
| `apps/mobile/src/theme/typography.js` | `protoType()` and the named text styles in `type` |
| `apps/mobile/src/theme/textStyles.js` | `layout` and `text` StyleSheets (type + colour + spacing composites) |

**Origin.** The tokens were transcribed from the HTML prototype `apps/mobile/prototype.html` at 1rem = 16px (see the header comment in `tokens.js`). Comments in `tokens.js` name the CSS rule each value came from.

**Platform scaling.** `px(n)` multiplies by `platformScale`, which is `1.0625` on web and `1` on native, then rounds. This keeps React Native text on web metrically aligned with the prototype. `rem(n)` does **not** scale. That's why the tables below show both native and web values: tokens built with `px()` differ between platforms, and tokens built with `rem()` don't.

## Colour

| Token | Value | Role (from usage) |
|---|---|---|
| `colors.greenDark` | `#22401F` | Primary brand green: nav, links, category labels, primary actions |
| `colors.greenLight` | `#E6ECD0` | Secondary green: log-form background, "teal" badge background |
| `colors.orange` | `#F4A261` | Accent / call-to-action |
| `colors.orangeDark` | `#D4743E` | Accent text / emphasis on light surfaces |
| `colors.bg` | `#F7F8F2` | App background |
| `colors.surface` | `#FFFFFF` | Cards, feed items |
| `colors.text` | `#1F2A1F` | Primary text |
| `colors.textMuted` | `#666666` | Secondary text |
| `colors.border` | `#DADFD2` | Card borders |
| `colors.borderMed` | `#C4CCBA` | Stronger / dashed borders |
| `colors.blueBg` / `colors.blueText` | `#E6F1FB` / `#185FA5` | "blue" badge / avatar pair |
| `colors.amberBg` / `colors.amberText` | `#FDF0E4` / `#8A4A1A` | "amber" badge / avatar pair; amber metric tone |
| `colors.purpleBg` / `colors.purpleText` | `#EEEDFE` / `#534AB7` | "purple" badge / avatar pair |
| `colors.mintBg` / `colors.mintText` | `#EAF3DE` / `#3B6D11` | "green" badge / avatar pair |
| `colors.notifDot` | `#E24B4A` | Notification indicator |
| `colors.navIcon` | `rgba(255,255,255,0.75)` | Nav icons on dark background |

## Typography

| Token | Value |
|---|---|
| `fontFamily.regular` | `AlbertSans_400Regular` |
| `fontFamily.medium` | `AlbertSans_500Medium` |
| `fontFamily.semibold` | `AlbertSans_600SemiBold` |
| `fontFamily.logo` | `Onest_700Bold` |

Text styles are made by `protoType(size, family, lineHeightRatio)`. It uses named font files instead of `fontWeight` so that web renders at the intended size. The named styles in `type` (`typography.js`) are:

| Style | Size token | Family | Line height |
|---|---|---|---|
| `logo` | `fontSize.logo` | logo | tight |
| `navSub` | `fontSize.xs` | regular | tight |
| `sectionTitle` | `fontSize.xl` | semibold | body |
| `sectionSub`, `body`, `feedBody` | `fontSize.md` | regular | body |
| `bodyStrong`, `label` | `fontSize.md` | medium | body |
| `feedName` | `fontSize.md` | semibold | body |
| `caption` | `fontSize.xs` | regular | body |
| `captionStrong` | `fontSize.xs` | semibold | body |
| `feedTime`, `metricLabel` | `fontSize.xs` | regular | tight |
| `exploreCategory` | `fontSize.xs` | semibold | tight |
| `uppercaseLabel`, `cardTitle` | `fontSize.xs` | semibold | tight, uppercase, letter-spacing 0.77 |
| `exploreTitle` | `fontSize.base` | semibold | title |
| `exploreDesc` | `fontSize.sm` | regular | explore |
| `profileName` | `fontSize.base` | semibold | body |
| `profileMeta`, `metricUnit` | `fontSize.sm` | regular | tight |
| `link`, `tabActive` | `fontSize.sm` | semibold | body |
| `tab`, `chip` | `fontSize.sm` | medium | body |
| `metricValue` | `fontSize.metric` | semibold | tight |
| `scienceTitle` | `fontSize.md` | semibold | tight |
| `scienceText` | `fontSize.sm` | regular | body |
| `button` | `fontSize.lg` | semibold | body |
| `buttonMd` | `fontSize.base` | semibold | body |

`textStyles.js` pairs these with colours. For example, `text.body` is `type.body` in `colors.textMuted`, and `text.link` is `type.link` in `colors.greenDark`. It also defines the `layout.card`, `layout.feedItem`, `layout.feedMore`, `layout.logForm`, and `layout.screenPad` surface styles.

## Scale tokens

Values are in density-independent pixels, resolved from `tokens.js` for each platform. `lineHeight` values are ratios and `letterSpacing` values are raw. Neither is scaled.

### spacing

| Token | Native | Web |
|---|---|---|
| `spacing.xxs` | 2 | 2 |
| `spacing.xs` | 4 | 4 |
| `spacing.sm` | 6 | 6 |
| `spacing.md` | 8 | 9 |
| `spacing.lg` | 10 | 11 |
| `spacing.xl` | 12 | 13 |
| `spacing.xxl` | 14 | 15 |
| `spacing.screen` | 16 | 16 |
| `spacing.cardX` | 20 | 20 |
| `spacing.cardY` | 16 | 16 |
| `spacing.blockMb` | 16 | 16 |
| `spacing.feedMb` | 12 | 12 |
| `spacing.blockMbLg` | 20 | 20 |
| `spacing.blockMbXL` | 24 | 24 |
| `spacing.navY` | 14.4 | 14.4 |
| `spacing.navX` | 16 | 16 |
| `spacing.sectionGap` | 16 | 16 |
| `spacing.rowGap` | 10 | 11 |
| `spacing.feedGap` | 10 | 11 |
| `spacing.exploreGap` | 14 | 15 |
| `spacing.chipPadX` | 14 | 15 |
| `spacing.chipPadY` | 6 | 6 |
| `spacing.screenBottom` | 80 | 85 |

### radius

| Token | Native | Web |
|---|---|---|
| `radius.md` | 8 | 9 |
| `radius.lg` | 12 | 13 |
| `radius.pill` | 999 | 999 |

### fontSize

| Token | Native | Web |
|---|---|---|
| `fontSize.xxs` | 10 | 11 |
| `fontSize.xs` | 11 | 12 |
| `fontSize.sm` | 12 | 13 |
| `fontSize.md` | 13 | 14 |
| `fontSize.base` | 14 | 15 |
| `fontSize.lg` | 15 | 16 |
| `fontSize.xl` | 17 | 18 |
| `fontSize.title` | 20 | 21 |
| `fontSize.metric` | 22 | 23 |
| `fontSize.logo` | 26 | 28 |
| `fontSize.detailTitle` | 15 | 16 |
| `fontSize.numberInput` | 18 | 19 |

### lineHeight

| Token | Native | Web |
|---|---|---|
| `lineHeight.tight` | 1 | 1 |
| `lineHeight.body` | 1.55 | 1.55 |
| `lineHeight.bodyShort` | 1.5 | 1.5 |
| `lineHeight.relaxed` | 1.65 | 1.65 |
| `lineHeight.explore` | 1.4 | 1.4 |
| `lineHeight.title` | 1.35 | 1.35 |

### letterSpacing

| Token | Native | Web |
|---|---|---|
| `letterSpacing.logo` | -0.5 | -0.5 |
| `letterSpacing.navSub` | 0.44 | 0.44 |
| `letterSpacing.uppercase` | 0.77 | 0.77 |
| `letterSpacing.category` | 0.33 | 0.33 |

### iconSize

| Token | Native | Web |
|---|---|---|
| `iconSize.nav` | 20 | 21 |
| `iconSize.navBtn` | 36 | 38 |
| `iconSize.avatarNav` | 36 | 38 |
| `iconSize.avatarFeed` | 34 | 36 |
| `iconSize.avatarRow` | 40 | 43 |
| `iconSize.explore` | 42 | 45 |
| `iconSize.close` | 32 | 34 |
| `iconSize.back` | 18 | 19 |
| `iconSize.insight` | 32 | 34 |
| `iconSize.commInsight` | 36 | 38 |

### heights

| Token | Native | Web |
|---|---|---|
| `heights.tabBar` | 44 | 47 |
| `heights.navIconBtn` | 36 | 38 |
| `heights.chart` | 80 | 85 |
| `heights.progress` | 6 | 6 |
| `heights.toggle` | 24 | 26 |
| `heights.logBtn` | 48 | 51 |
| `heights.primaryBtn` | 48 | 51 |
| `heights.profileRow` | 60 | 64 |
| `heights.exploreRow` | 72 | 77 |
| `heights.feedHeader` | 34 | 36 |
| `heights.subTab` | 38 | 40 |
| `heights.input` | 44 | 47 |
| `heights.overlayClose` | 32 | 34 |

### layoutWidth

| Token | Native | Web |
|---|---|---|
| `layoutWidth.appMax` | 480 | 480 |

## Primitives

Shared components in `apps/mobile/src/components/primitives/`. Components outside this folder are composed from these primitives and the tokens above.

| File | Exports | Purpose |
|---|---|---|
| `Avatar.js` | `Avatar` | Photo / scene / generated avatar with initials fallback. Fallback colours cycle through the five badge colour pairs. |
| `AvatarStack.js` | `AvatarStack` | Overlapping row of up to `max` (default 5) avatars. |
| `Badge.js` | `Badge` | Pill label in one of five variants: `teal`, `amber`, `blue`, `green`, `purple`. |
| `Buttons.js` | `PrimaryButton`, `GhostButton` | Primary and secondary actions. |
| `Card.js` | `Card`, `CardTitle` | Surface container (`layout.card`) and its uppercase title. |
| `ChipRow.js` | `ChipRow` | Single-select filter chip row. |
| `KindLogo.js` | `KindLogo`, `KIND_LOGO_WIDTH`, `KIND_LOGO_HEIGHT` | Wordmark (`light`) or brand mark (`dark`), 84 × 48. |
| `KindNavBar.js` | `KindNavBar` | Top bar: logo, search, profile avatar. |
| `KindTabBar.js` | `KindTabBar` | Bottom tabs: Home, Exploration, Insight, Community, Profile. |
| `MetricCard.js` | `MetricGrid`, `MetricCard` | Metric tiles with label, value, unit, and a sub-line in default, `amber`, or `green` tone. |
| `PullToRefreshIndicator.js` | `PullToRefreshIndicator` | Refresh indicator, including web pull distance. |
| `ScienceBanner.js` | `ScienceBanner` | Evidence / science callout with title, body, and footer. |
| `SectionTitle.js` | `SectionTitle`, `SectionSub` | Section heading and subheading. |

## Known drift

These were recorded when this document was created. They are not approved. Each needs a decision before it's resolved.

1. **Raw colours outside the theme.** 11 files under `apps/mobile/src` outside `theme/` use hex literals instead of tokens: `context/DataContext.js`, `utils/exploreSearch.js`, `screens/CentPhaseReportScreen.js`, `screens/ExplorationReportScreen.js`, `components/profile/ProfilePhotoCropModal.js`, `components/icons/ReactionIcons.js`, `components/icons/ProtoIcons.js`, `components/onboarding/OnboardingContinueButton.js`, `components/reports/ExplorationReportContent.js`, `data/explorationReportContent.js`, `data/mock.js`. Some of those values match existing tokens (`#8A4A1A`, `#FDF0E4`, `#185FA5`, `#E24B4A`). Others aren't in the token set at all, such as `#EF9F27`, `#888780`, `#5F6B5C`, and `#FAEEDA`.
2. **Separate website token set.** `apps/kind-website/style.css` defines its own CSS custom properties. They share the core palette (`--green` `#22401F`, `--green-light` `#E6ECD0`, `--cream` `#F7F8F2`, `--charcoal` `#1F2A1F`, `--border` `#DADFD2`, `--accent` `#F4A261`) but differ elsewhere: muted text is `--muted` `#A8B3A0` vs `colors.textMuted` `#666666`, and the site adds `--green-mid`, `--slate`, `--coral-light`, and radii of 12 and 20px. The website is not yet named as a Design System consumer in Section 5.

## Re-verifying

Regenerate the scale tables by evaluating `apps/mobile/src/theme/tokens.js` with `platformScale` set to `1` and `1.0625`. Diff the colour table against `apps/mobile/src/theme/colors.js`. If anything differs, record it through the `update-kind-system` skill (`docs/the-kind-system/skills/update-kind-system/SKILL.md`).
