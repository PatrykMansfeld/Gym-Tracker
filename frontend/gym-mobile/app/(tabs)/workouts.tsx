/**
 * Ekran listy treningów z funkcjonalnością CRUD
 * - Wyświetla listę treningów z API
 * - Pozwala dodawać, edytować i usuwać treningi
 * - Obsługuje pull-to-refresh
 */

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  createWorkout,
  deleteWorkout,
  Exercise,
  getWorkouts,
  Set as WorkoutSet,
  updateWorkout,
  Workout,
} from '@/services/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ============================================
// TYPY I STAŁE
// ============================================

/** Struktura danych formularza treningu */
interface FormData {
  title: string;
  date: string;
  notes: string;
  exercises: Exercise[];
}

/** Tworzy pusty formularz z domyślnymi wartościami */
const getEmptyForm = (): FormData => ({
  title: '',
  date: new Date().toISOString().split('T')[0], // Dzisiejsza data w formacie YYYY-MM-DD
  notes: '',
  exercises: [{ name: '', sets: [{ reps: 0 }] }],
});

// ============================================
// GŁÓWNY KOMPONENT
// ============================================

export default function WorkoutsScreen() {
  // Stan listy treningów
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Motyw kolorystyczny
  const colorScheme = useColorScheme() ?? 'light';

  // Stan modala formularza
  const [modalVisible, setModalVisible] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [formData, setFormData] = useState<FormData>(getEmptyForm());
  const [saving, setSaving] = useState(false);

  // ============================================
  // POBIERANIE DANYCH
  // ============================================

  /** Pobiera listę treningów z API */
  const fetchWorkouts = useCallback(async () => {
    try {
      setError(null);
      const data = await getWorkouts();
      setWorkouts(data);
    } catch {
      setError('Nie udało się połączyć z serwerem. Upewnij się, że backend działa na localhost:8080');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Odświeża dane przy każdym wejściu na ekran
  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
    }, [fetchWorkouts])
  );

  /** Obsługa pull-to-refresh */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWorkouts();
  }, [fetchWorkouts]);

  // ============================================
  // OPERACJE MODAL
  // ============================================

  /** Otwiera modal do tworzenia nowego treningu */
  const openCreateModal = () => {
    setEditingWorkout(null);
    setFormData(getEmptyForm());
    setModalVisible(true);
  };

  /** Otwiera modal do edycji istniejącego treningu */
  const openEditModal = (workout: Workout) => {
    setEditingWorkout(workout);
    setFormData({
      title: workout.title,
      date: workout.date,
      notes: workout.notes,
      exercises: workout.exercises.length > 0 
        ? workout.exercises 
        : [{ name: '', sets: [{ reps: 0 }] }],
    });
    setModalVisible(true);
  };

  /** Zamyka modal i resetuje formularz */
  const closeModal = () => {
    setModalVisible(false);
    setEditingWorkout(null);
    setFormData(getEmptyForm());
  };

  // ============================================
  // OPERACJE CRUD
  // ============================================

  /** Zapisuje trening (tworzy nowy lub aktualizuje istniejący) */
  const handleSave = async () => {
    // Walidacja tytułu
    if (!formData.title.trim()) {
      Alert.alert('Błąd', 'Tytuł treningu jest wymagany');
      return;
    }

    // Filtruj puste ćwiczenia i serie bez powtórzeń
    const validExercises = formData.exercises
      .filter(ex => ex.name.trim())
      .map(ex => ({
        ...ex,
        sets: ex.sets.filter(s => s.reps > 0),
      }))
      .filter(ex => ex.sets.length > 0);

    // Walidacja ćwiczeń
    if (validExercises.length === 0) {
      Alert.alert('Błąd', 'Dodaj przynajmniej jedno ćwiczenie z serią');
      return;
    }

    setSaving(true);
    try {
      const workoutData = {
        title: formData.title,
        date: formData.date,
        notes: formData.notes,
        exercises: validExercises,
      };

      if (editingWorkout) {
        // Aktualizacja istniejącego treningu
        await updateWorkout(editingWorkout.id, workoutData);
      } else {
        // Tworzenie nowego treningu
        await createWorkout(workoutData);
      }
      closeModal();
      fetchWorkouts();
    } catch {
      Alert.alert('Błąd', 'Nie udało się zapisać treningu');
    } finally {
      setSaving(false);
    }
  };

  /** Usuwa trening po potwierdzeniu */
  const handleDelete = (workout: Workout) => {
    Alert.alert(
      'Usuń trening',
      `Czy na pewno chcesz usunąć "${workout.title}"?`,
      [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Usuń',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWorkout(workout.id);
              fetchWorkouts();
            } catch {
              Alert.alert('Błąd', 'Nie udało się usunąć treningu');
            }
          },
        },
      ]
    );
  };

  // ============================================
  // OBSŁUGA FORMULARZA
  // ============================================

  /** Aktualizuje pole ćwiczenia */
  const updateExercise = (index: number, field: keyof Exercise, value: string | WorkoutSet[]) => {
    const newExercises = [...formData.exercises];
    newExercises[index] = { ...newExercises[index], [field]: value };
    setFormData({ ...formData, exercises: newExercises });
  };

  /** Aktualizuje pole serii */
  const updateSet = (exerciseIndex: number, setIndex: number, field: keyof WorkoutSet, value: number) => {
    const newExercises = [...formData.exercises];
    const newSets = [...newExercises[exerciseIndex].sets];
    newSets[setIndex] = { ...newSets[setIndex], [field]: value };
    newExercises[exerciseIndex] = { ...newExercises[exerciseIndex], sets: newSets };
    setFormData({ ...formData, exercises: newExercises });
  };

  /** Dodaje nowe ćwiczenie do formularza */
  const addExercise = () => {
    setFormData({
      ...formData,
      exercises: [...formData.exercises, { name: '', sets: [{ reps: 0 }] }],
    });
  };

  /** Usuwa ćwiczenie z formularza */
  const removeExercise = (index: number) => {
    if (formData.exercises.length <= 1) return; // Minimum 1 ćwiczenie
    const newExercises = formData.exercises.filter((_, i) => i !== index);
    setFormData({ ...formData, exercises: newExercises });
  };

  /** Dodaje nową serię do ćwiczenia */
  const addSet = (exerciseIndex: number) => {
    const newExercises = [...formData.exercises];
    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      sets: [...newExercises[exerciseIndex].sets, { reps: 0 }],
    };
    setFormData({ ...formData, exercises: newExercises });
  };

  /** Usuwa serię z ćwiczenia */
  const removeSet = (exerciseIndex: number, setIndex: number) => {
    const newExercises = [...formData.exercises];
    if (newExercises[exerciseIndex].sets.length <= 1) return; // Minimum 1 seria
    newExercises[exerciseIndex] = {
      ...newExercises[exerciseIndex],
      sets: newExercises[exerciseIndex].sets.filter((_, i) => i !== setIndex),
    };
    setFormData({ ...formData, exercises: newExercises });
  };

  // ============================================
  // STYLE DYNAMICZNE
  // ============================================

  /** Style pola tekstowego z uwzględnieniem motywu */
  const inputStyle = [
    styles.input,
    { 
      backgroundColor: colorScheme === 'dark' ? '#333' : '#fff',
      color: colorScheme === 'dark' ? '#fff' : '#000',
      borderColor: colorScheme === 'dark' ? '#555' : '#ddd',
    },
  ];

  // ============================================
  // RENDEROWANIE ELEMENTÓW LISTY
  // ============================================

  /** Renderuje pojedynczą kartę treningu */
  const renderWorkoutItem = ({ item }: { item: Workout }) => (
    <Pressable
      style={[
        styles.workoutCard,
        { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5' },
      ]}
      onPress={() => openEditModal(item)}
      onLongPress={() => handleDelete(item)}
    >
      {/* Nagłówek karty: tytuł i data */}
      <ThemedView style={styles.cardHeader}>
        <ThemedText type="subtitle">{item.title}</ThemedText>
        <ThemedText style={styles.dateText}>{item.date}</ThemedText>
      </ThemedView>
      
      {/* Notatki (jeśli istnieją) */}
      {item.notes ? (
        <ThemedText style={styles.notesText}>{item.notes}</ThemedText>
      ) : null}
      
      {/* Lista ćwiczeń (max 3 widoczne) */}
      <ThemedView style={styles.exercisesList}>
        {item.exercises.slice(0, 3).map((exercise, index) => (
          <ThemedText key={index} style={styles.exerciseItem}>
            💪 {exercise.name} - {exercise.sets.length} serii
          </ThemedText>
        ))}
        {item.exercises.length > 3 && (
          <ThemedText style={styles.moreText}>
            +{item.exercises.length - 3} więcej...
          </ThemedText>
        )}
      </ThemedView>

      {/* Przyciski akcji */}
      <ThemedView style={styles.cardActions}>
        <Pressable onPress={() => openEditModal(item)} style={styles.actionButton}>
          <ThemedText style={styles.actionText}>✏️ Edytuj</ThemedText>
        </Pressable>
        <Pressable onPress={() => handleDelete(item)} style={styles.actionButton}>
          <ThemedText style={[styles.actionText, { color: '#e74c3c' }]}>🗑️ Usuń</ThemedText>
        </Pressable>
      </ThemedView>
    </Pressable>
  );

  // ============================================
  // WIDOKI STANÓW
  // ============================================

  // Stan ładowania
  if (loading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
        <ThemedText style={styles.loadingText}>Ładowanie treningów...</ThemedText>
      </ThemedView>
    );
  }

  // Stan błędu
  if (error) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText type="subtitle">⚠️ Błąd połączenia</ThemedText>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Pressable style={styles.retryButton} onPress={fetchWorkouts}>
          <ThemedText style={styles.retryText}>Spróbuj ponownie</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  // ============================================
  // GŁÓWNY WIDOK
  // ============================================

  return (
    <ThemedView style={styles.container}>
      {/* Nagłówek z przyciskiem dodawania */}
      <ThemedView style={styles.header}>
        <ThemedText type="title">🏋️ Treningi</ThemedText>
        <Pressable style={styles.addButton} onPress={openCreateModal}>
          <ThemedText style={styles.addButtonText}>+ Dodaj</ThemedText>
        </Pressable>
      </ThemedView>

      {/* Lista treningów lub komunikat o braku */}
      {workouts.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText type="subtitle">Brak treningów</ThemedText>
          <ThemedText style={styles.emptyText}>
            Kliknij &quot;+ Dodaj&quot; aby utworzyć pierwszy trening!
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={workouts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderWorkoutItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* ============================================ */}
      {/* MODAL FORMULARZA */}
      {/* ============================================ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fff' }]}>
          {/* Nagłówek modala */}
          <ThemedView style={styles.modalHeader}>
            <Pressable onPress={closeModal}>
              <ThemedText style={styles.cancelText}>Anuluj</ThemedText>
            </Pressable>
            <ThemedText type="subtitle">
              {editingWorkout ? 'Edytuj trening' : 'Nowy trening'}
            </ThemedText>
            <Pressable onPress={handleSave} disabled={saving}>
              <ThemedText style={[styles.saveText, saving && { opacity: 0.5 }]}>
                {saving ? '...' : 'Zapisz'}
              </ThemedText>
            </Pressable>
          </ThemedView>

          {/* Formularz */}
          <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
            {/* Pole: Tytuł */}
            <ThemedText style={styles.label}>Tytuł *</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="np. Push Day, Nogi, FBW"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />

            {/* Pole: Data */}
            <ThemedText style={styles.label}>Data *</ThemedText>
            <TextInput
              style={inputStyle}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              value={formData.date}
              onChangeText={(text) => setFormData({ ...formData, date: text })}
            />

            {/* Pole: Notatki */}
            <ThemedText style={styles.label}>Notatki</ThemedText>
            <TextInput
              style={[inputStyle, { height: 80 }]}
              placeholder="Opcjonalne uwagi..."
              placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              multiline
            />

            {/* Sekcja: Ćwiczenia */}
            <ThemedView style={styles.exercisesHeader}>
              <ThemedText style={styles.label}>Ćwiczenia *</ThemedText>
              <Pressable onPress={addExercise} style={styles.smallButton}>
                <ThemedText style={styles.smallButtonText}>+ Ćwiczenie</ThemedText>
              </Pressable>
            </ThemedView>

            {/* Lista ćwiczeń w formularzu */}
            {formData.exercises.map((exercise, exIndex) => (
              <ThemedView 
                key={exIndex} 
                style={[styles.exerciseCard, { backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#f5f5f5' }]}
              >
                {/* Nazwa ćwiczenia */}
                <ThemedView style={styles.exerciseHeader}>
                  <TextInput
                    style={[inputStyle, { flex: 1 }]}
                    placeholder="Nazwa ćwiczenia"
                    placeholderTextColor={colorScheme === 'dark' ? '#888' : '#999'}
                    value={exercise.name}
                    onChangeText={(text) => updateExercise(exIndex, 'name', text)}
                  />
                  {formData.exercises.length > 1 && (
                    <Pressable onPress={() => removeExercise(exIndex)} style={styles.deleteBtn}>
                      <ThemedText>✕</ThemedText>
                    </Pressable>
                  )}
                </ThemedView>

                {/* Serie ćwiczenia */}
                <ThemedText style={styles.setsLabel}>Serie:</ThemedText>
                {exercise.sets.map((set, setIndex) => (
                  <ThemedView key={setIndex} style={styles.setRow}>
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
                    {exercise.sets.length > 1 && (
                      <Pressable onPress={() => removeSet(exIndex, setIndex)} style={styles.deleteBtn}>
                        <ThemedText>✕</ThemedText>
                      </Pressable>
                    )}
                  </ThemedView>
                ))}
                
                {/* Przycisk dodawania serii */}
                <Pressable onPress={() => addSet(exIndex)} style={styles.addSetButton}>
                  <ThemedText style={styles.addSetText}>+ Seria</ThemedText>
                </Pressable>
              </ThemedView>
            ))}

            {/* Padding na dole formularza */}
            <ThemedView style={{ height: 100 }} />
          </ScrollView>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

// ============================================
// STYLE
// ============================================

const styles = StyleSheet.create({
  // Kontenery główne
  container: {
    flex: 1,
    paddingTop: 60,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  // Nagłówek
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  addButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  
  // Lista treningów
  listContent: {
    padding: 16,
    gap: 12,
  },
  
  // Karta treningu
  workoutCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  dateText: {
    fontSize: 14,
    opacity: 0.7,
  },
  notesText: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  exercisesList: {
    marginTop: 8,
    backgroundColor: 'transparent',
  },
  exerciseItem: {
    fontSize: 14,
    marginBottom: 4,
  },
  moreText: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
    backgroundColor: 'transparent',
  },
  actionButton: {
    padding: 4,
  },
  actionText: {
    fontSize: 14,
  },
  
  // Stany: ładowanie, błąd, pusty
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.8,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  
  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  cancelText: {
    color: '#e74c3c',
    fontSize: 16,
  },
  saveText: {
    color: '#0a7ea4',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Formularz
  formScroll: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  
  // Sekcja ćwiczeń
  exercisesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'transparent',
  },
  smallButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseCard: {
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  deleteBtn: {
    padding: 8,
  },
  
  // Serie
  setsLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  setNumber: {
    width: 30,
    fontSize: 12,
    opacity: 0.6,
  },
  setInput: {
    flex: 1,
    padding: 8,
    fontSize: 14,
  },
  addSetButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  addSetText: {
    color: '#0a7ea4',
    fontSize: 14,
  },
});
