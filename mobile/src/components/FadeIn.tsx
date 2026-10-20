import { useEffect, useRef, type ReactNode } from "react";
import { AccessibilityInfo, Animated, type StyleProp, type ViewStyle } from "react-native";

interface Props {
  children: ReactNode;
  /** Délai avant l'apparition, en millisecondes (pour enchaîner les éléments). */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Apparition douce (fondu + léger glissement). Aucune animation si « réduire les animations » est actif. */
export function FadeIn({ children, delay = 0, style }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    let animation: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          progress.setValue(1);
          return;
        }
        animation = Animated.timing(progress, { toValue: 1, duration: 420, delay, useNativeDriver: true });
        animation.start();
      });
    return () => {
      cancelled = true;
      animation?.stop();
    };
  }, [delay, progress]);

  return (
    <Animated.View
      style={[
        style,
        { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}
    >
      {children}
    </Animated.View>
  );
}
