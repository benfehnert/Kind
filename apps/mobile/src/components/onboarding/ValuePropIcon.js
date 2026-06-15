import React from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { colors } from "../../theme/colors";

const ICONS = {
  trials: ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Rect x="20" y="30" width="80" height="60" rx="12" fill={colors.greenLight} />
      <Path d="M35 55 H85 M35 68 H70" stroke={colors.greenDark} strokeWidth="4" strokeLinecap="round" />
      <Circle cx="85" cy="45" r="14" fill={colors.orange} />
      <Path
        d="M80 45 L83 48 L90 41"
        stroke={colors.text}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  ),
  explore: ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="40" fill={colors.greenLight} />
      <Circle cx="60" cy="60" r="24" fill="none" stroke={colors.greenDark} strokeWidth="3" />
      <Path d="M60 36 V84 M36 60 H84" stroke={colors.greenDark} strokeWidth="3" strokeLinecap="round" />
      <Circle cx="60" cy="60" r="6" fill={colors.orange} />
    </Svg>
  ),
  community: ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx="40" cy="50" r="18" fill={colors.greenLight} stroke={colors.greenDark} strokeWidth="2" />
      <Circle cx="80" cy="50" r="18" fill={colors.greenLight} stroke={colors.greenDark} strokeWidth="2" />
      <Circle cx="60" cy="78" r="18" fill={colors.orange} stroke={colors.greenDark} strokeWidth="2" />
    </Svg>
  ),
  insight: ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Path
        d="M30 85 L45 55 L60 70 L75 40 L90 85 Z"
        fill={colors.greenLight}
        stroke={colors.greenDark}
        strokeWidth="2"
      />
      <Circle cx="75" cy="40" r="8" fill={colors.orange} />
    </Svg>
  ),
  alpha: ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Rect x="25" y="35" width="70" height="50" rx="10" fill={colors.amberBg} stroke={colors.amberText} strokeWidth="2" />
      <Path d="M40 55 H80 M40 68 H65" stroke={colors.amberText} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  ),
  intro: ({ size }) => (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Circle cx="60" cy="65" r="42" fill={colors.orange} />
      <Circle cx="48" cy="58" r="6" fill={colors.greenDark} />
      <Circle cx="72" cy="58" r="6" fill={colors.greenDark} />
      <Path
        d="M50 76 Q60 84 70 76"
        stroke={colors.greenDark}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  )
};

export function ValuePropIcon({ name, size = 120 }) {
  const Icon = ICONS[name];
  if (!Icon) return null;
  return <Icon size={size} />;
}
