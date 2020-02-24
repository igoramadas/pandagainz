# BUILDER
FROM node:alpine AS pandagainz-builder
WORKDIR /app
COPY . .
RUN apk update && apk upgrade && npm install && npm install typescript -g
RUN node_modules/.bin/tsc

# FINAL IMAGE
FROM node:alpine AS pandagainz-final
ENV NODE_ENV=production
WORKDIR /app
COPY . .
COPY --from=pandagainz-builder ./app/lib ./lib
RUN npm install --production && npm cache clean
EXPOSE 8080
CMD ["npm", "start"]
