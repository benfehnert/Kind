import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { colors, fontFamily, radius, spacing } from "../../theme/colors";
import { Avatar } from "../primitives/Avatar";
import { SCENE_AVATARS } from "../../assets/sceneAvatars";

const PRAVATAR_OPTIONS = [28, 1, 5, 12, 18, 32, 44, 52, 64, 68];

export function EditNameModal({ visible, initialName, onSave, onClose }) {
  const [name, setName] = useState(initialName);

  React.useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Edit your name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            autoFocus
          />
          <View style={styles.row}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={onClose}>
              <Text style={styles.btnGhostTxt}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnPrimary, !name.trim() && styles.btnDisabled]}
              onPress={() => {
                if (name.trim()) onSave(name.trim());
              }}
            >
              <Text style={styles.btnPrimaryTxt}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function EditAvatarModal({ visible, currentAvatar, onSave, onClose }) {
  const selectPravatar = (id) => onSave({ type: "pravatar", id });
  const selectScene = (key) => onSave({ type: "scene", key });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, styles.sheetTall]}>
          <Text style={styles.sheetTitle}>Choose a profile image</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.groupLabel}>People</Text>
            <View style={styles.grid}>
              {PRAVATAR_OPTIONS.map((id) => (
                <Pressable
                  key={`p-${id}`}
                  style={[
                    styles.avatarCell,
                    currentAvatar?.type === "pravatar" &&
                      currentAvatar.id === id &&
                      styles.avatarCellOn
                  ]}
                  onPress={() => selectPravatar(id)}
                >
                  <Avatar size={52} img={id} initials="" borderColor={colors.orange} borderWidth={2} />
                </Pressable>
              ))}
            </View>
            <Text style={styles.groupLabel}>Scenes</Text>
            <View style={styles.grid}>
              {Object.keys(SCENE_AVATARS).map((key) => (
                <Pressable
                  key={`s-${key}`}
                  style={[
                    styles.avatarCell,
                    currentAvatar?.type === "scene" &&
                      currentAvatar.key === key &&
                      styles.avatarCellOn
                  ]}
                  onPress={() => selectScene(key)}
                >
                  <Avatar size={52} sceneKey={key} initials="" borderColor={colors.orange} borderWidth={2} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Pressable style={[styles.btn, styles.btnGhost, { marginTop: spacing.lg }]} onPress={onClose}>
            <Text style={styles.btnGhostTxt}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "center", padding: spacing.screen },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.screen,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: "80%"
  },
  sheetTall: { maxHeight: "85%" },
  sheetTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.xl
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: colors.text,
    marginBottom: spacing.xl
  },
  row: { flexDirection: "row", gap: spacing.md },
  btn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    alignItems: "center"
  },
  btnPrimary: { backgroundColor: colors.greenDark },
  btnPrimaryTxt: { color: "#fff", fontFamily: fontFamily.semibold, fontSize: 14 },
  btnGhost: { borderWidth: 1, borderColor: colors.borderMed },
  btnGhostTxt: { color: colors.text, fontFamily: fontFamily.semibold, fontSize: 14 },
  btnDisabled: { opacity: 0.45 },
  groupLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.md,
    marginTop: spacing.md
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.lg },
  avatarCell: {
    padding: 4,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: "transparent"
  },
  avatarCellOn: { borderColor: colors.greenDark, backgroundColor: colors.greenLight }
});
