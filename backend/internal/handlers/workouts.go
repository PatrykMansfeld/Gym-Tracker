package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"gym-api/internal/httpjson"
	"gym-api/internal/models"
	"gym-api/internal/server"
)

type WorkoutsHandler struct {
	srv *server.Server
}

// NewWorkoutsHandler obsługuje operacje na kolekcji treningów:
// - GET /workouts: zwraca listę wszystkich treningów
// - POST /workouts: tworzy nowy trening na podstawie JSON-a
func NewWorkoutsHandler(srv *server.Server) *WorkoutsHandler {
	return &WorkoutsHandler{srv: srv}
}

// /workouts -> GET(list), POST(create)
// ServeHTTP rozpoznaje metodę HTTP i deleguje logikę.
func (h *WorkoutsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		// Zwracamy całą listę zapisanych treningów (w pamięci).
		httpjson.WriteJSON(w, http.StatusOK, h.srv.Workouts.List())
		return

	case http.MethodPost:
		// Parsowanie JSON-a żądania do struktury CreateWorkoutRequest.
		var req models.CreateWorkoutRequest
		if err := httpjson.ReadJSON(r, &req); err != nil {
			httpjson.WriteError(w, http.StatusBadRequest, "Invalid JSON")
			return
		}

		req.Title = strings.TrimSpace(req.Title)
		req.Date = strings.TrimSpace(req.Date)
		req.Notes = strings.TrimSpace(req.Notes)

		if req.Title == "" {
			httpjson.WriteError(w, http.StatusBadRequest, "title is required")
			return
		}
		if req.Date == "" {
			httpjson.WriteError(w, http.StatusBadRequest, "date is required (YYYY-MM-DD)")
			return
		}
		if _, err := time.Parse("2006-01-02", req.Date); err != nil {
			httpjson.WriteError(w, http.StatusBadRequest, "date must be YYYY-MM-DD")
			return
		}
		if err := validateExercises(req.Exercises); err != "" {
			httpjson.WriteError(w, http.StatusBadRequest, err)
			return
		}

		// Jeśli dane poprawne, tworzymy nowy obiekt treningu i zapisujemy w store.
		wk := models.Workout{
			Title:     req.Title,
			Date:      req.Date,
			Notes:     req.Notes,
			Exercises: req.Exercises,
		}
		created := h.srv.Workouts.Create(wk)
		httpjson.WriteJSON(w, http.StatusCreated, created)
		return

	default:
		httpjson.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

type WorkoutByIDHandler struct {
	srv *server.Server
}

// NewWorkoutByIDHandler obsługuje operacje na pojedynczym treningu po ID:
// - GET /workouts/{id}
// - PUT /workouts/{id}
// - DELETE /workouts/{id}
func NewWorkoutByIDHandler(srv *server.Server) *WorkoutByIDHandler {
	return &WorkoutByIDHandler{srv: srv}
}

// /workouts/{id} -> GET(read), PUT(update), DELETE(delete)
func (h *WorkoutByIDHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	id, ok := parseWorkoutID(r.URL.Path)
	if !ok {
		httpjson.WriteError(w, http.StatusNotFound, "Not found")
		return
	}

	switch r.Method {
	case http.MethodGet:
		// Pobranie konkretnego treningu.
		wk, found := h.srv.Workouts.Get(id)
		if !found {
			httpjson.WriteError(w, http.StatusNotFound, "Workout not found")
			return
		}
		httpjson.WriteJSON(w, http.StatusOK, wk)
		return

	case http.MethodPut:
		// Parsujemy żądanie update i przygotowujemy bezpieczną modyfikację.
		var req models.UpdateWorkoutRequest
		if err := httpjson.ReadJSON(r, &req); err != nil {
			httpjson.WriteError(w, http.StatusBadRequest, "Invalid JSON")
			return
		}

		// Fetch current workout without mutating store yet
		cur, found := h.srv.Workouts.Get(id)
		if !found {
			httpjson.WriteError(w, http.StatusNotFound, "Workout not found")
			return
		}

		// Modyfikacje wykonujemy na kopii, aby nie zepsuć stanu przy błędach walidacji.
		updated := cur
		if req.Title != nil {
			updated.Title = strings.TrimSpace(*req.Title)
		}
		if req.Date != nil {
			updated.Date = strings.TrimSpace(*req.Date)
		}
		if req.Notes != nil {
			updated.Notes = strings.TrimSpace(*req.Notes)
		}
		if req.Exercises != nil {
			updated.Exercises = *req.Exercises
		}

		// Walidacja danych zanim cokolwiek zapiszemy.
		updated.Title = strings.TrimSpace(updated.Title)
		updated.Date = strings.TrimSpace(updated.Date)
		if updated.Title == "" {
			httpjson.WriteError(w, http.StatusBadRequest, "title cannot be empty")
			return
		}
		if updated.Date == "" {
			httpjson.WriteError(w, http.StatusBadRequest, "date cannot be empty")
			return
		}
		if _, err := time.Parse("2006-01-02", updated.Date); err != nil {
			httpjson.WriteError(w, http.StatusBadRequest, "date must be YYYY-MM-DD")
			return
		}
		if errMsg := validateExercises(updated.Exercises); errMsg != "" {
			httpjson.WriteError(w, http.StatusBadRequest, errMsg)
			return
		}

		// Zapisujemy poprawny stan atomowo w store.
		final, err := h.srv.Workouts.Update(id, func(cur models.Workout) models.Workout {
			return updated
		})
		if err != nil {
			httpjson.WriteError(w, http.StatusNotFound, "Workout not found")
			return
		}

		httpjson.WriteJSON(w, http.StatusOK, final)
		return

	case http.MethodDelete:
		// Usuwamy trening po ID.
		if !h.srv.Workouts.Delete(id) {
			httpjson.WriteError(w, http.StatusNotFound, "Workout not found")
			return
		}
		w.WriteHeader(http.StatusNoContent)
		return

	default:
		httpjson.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
	}
}

func parseWorkoutID(path string) (int, bool) {
	// oczekujemy /workouts/{id}
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) != 2 || parts[0] != "workouts" {
		return 0, false
	}
	id, err := strconv.Atoi(parts[1])
	if err != nil || id <= 0 {
		return 0, false
	}
	return id, true
}

func validateExercises(exercises []models.Exercise) string {
	// dozwalamy pustą listę, ale w praktyce trening zwykle ma ćwiczenia
	// jak chcesz wymusić minimum 1 ćwiczenie, odkomentuj:
	// if len(exercises) == 0 { return "exercises must have at least 1 exercise" }

	for i, ex := range exercises {
		name := strings.TrimSpace(ex.Name)
		if name == "" {
			return "exercise name is required (at index " + strconv.Itoa(i) + ")"
		}
		if len(ex.Sets) == 0 {
			return "exercise sets must have at least 1 set for: " + name
		}
		for si, set := range ex.Sets {
			if set.Reps <= 0 {
				return "reps must be > 0 for exercise: " + name + ", set index " + strconv.Itoa(si)
			}
			if set.Weight != nil && *set.Weight < 0 {
				return "weight must be >= 0 for exercise: " + name + ", set index " + strconv.Itoa(si)
			}
		}
	}
	return ""
}
