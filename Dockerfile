FROM node:18-alpine AS builder
RUN npm i -g pnpm
WORKDIR /app
COPY ./package.json ./
COPY . .
RUN pnpm install
RUN pnpm run build


FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3001
CMD ["npm", "run", "start:prod"]
