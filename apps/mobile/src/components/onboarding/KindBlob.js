import React from "react";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { colors } from "../../theme/colors";

export function KindBlob({ size = 200 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Ellipse cx="100" cy="120" rx="72" ry="68" fill={colors.orange} />
      <Circle cx="78" cy="105" r="10" fill={colors.greenDark} />
      <Circle cx="122" cy="105" r="10" fill={colors.greenDark} />
      <Path
        d="M 88 128 Q 100 136 112 128"
        stroke={colors.greenDark}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M 100 48 Q 108 32 118 40 Q 112 52 100 48"
        fill={colors.greenLight}
      />
    </Svg>
  );
}

export function ShieldIcon({ size = 80 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80">
      <Path
        d="M40 8 L68 20 V38 C68 54 56 66 40 72 C24 66 12 54 12 38 V20 Z"
        fill={colors.greenLight}
        stroke={colors.greenDark}
        strokeWidth="2"
      />
      <Circle cx="40" cy="38" r="10" fill={colors.greenDark} />
      <Path d="M40 48 V58 M34 52 H46" stroke={colors.greenDark} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
