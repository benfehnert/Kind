import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors, radius, spacing } from "../../theme/colors";
import { rem } from "../../theme/tokens";
import { type } from "../../theme/typography";

function subColor(tone) {
  if (tone === "amber") return colors.amberText;
  if (tone === "green") return colors.greenDark;
  return colors.textMuted;
}

/**
 * The two cards shown under "Your health explorations": an Active streak
 * card plus the key outcome metric for whichever exploration(s) the
 * individual is currently active in. Renders nothing if there are no cards
 * (i.e. not active in any exploration).
 */
export function ActiveExplorationOutcomeCards({ cards }) {
  const navigation = useNavigation();

  if (!cards?.length) return null;

  return (
    <View style={styles.grid}>
      {cards.map((card, i) => (
        <Pressable
          key={`${card.label}-${i}`}
          style={styles.cell}
          disabled={!card.explorationId}
          onPress={() => navigation.navigate("ExplorationSummary", { id: card.explorationId })}
        >
          <Text style={styles.label}>{card.label}</Text>
          <Text style={styles.value}>
            {card.value}
            {card.unit ? <Text style={styles.unit}> {card.unit}</Text> : null}
          </Text>
          {card.sub ? (
            <Text style={[styles.sub, { color: subColor(card.subTone) }]} numberOfLines={2}>
              {card.sub}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
    marginBottom: spacing.blockMb
  },
  cell: {
    width: "48%",
    backgroundColor: colors.greenLight,
    borderRadius: radius.md,
    padding: rem(0.85)
  },
  label: { ...type.metricLabel, color: colors.textMuted, marginBottom: spacing.xs },
  value: { ...type.metricValue, color: colors.text },
  unit: { ...type.metricUnit, color: colors.textMuted },
  sub: { ...type.metricLabel, marginTop: spacing.xs }
});
