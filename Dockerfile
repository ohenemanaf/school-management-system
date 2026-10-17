# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node backend/server.js backend/seed.js ./
COPY --chown=node:node backend/src/ ./src/
COPY --from=frontend-build --chown=node:node /build/frontend/dist/ /app/frontend/dist/
RUN mkdir -p public/uploads/profiles public/uploads/library && chown -R node:node public
USER node
EXPOSE 5000
CMD ["node", "server.js"]
