import React from "react";
import Svg, { Circle, Line, Path, Polyline } from "react-native-svg";

const strokeProps = (color, width = 1.6) => ({
  stroke: color,
  strokeWidth: width,
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round"
});

export function SearchIcon({ size = 20, color = "rgba(255,255,255,0.75)" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="11" cy="11" r="7" {...strokeProps(color)} />
      <Line x1="16.5" y1="16.5" x2="22" y2="22" {...strokeProps(color)} />
    </Svg>
  );
}

export function BellIcon({ size = 20, color = "rgba(255,255,255,0.75)" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...strokeProps(color)} />
      <Path d="M13.73 21a2 2 0 0 1-3.46 0" {...strokeProps(color)} />
    </Svg>
  );
}

export function CloseIcon({ size = 16, color = "#666666" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1="6" y1="6" x2="18" y2="18" {...strokeProps(color, 2)} />
      <Line x1="18" y1="6" x2="6" y2="18" {...strokeProps(color, 2)} />
    </Svg>
  );
}

export function BackIcon({ size = 18, color = "#ffffff" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Polyline points="15,6 9,12 15,18" {...strokeProps(color, 2)} />
    </Svg>
  );
}

export function SearchGlassIcon({ size = 18, color = "#666666" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="11" cy="11" r="7" {...strokeProps(color, 1.8)} />
      <Line x1="16.5" y1="16.5" x2="22" y2="22" {...strokeProps(color, 1.8)} />
    </Svg>
  );
}
