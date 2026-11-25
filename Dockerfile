FROM node:22-alpine AS assets
RUN apk add --no-cache unzip
WORKDIR /src
COPY assets-*.b64 ./
RUN cat assets-01.b64 assets-02.b64 assets-03.b64 assets-03a2.b64 assets-03b.b64 assets-04.b64 > /tmp/public-assets.zip.b64 \
 && base64 -d /tmp/public-assets.zip.b64 > /tmp/public-assets.zip \
 && unzip -tq /tmp/public-assets.zip \
 && unzip -q /tmp/public-assets.zip -d /src

FROM node:22-alpine
WORKDIR /app
COPY package.json server.mjs ./
COPY --from=assets /src/public ./public
USER node
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.mjs"]
