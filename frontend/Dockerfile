FROM node:24-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json tsconfig.json ./
RUN npm ci
RUN npm install @rollup/rollup-linux-x64-musl

# Copy all project files
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:24-alpine AS production

WORKDIR /app

# Передаем переменные окружения в продакшн
ENV PORT=3000
ENV NODE_ENV=production

# Copy built assets from build stage
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/build ./build
COPY --from=build /app/node_modules ./node_modules

# Expose the port
EXPOSE 3001

# Start the application
CMD ["node", "build"]