package main

import (
	"log"
	"net/http"

	"gym-api/internal/handlers"
	"gym-api/internal/server"
	"gym-api/internal/store"
)

// main uruchamia serwer HTTP i rejestruje endpointy aplikacji.
// W pamięci trzymamy proste "store" na treningi (bez bazy danych).
func main() {
	// Inicjalizacja pamięciowego magazynu i serwisu,
	// który przekazujemy do handlerów HTTP.
	workoutStore := store.NewWorkoutStore()
	srv := server.New(workoutStore)

	// Router oparty o http.ServeMux i ścieżki z prefixem.
	mux := http.NewServeMux()

	// Prosty endpoint zdrowotny.
	mux.Handle("/health", handlers.NewHealthHandler())
	// Kolekcja treningów: GET (lista), POST (dodanie).
	mux.Handle("/workouts", handlers.NewWorkoutsHandler(srv))
	// Pojedynczy trening po ID: GET, PUT, DELETE.
	mux.Handle("/workouts/", handlers.NewWorkoutByIDHandler(srv))

	log.Println("Gym API startuje na http://localhost:8080")
	// Start serwera z prostym CORS middleware; w przypadku błędu zatrzymujemy program.
	log.Fatal(http.ListenAndServe(":8080", withCORS(mux)))
}

// withCORS dodaje nagłówki CORS i obsługuje preflight (OPTIONS) dla żądań z przeglądarki.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			// Preflight nie wymaga body
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
