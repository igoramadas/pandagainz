# BUILDER
FROM node:alpine AS pandagainz-builder
WORKDIR /app
COPY . .
RUN apk update && apk upgrade && npm install

# FINAL IMAGE
FROM node:alpine AS pandagainz-final
WORKDIR /app
COPY . .
COPY --from=pandagainz-builder ./app/lib ./lib
RUN npm install --production && npm cache clean
EXPOSE 8080
CMD ["npm", "start"]
