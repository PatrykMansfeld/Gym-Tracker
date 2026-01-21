import { StyleSheet, View, Pressable } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Gym Tracker</ThemedText>
      <ThemedText style={styles.subtitle}>Wybierz akcję:</ThemedText>

      <View style={styles.actions}>
        <Link href="/workout" asChild>
          <Pressable style={styles.primaryBtn}>
            <ThemedText style={styles.primaryText}>▶️ Rozpocznij trening</ThemedText>
          </Pressable>
        </Link>

        <Link href="/workouts" asChild>
          <Pressable style={styles.secondaryBtn}>
            <ThemedText style={styles.secondaryText}>📝 Historia treningów</ThemedText>
          </Pressable>
        </Link>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  subtitle: { marginTop: 8 },
  actions: { marginTop: 24, gap: 12 },
  primaryBtn: { backgroundColor: '#0a7ea4', padding: 16, borderRadius: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: { borderWidth: 1, borderColor: '#0a7ea4', padding: 16, borderRadius: 12 },
  secondaryText: { color: '#0a7ea4', fontWeight: '700' },
});
