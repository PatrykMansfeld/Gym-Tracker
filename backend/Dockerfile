# syntax=docker/dockerfile:1

FROM golang:1.22-alpine AS build
WORKDIR /app

# Copy module files first for better caching
COPY backend/go.mod ./go.mod
RUN go mod download || true

# Copy the backend source
COPY backend/. .

# Build static Linux binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /bin/gym-api ./

# Minimal, secure runtime image
FROM gcr.io/distroless/static-debian12 AS runtime
ENV PORT=8080
EXPOSE 8080
USER nonroot:nonroot
COPY --from=build /bin/gym-api /gym-api
ENTRYPOINT ["/gym-api"]
