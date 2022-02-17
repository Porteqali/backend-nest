FROM node:16-alpine As builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm cache verify
RUN npm ci

COPY . .

RUN npm run build && npm prune --production

# ----------------------

FROM node:16-alpine

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules/ ./node_modules/
COPY --from=builder /usr/src/app/dist ./dist/

CMD ["node", "dist/main"]