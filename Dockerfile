# Build the runtrace comparison dashboard and serve it as static files.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build:web

FROM nginx:alpine
COPY --from=build /app/web-dist /usr/share/nginx/html
EXPOSE 80
# nginx:alpine already runs: nginx -g 'daemon off;'
