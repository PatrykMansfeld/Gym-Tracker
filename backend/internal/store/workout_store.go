package store

import (
	"errors"
	"sync"
	"time"

	"gym-api/internal/models"
)

// WorkoutStore to prosty, bezpieczny współbieżnie magazyn treningów w pamięci.
type WorkoutStore struct {
	mu       sync.RWMutex
	nextID   int
	workouts map[int]models.Workout
}

// NewWorkoutStore inicjalizuje pusty magazyn z pierwszym ID = 1.
func NewWorkoutStore() *WorkoutStore {
	return &WorkoutStore{
		nextID:   1,
		workouts: make(map[int]models.Workout),
	}
}

// Create dodaje nowy trening, nadaje ID i znaczniki czasu.
func (s *WorkoutStore) Create(w models.Workout) models.Workout {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	w.ID = s.nextID
	w.CreatedAt = now
	w.UpdatedAt = now

	s.workouts[w.ID] = w
	s.nextID++

	return w
}

// List zwraca kopię listy treningów w formie slice.
func (s *WorkoutStore) List() []models.Workout {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make([]models.Workout, 0, len(s.workouts))
	for _, v := range s.workouts {
		out = append(out, v)
	}
	return out
}

// Get pobiera trening po ID. Drugi zwracany parametr informuje, czy znaleziono.
func (s *WorkoutStore) Get(id int) (models.Workout, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	w, ok := s.workouts[id]
	return w, ok
}

// Update modyfikuje istniejący trening używając podanej funkcji i aktualizuje znacznik czasu.
func (s *WorkoutStore) Update(id int, upd func(current models.Workout) models.Workout) (models.Workout, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	cur, ok := s.workouts[id]
	if !ok {
		return models.Workout{}, errors.New("not found")
	}

	cur = upd(cur)
	cur.UpdatedAt = time.Now()
	s.workouts[id] = cur

	return cur, nil
}

// Delete usuwa trening po ID i zwraca informację o powodzeniu.
func (s *WorkoutStore) Delete(id int) bool {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.workouts[id]; !ok {
		return false
	}
	delete(s.workouts, id)
	return true
}
