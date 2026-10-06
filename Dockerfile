FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm build
ENV NODE_ENV=production DB_PATH=/data/imovken.db
VOLUME /data
EXPOSE 3000
CMD ["node", "server/index.ts"]
