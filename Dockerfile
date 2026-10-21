# Build the static frontend.
FROM node:22-alpine AS web

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Build the tiny Go static server.
FROM golang:1.23-alpine AS server

WORKDIR /src

COPY server/go.mod ./
COPY server/main.go ./
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /quiphuts .

# Runtime image: the binary plus the built static files.
FROM alpine:3.20

RUN addgroup -S app && adduser -S -G app app

WORKDIR /app

COPY --from=web /app/dist ./public
COPY --from=server /quiphuts /quiphuts

ENV PORT=8080
ENV PUBLIC_DIR=/app/public

USER app
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1

ENTRYPOINT ["/quiphuts"]
