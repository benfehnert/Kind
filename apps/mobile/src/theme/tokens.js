/**
 * Design tokens from apps/mobile/prototype.html (1rem = 16px).
 */
import { Platform } from "react-native";

export const REM = 16;
export const rem = (n) => Math.round(n * REM * 100) / 100;

/** Slight bump on web so RN Text matches browser metrics next to prototype.html */
export const platformScale = Platform.OS === "web" ? 1.0625 : 1;
export const px = (n) => Math.round(n * platformScale);

export const spacing = {
  xxs: px(2),
  xs: px(4),
  sm: px(6),
  md: px(8),
  lg: px(10),
  xl: px(12),
  xxl: px(14),
  /** .screen { padding: 1rem } */
  screen: rem(1),
  /** .card padding 1rem 1.25rem */
  cardX: rem(1.25),
  cardY: rem(1),
  /** .card, .science-banner, .metric-grid margin-bottom: 1rem */
  blockMb: rem(1),
  /** .feed-item margin-bottom: 0.75rem */
  feedMb: rem(0.75),
  /** .sub-tabs margin-bottom: 1.25rem */
  blockMbLg: rem(1.25),
  /** explore header block margin-bottom: 1.5rem */
  blockMbXL: rem(1.5),
  /** .nav padding: 0.9rem 1rem */
  navY: rem(0.9),
  navX: rem(1),
  /** .chip-row margin-bottom: 1rem */
  sectionGap: rem(1),
  rowGap: px(10),
  feedGap: px(10),
  exploreGap: px(14),
  chipPadX: px(14),
  chipPadY: px(6),
  /** .app padding-bottom: 80px */
  screenBottom: px(80)
};

export const radius = {
  md: px(8),
  lg: px(12),
  pill: 999
};

export const fontSize = {
  xxs: px(10),
  xs: px(11),
  sm: px(12),
  md: px(13),
  base: px(14),
  lg: px(15),
  xl: px(17),
  title: px(20),
  metric: px(22),
  logo: px(26),
  detailTitle: px(15),
  numberInput: px(18)
};

export const lineHeight = {
  tight: 1,
  body: 1.55,
  bodyShort: 1.5,
  relaxed: 1.65,
  explore: 1.4,
  title: 1.35
};

export const letterSpacing = {
  logo: -0.5,
  navSub: 0.44,
  uppercase: 0.77,
  category: 0.33
};

export const iconSize = {
  nav: px(20),
  navBtn: px(36),
  avatarNav: px(36),
  avatarFeed: px(34),
  avatarRow: px(40),
  explore: px(42),
  close: px(32),
  back: px(18),
  insight: px(32),
  commInsight: px(36)
};

/** Minimum touch / row heights from prototype */
export const heights = {
  tabBar: px(44),
  navIconBtn: px(36),
  chart: px(80),
  progress: px(6),
  toggle: px(24),
  logBtn: px(48),
  primaryBtn: px(48),
  profileRow: px(60),
  exploreRow: px(72),
  feedHeader: px(34),
  subTab: px(38),
  input: px(44),
  overlayClose: px(32)
};

export const layoutWidth = {
  appMax: 480
};
