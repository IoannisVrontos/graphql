package proxy

import (
	"bytes"
	"io"
	"log"
	"net/http"
)

// Proxy GraphQL requests
func GraphQLProxy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		log.Println("Read body error:", err)
		return
	}

	req, err := http.NewRequest("POST", "https://platform.zone01.gr/api/graphql-engine/v1/graphql", bytes.NewBuffer(body))
	if err != nil {
		http.Error(w, "Failed to create GraphQL request", http.StatusInternalServerError)
		log.Println("Request creation error:", err)
		return
	}
	req.Header.Set("Content-Type", "application/json")

	// Pass along the JWT
	if token := r.Header.Get("Authorization"); token != "" {
		req.Header.Set("Authorization", token)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to reach GraphQL API", http.StatusBadGateway)
		log.Println("HTTP request error:", err)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	if _, err := io.Copy(w, resp.Body); err != nil {
		log.Println("Failed to copy response:", err)
	}
}
