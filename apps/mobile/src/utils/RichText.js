import React from "react";
import { StyleSheet, Text } from "react-native";
import { colors, fontFamily } from "../theme/colors";

function stripHtml(s) {
  if (!s) return "";
  return String(s).replace(/<[^>]+>/g, "");
}

/**
 * Renders string with simple <strong>...</strong> splits (no nesting).
 */
export function RichTextParts({ html, style, strongStyle }) {
  if (!html) return null;
  const segs = String(html).split(/<\/?strong>/i);
  const out = [];
  for (let i = 0; i < segs.length; i++) {
    const plain = stripHtml(segs[i]);
    if (!plain) continue;
    out.push(
      <Text key={i} style={i % 2 === 1 ? strongStyle || styles.strong : style}>
        {plain}
      </Text>
    );
  }
  return <Text style={style}>{out}</Text>;
}

const styles = StyleSheet.create({
  strong: {
    fontFamily: fontFamily.medium,
    color: colors.text,
    fontWeight: "600"
  }
});
