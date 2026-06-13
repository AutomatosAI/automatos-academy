# Automatos Academy — single-stage, no build (vanilla SPA + Express).
# Mirrors automatos-ai-landingV2's Dockerfile so Railway builds it the same
# way — drop-in, no config drift.

FROM node:20-alpine

WORKDIR /app

# Production deps only. No build step — the frontend is static, no compile.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy the rest (public/ static SPA + content JSON, server.js).
COPY . .

# Railway sets PORT; default to 80 in case of bare container runs.
ENV PORT=80
EXPOSE 80

CMD ["node", "server.js"]
