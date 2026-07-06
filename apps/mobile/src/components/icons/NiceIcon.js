import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../../theme/colors";

export function NiceIcon({ size = 22, selected = false, color }) {
  const stroke = selected ? colors.orange : color ?? colors.greenDark;
  const ringFill = selected ? colors.orange : "none";

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5.5 7.5v9M8 7v9.5M10.5 6.5v10"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <Circle
        cx="15.2"
        cy="8.5"
        r="3.2"
        fill={ringFill}
        stroke={stroke}
        strokeWidth={1.6}
      />
      <Path
        d="M5 16.5c1.8 1.3 4.5 2.2 8.5 2.2 1.6 0 2.9-.3 3.8-.7"
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
