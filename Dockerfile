# Stage 1: Build admin UI
FROM node:22-alpine AS admin-builder
WORKDIR /admin-ui
COPY admin-ui/package*.json ./
RUN npm ci
COPY admin-ui/ ./
RUN npm run build

# Stage 2: Build NestJS API
FROM node:22-alpine AS api-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 3: Production image
FROM node:22-alpine AS production
WORKDIR /app
COPY --from=api-builder /app/package*.json ./
RUN npm ci --omit=dev
COPY --from=api-builder /app/dist ./dist
COPY --from=admin-builder /admin-ui/dist ./admin-ui/dist
EXPOSE 3000
CMD ["node", "dist/main"]
