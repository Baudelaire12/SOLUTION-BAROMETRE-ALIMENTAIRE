# ---- Frontend : application Next.js (Baromètre Alimentaire) ----
FROM node:20-slim AS builder
WORKDIR /app

# URL publique du backend, injectée au build (variable NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

COPY package.json package-lock.json* .npmrc* ./
RUN npm install
COPY . .
RUN npm run build

# ---- Image d'exécution minimale (standalone) ----
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
