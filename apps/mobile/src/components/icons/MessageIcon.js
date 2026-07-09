import React from "react";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/colors";

const strokeProps = (color, width = 1.6) => ({
  stroke: color,
  strokeWidth: width,
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round"
});

export function MessageIcon({ size = 22, active = false, color = colors.textMuted }) {
  const stroke = active ? colors.greenDark : color;
  const fill = active ? `${colors.greenDark}18` : "none";

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8 5H13A6 6 0 0 1 13 17H9L6 20.5V17V7Q6 5 8 5Z"
        fill={fill}
        {...strokeProps(stroke, 2.1)}
      />
      <Path d="M9 9.5h6" stroke={stroke} strokeWidth={2.1} strokeLinecap="round" />
      <Path d="M9 13h6" stroke={stroke} strokeWidth={2.1} strokeLinecap="round" />
    </Svg>
  );
}
