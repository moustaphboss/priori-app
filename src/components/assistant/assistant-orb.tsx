import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** Blobs that drift around the orb's centre; their overlap gives the Siri-like colour blend. */
const BLOBS = [
  { color: '#653DFC', dx: -0.14, dy: -0.1 },
  { color: '#3B82F6', dx: 0.14, dy: -0.06 },
  { color: '#EC4899', dx: 0, dy: 0.14 },
];

type AssistantOrbProps = {
  size: number;
  /** Faster, larger pulse while listening or thinking. */
  active?: boolean;
};

/** Animated gradient orb that represents the AI assistant. Purely visual. */
export function AssistantOrb({ size, active = false }: AssistantOrbProps) {
  const reduceMotion = useReducedMotion();
  const spin = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    spin.value = withRepeat(
      withTiming(1, { duration: active ? 2500 : 6000, easing: Easing.linear }),
      -1,
    );
    pulse.value = withRepeat(
      withTiming(1, { duration: active ? 700 : 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(spin);
      cancelAnimation(pulse);
    };
  }, [active, reduceMotion, spin, pulse]);

  const blobsStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 360}deg` }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + pulse.value * (active ? 0.35 : 0.15),
    transform: [{ scale: 1 + pulse.value * (active ? 0.22 : 0.1) }],
  }));

  const blob = size * 0.72;

  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Animated.View
        style={[styles.fill, styles.glow, { borderRadius: size / 2 }, glowStyle]}
      />
      <View style={[styles.fill, styles.core, { borderRadius: size / 2 }]}>
        <Animated.View style={[styles.fill, blobsStyle]}>
          {BLOBS.map((b) => (
            <View
              key={b.color}
              style={[
                styles.blob,
                {
                  width: blob,
                  height: blob,
                  borderRadius: blob / 2,
                  backgroundColor: b.color,
                  left: (size - blob) / 2 + b.dx * size,
                  top: (size - blob) / 2 + b.dy * size,
                },
              ]}
            />
          ))}
        </Animated.View>
        {/* Soft highlight for a glassy look. */}
        <View
          style={[
            styles.highlight,
            { width: size * 0.4, height: size * 0.2, borderRadius: size * 0.1, top: size * 0.14 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  glow: {
    backgroundColor: '#8B5CF6',
  },
  core: {
    overflow: 'hidden',
    backgroundColor: '#312E81',
    alignItems: 'center',
  },
  blob: {
    position: 'absolute',
    opacity: 0.85,
  },
  highlight: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});
