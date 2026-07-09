import React from "react";
import Svg, { Circle, Path } from "react-native-svg";
import { colors } from "../../theme/colors";

export function NiceIcon({ size = 22, selected = false, color }) {
  const stroke = selected ? colors.orange : color ?? colors.greenDark;
  const ringFill = selected ? colors.orange : "none";

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8.8 11Q9.3 7 9.5 3.5"
        stroke={stroke}
        strokeWidth={1.9}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M11.3 10.8Q13.5 7.5 14 5"
        stroke={stroke}
        strokeWidth={1.9}
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M15 6.5c2.5 1 4 3.5 3.7 6.5-.3 3-2.7 5.8-7.2 6.4-1.8.3-3.8-.2-5.3-1.6"
        stroke={stroke}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Circle
        cx="8"
        cy="15"
        r="3.5"
        fill={ringFill}
        stroke={stroke}
        strokeWidth={1.9}
      />
    </Svg>
  );
}
