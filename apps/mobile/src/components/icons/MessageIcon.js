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
        d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v7a1.5 1.5 0 0 1-1.5 1.5H9l-4 3v-3.5"
        fill={fill}
        {...strokeProps(stroke)}
      />
    </Svg>
  );
}
