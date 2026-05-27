import React from "react";
import { Text } from "react-native";
import { text } from "../../theme/textStyles";

export function SectionTitle({ children, style }) {
  return <Text style={[text.sectionTitle, style]}>{children}</Text>;
}

export function SectionSub({ children, style }) {
  return <Text style={[text.sectionSub, style]}>{children}</Text>;
}
