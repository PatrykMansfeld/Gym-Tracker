package server

import "gym-api/internal/store"

// Server agreguje zależności aplikacji (tu: magazyn treningów)
// i jest przekazywany do handlerów HTTP.
type Server struct {
	Workouts *store.WorkoutStore
}

// New tworzy nowy obiekt serwera z wstrzykniętym magazynem treningów.
func New(workouts *store.WorkoutStore) *Server {
	return &Server{Workouts: workouts}
}
