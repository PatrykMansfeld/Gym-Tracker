package models

import "time"

// Workout = pojedynczy trening
type Workout struct {
	ID        int        `json:"id"`
	Title     string     `json:"title"`     // np. "Push day", "Nogi", "FBW"
	Date      string     `json:"date"`      // ISO: "2026-01-16" (proste i czytelne)
	Notes     string     `json:"notes"`     // opcjonalne
	Exercises []Exercise `json:"exercises"` // lista ćwiczeń
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

// Exercise = jedno ćwiczenie w treningu
type Exercise struct {
	Name string `json:"name"` // np. "Bench Press"
	Sets []Set  `json:"sets"` // serie
}

// Set = pojedyncza seria
type Set struct {
	Reps   int      `json:"reps"`             // ilość powtórzeń
	Weight *float64 `json:"weight,omitempty"` // kg, opcjonalnie
}

// Requesty (oddzielamy od modelu)
type CreateWorkoutRequest struct {
	Title     string     `json:"title"`
	Date      string     `json:"date"` // "YYYY-MM-DD"
	Notes     string     `json:"notes"`
	Exercises []Exercise `json:"exercises"`
}

type UpdateWorkoutRequest struct {
	Title     *string     `json:"title,omitempty"`
	Date      *string     `json:"date,omitempty"`
	Notes     *string     `json:"notes,omitempty"`
	Exercises *[]Exercise `json:"exercises,omitempty"`
}

type APIError struct {
	Error string `json:"error"`
}

// Uwaga: struktury CreateWorkoutRequest i UpdateWorkoutRequest są odseparowane od modelu,
// aby jasno zdefiniować, jakie pola klient może wysłać przy tworzeniu/aktualizacji.
// Dzięki temu walidacja i ewolucja API są prostsze.
