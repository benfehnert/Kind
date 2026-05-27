import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { colors } from "../theme/colors";
import { layoutWidth } from "../theme/tokens";

/**
 * Mirrors prototype.html `.app` — max-width 480px, centered, bottom padding.
 */
export function ProtoAppFrame({ children }) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const id = "kind-proto-web-base";
    if (document.getElementById(id)) return;
    const el = document.createElement("style");
    el.id = id;
    el.textContent = `
      html { font-size: 16px; }
      body {
        margin: 0;
        font-family: 'Albert Sans', system-ui, sans-serif;
        background: ${colors.bg};
        -webkit-font-smoothing: antialiased;
      }
      #root { display: flex; justify-content: center; min-height: 100%; }
    `;
    document.head.appendChild(el);
  }, []);

  return <View style={styles.frame}>{children}</View>;
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: layoutWidth.appMax,
    alignSelf: "center",
    backgroundColor: colors.bg
  }
});
