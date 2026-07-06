import React from "react";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../theme/colors";

export function HeartIcon({ size = 18, selected = false, color = colors.textMuted }) {
  const fill = selected ? "#E24B4A" : "none";
  const stroke = selected ? "#E24B4A" : color;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 20.5s-6.5-4.2-8.8-7.6C1.4 10.2 2.6 6.8 5.8 6.1c1.8-.4 3.5.3 4.5 1.7 1-1.4 2.7-2.1 4.5-1.7 3.2.7 4.4 4.1 2.6 6.8C18.5 16.3 12 20.5 12 20.5z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ClapIcon({ size = 18, selected = false, color = colors.textMuted }) {
  const fill = selected ? colors.orange : "none";
  const stroke = selected ? colors.orangeDark : color;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M8 9.5V5.8c0-.8.6-1.5 1.4-1.5.8 0 1.4.7 1.4 1.5v4.2M11.8 8.3V4.9c0-.8.6-1.5 1.4-1.5.8 0 1.4.7 1.4 1.5v5.1M15.6 9.8V6.4c0-.8.6-1.5 1.4-1.5.8 0 1.4.7 1.4 1.5v6.1c0 3.2-2.2 5.9-5.2 6.6-2.2.5-4.4-.2-5.8-1.8"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
