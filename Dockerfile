# BUILDER
FROM node:14-alpine AS pandagainz-builder
WORKDIR /app
COPY . .
RUN npm install && node_modules/.bin/tsc

# DEPENDENCIES
FROM node:14-alpine AS pandagainz-dependencies
ENV NODE_ENV=production
WORKDIR /app
COPY . .
RUN apk update && apk upgrade && npm install --production

# FINAL IMAGE
FROM node:14-alpine AS pandagainz-final
ENV NODE_ENV=production
WORKDIR /app
COPY . .
COPY --from=pandagainz-builder ./app/lib ./lib
COPY --from=pandagainz-dependencies ./app/node_modules ./node_modules
EXPOSE 8080
CMD ["npm", "start"]
