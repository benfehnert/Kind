import React from "react";
import { Image, StyleSheet } from "react-native";

export const KIND_LOGO_WIDTH = 84;
export const KIND_LOGO_HEIGHT = 48;

const logos = {
  light: require("../../../assets/images/kind-logo.png"),
  dark: require("../../../assets/images/kind-brand-mark-dark.png")
};

export function KindLogo({ variant = "light", style, ...props }) {
  return (
    <Image
      source={logos[variant]}
      style={[styles.logo, style]}
      resizeMode="contain"
      accessibilityLabel="kind health exploration"
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: KIND_LOGO_WIDTH,
    height: KIND_LOGO_HEIGHT
  }
});
