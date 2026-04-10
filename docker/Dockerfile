FROM oven/bun:1.3.11 AS build

WORKDIR /app

COPY package.json bun.lock tsconfig.base.json tsconfig.json zeroshot.app.toml ./
COPY cli ./cli
COPY backend ./backend
COPY frontend ./frontend
COPY scripts ./scripts
COPY Makefile README.md ./

RUN bun install --frozen-lockfile
RUN rm -f backend/tsconfig.tsbuildinfo cli/tsconfig.tsbuildinfo frontend/tsconfig.tsbuildinfo tsconfig.tsbuildinfo
RUN bun run build

FROM oven/bun:1.3.11 AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV ZEROSHOT_BOOTSTRAP_ROOTS=/project

COPY --from=build /app /app

EXPOSE 3000

CMD ["bun", "run", "serve", "--root=/project"]
