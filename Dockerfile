FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
ENV PORT=4321
EXPOSE 4321
CMD ["node", "server.js"]
