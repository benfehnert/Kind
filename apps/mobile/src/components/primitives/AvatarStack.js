import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Avatar } from "./Avatar";
import { colors } from "../../theme/colors";
import { avatarPropsFromPerson } from "../../lib/avatarProps";

export function AvatarStack({ people = [], size = 24, max = 5, onPress }) {
  const visible = people.slice(0, max);
  if (!visible.length) return null;

  const overlap = Math.round(size * 0.35);
  const width = size + (visible.length - 1) * (size - overlap);

  const stack = (
    <View style={[styles.row, { width, height: size }]}>
      {visible.map((person, index) => (
        <View
          key={person.slug || person.id || index}
          style={[
            styles.avatarWrap,
            {
              left: index * (size - overlap),
              width: size,
              height: size,
              borderRadius: size / 2,
              zIndex: visible.length - index
            }
          ]}
        >
          <Avatar
            size={size - 2}
            {...avatarPropsFromPerson(person)}
            borderWidth={1.5}
            borderColor={colors.surface}
          />
        </View>
      ))}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button">
        {stack}
      </Pressable>
    );
  }

  return stack;
}

const styles = StyleSheet.create({
  row: {
    position: "relative"
  },
  avatarWrap: {
    position: "absolute",
    top: 0,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  }
});
