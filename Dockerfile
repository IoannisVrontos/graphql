# ---------- Build stage ----------
FROM golang:1.23.3-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

# Copy Go module files (module root = server/)
COPY server/go.mod ./

RUN go mod download

# Copy full source
COPY server/ ./

# Build binary (IMPORTANT: build current module)
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -o app .


# ---------- Runtime stage ----------
FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates

# Copy binary
COPY --from=builder /app/app .

# Copy runtime assets
COPY templates ./templates
COPY static ./static
COPY scripts ./scripts

ENV PORT=8080
EXPOSE 8080

CMD ["./app"]
