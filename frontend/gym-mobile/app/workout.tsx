import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createWorkout, Exercise, Set as WorkoutSet } from '@/services/api';
import { router } from 'expo-router';

// Format time mm:ss
function formatTime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

interface FormData {
  title: string;
  notes: string;
  exercises: Exercise[];
}

const getInitialForm = (): FormData => ({
  title: '',
  notes: '',
  exercises: [{ name: '', sets: [{ reps: 0 }] }],
});

export default function ActiveWorkoutScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const [form, setForm] = useState<FormData>(getInitialForm());

  // Timer state
  const [isRunning, setIsRunning] = useState(false);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [pausedAccumulated, setPausedAccumulated] = useState(0);
  const [displayElapsed, setDisplayElapsed] = useState(0);
  const pauseAtRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Start
  const handleStart = () => {
    if (isRunning) return;
    const now = Date.now();
    setStartTimestamp(now);
    setIsRunning(true);
  };

  // Pause
  const handlePause = () => {
    if (!isRunning) return;
    pauseAtRef.current = Date.now();
    setIsRunning(false);
  };

  // Resume
  const handleResume = () => {
    if (isRunning || startTimestamp == null) return;
    const now = Date.now();
    if (pauseAtRef.current) {
      setPausedAccumulated((prev) => prev + (now - pauseAtRef.current!));
      pauseAtRef.current = null;
    }
    setIsRunning(true);
  };

  // Tick
  useEffect(() => {
    if (isRunning && startTimestamp != null) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = now - startTimestamp - pausedAccumulated;
        setDisplayElapsed(elapsed);
      }, 250) as unknown as number;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, startTimestamp, pausedAccumulated]);

  // Finish: send to API
  const handleFinish = async () => {
    const durationMs = startTimestamp ? (Date.now() - startTimestamp - pausedAccumulated) : 0;
    const dateStr = new Date().toISOString().split('T')[0];

    // Validate exercises
    const validExercises = form.exercises
      .filter((ex) => ex.name.trim())
      .map((ex) => ({ ...ex, sets: ex.sets.filter((s) => s.reps > 0) }))
      .filter((ex) => ex.sets.length > 0);

    if (validExercises.length === 0) {
      Alert.alert('Błąd', 'Dodaj przynajmniej jedno ćwiczenie z serią');
      return;
    }

    const title = form.title.trim() || 'Trening';
    const notesParts = [] as string[];
    notesParts.push(`Czas: ${formatTime(durationMs)}`);
    if (form.notes.trim()) notesParts.push(form.notes.trim());

    try {
      await createWorkout({
        title,
        date: dateStr,
        notes: notesParts.join(' | '),
        exercises: validExercises,
      });
      Alert.alert('Sukces', 'Trening zapisany');
      router.replace('/workouts');
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać treningu');
    }
  };

  // Form helpers
  const updateExercise = (index: number, field: keyof Exercise, value: string | WorkoutSet[]) => {
    const copy = [...form.exercises];
    copy[index] = { ...copy[index], [field]: value } as Exercise;
    setForm({ ...form, exercises: copy });
  };
  const addExercise = () => {
    setForm({ ...form, exercises: [...form.exercises, { name: '', sets: [{ reps: 0 }] }] });
  };
  const removeExercise = (index: number) => {
    const copy = form.exercises.filter((_, i) => i !== index);
    setForm({ ...form, exercises: copy });
  };
  const updateSet = (exIdx: number, setIdx: number, field: keyof WorkoutSet, value: number) => {
    const copy = [...form.exercises];
    const sets = [...copy[exIdx].sets];
    sets[setIdx] = { ...sets[setIdx], [field]: value };
    copy[exIdx] = { ...copy[exIdx], sets };
    setForm({ ...form, exercises: copy });
  };
  const addSet = (exIdx: number) => {
    const copy = [...form.exercises];
    copy[exIdx] = { ...copy[exIdx], sets: [...copy[exIdx].sets, { reps: 0 }] };
    setForm({ ...form, exercises: copy });
  };
  const removeSet = (exIdx: number, setIdx: number) => {
    const copy = [...form.exercises];
    copy[exIdx] = { ...copy[exIdx], sets: copy[exIdx].sets.filter((_, i) => i !== setIdx) };
    setForm({ ...form, exercises: copy });
  };

  const inputStyle = [
    styles.input,
    {
      backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
      color: colorScheme === 'dark' ? '#fff' : '#000',
      borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
    },
  ];

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <ThemedText type="title">Aktywny trening</ThemedText>
        <ThemedText type="subtitle">⏱ {formatTime(displayElapsed)}</ThemedText>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {!isRunning && (
          <Pressable style={[styles.btn, styles.primary]} onPress={handleStart}>
            <ThemedText style={styles.btnPrimaryText}>Start</ThemedText>
          </Pressable>
        )}
        {isRunning && (
          <Pressable style={[styles.btn, styles.warning]} onPress={handlePause}>
            <ThemedText style={styles.btnWarningText}>Pauza</ThemedText>
          </Pressable>
        )}
        {!isRunning && startTimestamp && (
          <Pressable style={[styles.btn, styles.primary]} onPress={handleResume}>
            <ThemedText style={styles.btnPrimaryText}>Wznów</ThemedText>
          </Pressable>
        )}
        <Pressable style={[styles.btn, styles.success]} onPress={handleFinish}>
          <ThemedText style={styles.btnSuccessText}>Zakończ i zapisz</ThemedText>
        </Pressable>
      </View>

      {/* Title and notes */}
      <ThemedText style={styles.label}>Tytuł (opcjonalnie)</ThemedText>
      <TextInput
        style={inputStyle}
        placeholder="np. Push Day"
        placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
        value={form.title}
        onChangeText={(text) => setForm({ ...form, title: text })}
      />

      <ThemedText style={styles.label}>Notatki</ThemedText>
      <TextInput
        style={[inputStyle, { height: 80 }]}
        placeholder="Uwagi do treningu..."
        placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
        value={form.notes}
        onChangeText={(text) => setForm({ ...form, notes: text })}
        multiline
      />

      {/* Exercises */}
      <View style={styles.exHeader}>
        <ThemedText style={styles.label}>Ćwiczenia</ThemedText>
        <Pressable style={styles.smallBtn} onPress={addExercise}>
          <ThemedText style={styles.smallBtnText}>+ Ćwiczenie</ThemedText>
        </Pressable>
      </View>

      {form.exercises.map((exercise, exIndex) => (
        <ThemedView key={exIndex} style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <TextInput
              style={[inputStyle, { flex: 1 }]}
              placeholder="Nazwa ćwiczenia"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              value={exercise.name}
              onChangeText={(text) => updateExercise(exIndex, 'name', text)}
            />
            <Pressable style={styles.deleteBtn} onPress={() => removeExercise(exIndex)}>
              <ThemedText>✕</ThemedText>
            </Pressable>
          </View>

          <ThemedText style={styles.setsLabel}>Serie:</ThemedText>
          {exercise.sets.map((set, setIndex) => (
            <View key={setIndex} style={styles.setRow}>
              <ThemedText style={styles.setNumber}>#{setIndex + 1}</ThemedText>
              <TextInput
                style={[inputStyle, styles.setInput]}
                placeholder="Powt."
                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
                keyboardType="numeric"
                value={set.reps > 0 ? set.reps.toString() : ''}
                onChangeText={(text) => updateSet(exIndex, setIndex, 'reps', parseInt(text) || 0)}
              />
              <TextInput
                style={[inputStyle, styles.setInput]}
                placeholder="kg"
                placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
                keyboardType="numeric"
                value={set.weight !== undefined ? set.weight.toString() : ''}
                onChangeText={(text) => updateSet(exIndex, setIndex, 'weight', parseFloat(text) || 0)}
              />
              <Pressable style={styles.deleteBtn} onPress={() => removeSet(exIndex, setIndex)}>
                <ThemedText>✕</ThemedText>
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.addSetButton} onPress={() => addSet(exIndex)}>
            <ThemedText style={styles.addSetText}>+ Seria</ThemedText>
          </Pressable>
        </ThemedView>
      ))}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  btn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 },
  primary: { backgroundColor: '#0a7ea4' },
  warning: { backgroundColor: '#f39c12' },
  success: { backgroundColor: '#27ae60' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnWarningText: { color: '#fff', fontWeight: '700' },
  btnSuccessText: { color: '#fff', fontWeight: '700' },
  label: { marginTop: 12, marginBottom: 6, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  smallBtn: { backgroundColor: '#0a7ea4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  smallBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  exerciseCard: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 12, marginTop: 12 },
  exerciseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deleteBtn: { padding: 8 },
  setsLabel: { fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  setNumber: { width: 30, fontSize: 12, opacity: 0.6 },
  setInput: { flex: 1, padding: 8, fontSize: 14 },
  addSetButton: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  addSetText: { color: '#0a7ea4', fontSize: 14 },
});