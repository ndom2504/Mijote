import { useEventListener } from "expo";
import { useVideoPlayer, VideoView } from "expo-video";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const player = useVideoPlayer(require("../../assets/splash.mp4"), (video) => {
    video.loop = false;
    video.play();
  });
  useEventListener(player, "playToEnd", onDone);
  return (
    <View style={styles.splash}>
      <VideoView player={player} contentFit="cover" nativeControls={false} style={StyleSheet.absoluteFill} />
      <Pressable style={styles.skip} onPress={onDone} accessibilityRole="button" accessibilityLabel="Passer la vidéo">
        <Text style={styles.skipText}>Passer</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.forest },
  skip: {
    position: "absolute",
    right: 20,
    bottom: 36,
    backgroundColor: "rgba(246,245,239,0.92)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  skipText: { color: colors.forest, fontWeight: "700" },
});
