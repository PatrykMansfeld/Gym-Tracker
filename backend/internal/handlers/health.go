package handlers

import (
	"net/http"

	"gym-api/internal/httpjson"
)

type HealthHandler struct{}

// NewHealthHandler zwraca handler do sprawdzania zdrowia aplikacji.
func NewHealthHandler() *HealthHandler { return &HealthHandler{} }

// ServeHTTP odpisuje 200 OK oraz prosty JSON ze statusem.
func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	httpjson.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
