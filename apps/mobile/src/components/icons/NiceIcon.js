import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

export function NiceIcon({ size = 22, selected = false, color }) {
  const iconColor = selected ? colors.orange : color ?? colors.textMuted;
  const name = selected ? "thumbs-up" : "thumbs-up-outline";

  return <Ionicons name={name} size={size} color={iconColor} />;
}
