FROM node:20-alpine AS builder

# better-sqlite3 требует сборки
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY *.ts ./
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist


ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
