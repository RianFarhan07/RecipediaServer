FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

RUN pnpm exec prisma generate
RUN pnpm run build
RUN ls -la /app/dist/

EXPOSE 8000

CMD ["sh", "-c", "pnpm run migrate:deploy && node /app/dist/main.js"]