import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../../theme/colors";

export function NiceIcon({ size = 22, selected = false, color = colors.textMuted }) {
  const fill = selected ? colors.orange : "none";
  const stroke = selected ? colors.orange : color;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle
        cx="12"
        cy="12"
        r="9"
        fill={selected ? `${colors.orange}22` : "none"}
        stroke={stroke}
        strokeWidth={1.6}
      />
      <Path
        d="M8.5 11.5c0-1.8 1.2-3.2 2.8-3.2.9 0 1.7.5 2.2 1.2.5-.7 1.3-1.2 2.2-1.2 1.6 0 2.8 1.4 2.8 3.2 0 2.4-2.5 4.3-5 6.3-2.5-2-5-3.9-5-6.3z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </Svg>
  );
}
