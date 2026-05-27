import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { layout, text } from "../../theme/textStyles";

export function Card({ children, style }) {
  return <View style={[layout.card, style]}>{children}</View>;
}

export function CardTitle({ children, style }) {
  return <Text style={[text.uppercaseLabel, styles.title, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: { marginBottom: 10 }
});
