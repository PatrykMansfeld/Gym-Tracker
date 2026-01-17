package httpjson

import (
	"encoding/json"
	"net/http"

	"gym-api/internal/models"
)

// WriteJSON zapisuje payload jako JSON z podanym statusem HTTP.
func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// WriteError opakowuje błąd w spójny format JSON {"error": ...}.
func WriteError(w http.ResponseWriter, status int, msg string) {
	WriteJSON(w, status, models.APIError{Error: msg})
}

// ReadJSON parsuje body żądania do podanej struktury i blokuje nieznane pola.
func ReadJSON(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(dst)
}
