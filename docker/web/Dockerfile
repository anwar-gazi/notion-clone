FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends     python3 build-essential openssl ca-certificates git &&     rm -rf /var/lib/apt/lists/*

WORKDIR /app
EXPOSE 3000
