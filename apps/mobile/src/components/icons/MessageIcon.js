import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

export function MessageIcon({ size = 22, active = false, color = colors.textMuted }) {
  const iconColor = active ? colors.greenDark : color;
  const name = active ? "chatbubble" : "chatbubble-outline";

  return <Ionicons name={name} size={size} color={iconColor} />;
}
