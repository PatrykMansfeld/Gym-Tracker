/**
 * Serwis API do komunikacji z backendem Go
 * Zawiera funkcje CRUD dla treningów
 */

// Konfiguracja API - zmień na swój adres IP jeśli testujesz na urządzeniu fizycznym
// Dla emulatora Android użyj: http://10.0.2.2:8080
// Dla symulatora iOS / web: http://localhost:8080
const API_URL = 'http://localhost:8080';

// ============================================
// TYPY DANYCH (zgodne z backendem Go)
// ============================================

/** Pojedyncza seria ćwiczenia */
export interface Set {
  reps: number;      // Liczba powtórzeń
  weight?: number;   // Ciężar w kg (opcjonalnie)
}

/** Pojedyncze ćwiczenie w treningu */
export interface Exercise {
  name: string;      // Nazwa ćwiczenia (np. "Wyciskanie sztangi")
  sets: Set[];       // Lista serii
}

/** Pełny obiekt treningu zwracany z API */
export interface Workout {
  id: number;
  title: string;
  date: string;          // Format: YYYY-MM-DD
  notes: string;
  exercises: Exercise[];
  createdAt: string;
  updatedAt: string;
}

/** Request do tworzenia nowego treningu */
export interface CreateWorkoutRequest {
  title: string;
  date: string;
  notes?: string;
  exercises: Exercise[];
}

/** Request do aktualizacji treningu (wszystkie pola opcjonalne) */
export interface UpdateWorkoutRequest {
  title?: string;
  date?: string;
  notes?: string;
  exercises?: Exercise[];
}

// ============================================
// FUNKCJE API
// ============================================

/**
 * Pobiera listę wszystkich treningów
 * GET /workouts
 */
export async function getWorkouts(): Promise<Workout[]> {
  const response = await fetch(`${API_URL}/workouts`);
  if (!response.ok) {
    throw new Error('Nie udało się pobrać treningów');
  }
  return response.json();
}

/**
 * Pobiera pojedynczy trening po ID
 * GET /workouts/:id
 */
export async function getWorkout(id: number): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts/${id}`);
  if (!response.ok) {
    throw new Error('Nie znaleziono treningu');
  }
  return response.json();
}

/**
 * Tworzy nowy trening
 * POST /workouts
 */
export async function createWorkout(workout: CreateWorkoutRequest): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workout),
  });
  if (!response.ok) {
    throw new Error('Nie udało się utworzyć treningu');
  }
  return response.json();
}

/**
 * Aktualizuje istniejący trening
 * PUT /workouts/:id
 */
export async function updateWorkout(id: number, workout: UpdateWorkoutRequest): Promise<Workout> {
  const response = await fetch(`${API_URL}/workouts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(workout),
  });
  if (!response.ok) {
    throw new Error('Nie udało się zaktualizować treningu');
  }
  return response.json();
}

/**
 * Usuwa trening po ID
 * DELETE /workouts/:id
 * Backend zwraca 204 No Content przy sukcesie
 */
export async function deleteWorkout(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/workouts/${id}`, {
    method: 'DELETE',
  });
  // 204 No Content oznacza sukces
  if (!response.ok && response.status !== 204) {
    throw new Error('Nie udało się usunąć treningu');
  }
}

/**
 * Sprawdza czy API działa
 * GET /health
 */
export async function checkHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/health`);
  return response.json();
}
