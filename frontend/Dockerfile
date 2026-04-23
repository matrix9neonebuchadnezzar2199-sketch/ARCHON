# ─── ARCHON frontend (build + nginx) ───
FROM node:20-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` can fail in Linux when the lock was generated on Windows (optional deps, e.g. @emnapi/* for other platforms are missing in the lockfile). Install on Linux to resolve the correct tree.
RUN npm install --no-audit --no-fund
COPY . .

# Backend is proxied by nginx in production
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
