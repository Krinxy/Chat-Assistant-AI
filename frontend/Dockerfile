# Dev image: runs the Vite dev server with hot-reload against a bind-mounted repo.
# Used by docker-compose.dev.yml — for a production build, run `npm run build` and
# serve the resulting frontend/dist/ behind a static file server / reverse proxy instead.
FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
