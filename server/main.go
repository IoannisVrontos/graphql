package main

import (
	"html/template"
	"log"
	"net/http"
	"path/filepath"

	"graphQL/handlers"
	"graphQL/proxy"
)

func main() {
	// Serve static files
	http.Handle("/static/", http.StripPrefix("/static/", http.FileServer(http.Dir("../static"))))
	http.Handle("/scripts/", http.StripPrefix("/scripts/", http.FileServer(http.Dir("../scripts"))))

	// Routes
	http.HandleFunc("/", serveTemplate("index.html"))
	http.HandleFunc("/profile", serveTemplate("profile.html"))
	http.HandleFunc("/login", handlers.HandleLogin)
	http.HandleFunc("/graphql", proxy.GraphQLProxy)

	log.Println("Server running on http://localhost:8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		log.Fatal("Server failed:", err)
	}
}

// Helper to serve templates with error handling
func serveTemplate(filename string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tmplPath := filepath.Join("../templates", filename)
		tmpl, err := template.ParseFiles(tmplPath)
		if err != nil {
			http.Error(w, "Failed to load template", http.StatusInternalServerError)
			log.Println("Template parse error:", err)
			return
		}
		if err := tmpl.Execute(w, nil); err != nil {
			http.Error(w, "Failed to render template", http.StatusInternalServerError)
			log.Println("Template execute error:", err)
			return
		}
	}
}
