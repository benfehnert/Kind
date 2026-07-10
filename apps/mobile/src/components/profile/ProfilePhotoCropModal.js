import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import Slider from "@react-native-community/slider";
import * as ImageManipulator from "expo-image-manipulator";
import { colors, fontFamily, radius, spacing } from "../../theme/colors";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const OUTPUT_SIZE = 512;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function panLimits(displaySize, cropSize) {
  const overflow = (displaySize - cropSize) / 2;
  if (overflow <= 0) return { min: 0, max: 0 };
  return { min: -overflow, max: overflow };
}

function cropRegion({ imageSize, cropSize, baseScale, zoom, offsetX, offsetY }) {
  const scale = baseScale * zoom;
  const displayW = imageSize.width * scale;
  const displayH = imageSize.height * scale;
  const imageLeft = cropSize / 2 + offsetX - displayW / 2;
  const imageTop = cropSize / 2 + offsetY - displayH / 2;

  let originX = (0 - imageLeft) / scale;
  let originY = (0 - imageTop) / scale;
  const cropPixels = cropSize / scale;

  originX = clamp(originX, 0, imageSize.width - cropPixels);
  originY = clamp(originY, 0, imageSize.height - cropPixels);

  return {
    originX: Math.round(originX),
    originY: Math.round(originY),
    width: Math.round(cropPixels),
    height: Math.round(cropPixels)
  };
}

export function ProfilePhotoCropModal({ visible, imageUri, onSave, onClose }) {
  const { width: windowWidth } = useWindowDimensions();
  const cropSize = Math.min(windowWidth - spacing.screen * 2, 320);

  const [imageSize, setImageSize] = useState(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);
  const panStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    if (!visible || !imageUri) {
      setImageSize(null);
      setZoom(MIN_ZOOM);
      setOffset({ x: 0, y: 0 });
      setSaving(false);
      return;
    }

    let cancelled = false;
    Image.getSize(
      imageUri,
      (width, height) => {
        if (!cancelled) setImageSize({ width, height });
      },
      () => {
        if (!cancelled) onClose?.();
      }
    );

    return () => {
      cancelled = true;
    };
  }, [visible, imageUri, onClose]);

  const baseScale = useMemo(() => {
    if (!imageSize) return 1;
    return Math.max(cropSize / imageSize.width, cropSize / imageSize.height);
  }, [imageSize, cropSize]);

  const displaySize = useMemo(() => {
    if (!imageSize) return { width: cropSize, height: cropSize };
    const scale = baseScale * zoom;
    return {
      width: imageSize.width * scale,
      height: imageSize.height * scale
    };
  }, [imageSize, baseScale, zoom, cropSize]);

  const constrainOffset = useCallback(
    (nextX, nextY, nextZoom = zoomRef.current) => {
      if (!imageSize) return { x: 0, y: 0 };
      const scale = baseScale * nextZoom;
      const displayW = imageSize.width * scale;
      const displayH = imageSize.height * scale;
      const xLimits = panLimits(displayW, cropSize);
      const yLimits = panLimits(displayH, cropSize);
      return {
        x: clamp(nextX, xLimits.min, xLimits.max),
        y: clamp(nextY, yLimits.min, yLimits.max)
      };
    },
    [imageSize, baseScale, cropSize]
  );

  const handleZoomChange = useCallback(
    (nextZoom) => {
      const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
      setZoom(clampedZoom);
      setOffset((current) => constrainOffset(current.x, current.y, clampedZoom));
    },
    [constrainOffset]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          panStartRef.current = { ...offsetRef.current };
        },
        onPanResponderMove: (_, gesture) => {
          const start = panStartRef.current;
          setOffset(constrainOffset(start.x + gesture.dx, start.y + gesture.dy));
        }
      }),
    [constrainOffset]
  );

  const handleSave = async () => {
    if (!imageUri || !imageSize || saving) return;
    setSaving(true);
    try {
      const crop = cropRegion({
        imageSize,
        cropSize,
        baseScale,
        zoom,
        offsetX: offset.x,
        offsetY: offset.y
      });
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { crop },
          { resize: { width: OUTPUT_SIZE, height: OUTPUT_SIZE } }
        ],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      onSave?.(result.uri);
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        <Text style={styles.title}>Adjust your photo</Text>
        <Text style={styles.subtitle}>Drag to reposition. Use the slider to zoom in or out.</Text>

        <View style={styles.cropStage}>
          <View
            style={[
              styles.cropWindow,
              { width: cropSize, height: cropSize, borderRadius: cropSize / 2 }
            ]}
            {...panResponder.panHandlers}
          >
            {imageUri && imageSize ? (
              <Image
                source={{ uri: imageUri }}
                style={{
                  position: "absolute",
                  width: displaySize.width,
                  height: displaySize.height,
                  left: cropSize / 2 + offset.x - displaySize.width / 2,
                  top: cropSize / 2 + offset.y - displaySize.height / 2
                }}
                resizeMode="cover"
              />
            ) : (
              <ActivityIndicator color={colors.greenDark} />
            )}
            <View
              pointerEvents="none"
              style={[
                styles.cropRing,
                { width: cropSize, height: cropSize, borderRadius: cropSize / 2 }
              ]}
            />
          </View>
        </View>

        <View style={styles.zoomBlock}>
          <Text style={styles.zoomLabel}>Zoom</Text>
          <Slider
            style={styles.slider}
            minimumValue={MIN_ZOOM}
            maximumValue={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onValueChange={handleZoomChange}
            minimumTrackTintColor={colors.greenDark}
            maximumTrackTintColor={colors.border}
            thumbTintColor={colors.greenDark}
            disabled={!imageSize || saving}
          />
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, styles.btnGhost]}
            onPress={onClose}
            disabled={saving}
          >
            <Text style={styles.btnGhostTxt}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.btnPrimary, (!imageSize || saving) && styles.btnDisabled]}
            onPress={handleSave}
            disabled={!imageSize || saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryTxt}>Use photo</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#101510",
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sectionGap,
    paddingBottom: spacing.sectionGap
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    color: "#fff",
    textAlign: "center"
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl
  },
  cropStage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  cropWindow: {
    overflow: "hidden",
    backgroundColor: "#1a211a",
    alignItems: "center",
    justifyContent: "center"
  },
  cropRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)"
  },
  zoomBlock: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl
  },
  zoomLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.sm
  },
  slider: {
    width: "100%",
    height: 36
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md
  },
  btn: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48
  },
  btnPrimary: { backgroundColor: colors.greenDark },
  btnPrimaryTxt: { color: "#fff", fontFamily: fontFamily.semibold, fontSize: 14 },
  btnGhost: { borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  btnGhostTxt: { color: "#fff", fontFamily: fontFamily.semibold, fontSize: 14 },
  btnDisabled: { opacity: 0.45 }
});
