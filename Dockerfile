FROM node:22-alpine AS assets
RUN apk add --no-cache unzip
WORKDIR /src
COPY public-assets.zip.b64 ./
RUN base64 -d public-assets.zip.b64 > /tmp/public-assets.zip \
 && unzip -q /tmp/public-assets.zip -d /src

FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY --from=assets /src/public ./public
USER node
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.mjs"]
