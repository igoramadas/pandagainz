FROM node:alpine AS pandagainz-image
WORKDIR /app
COPY . .
COPY --from=pandagainz-builder ./app/lib ./lib
RUN apk update && apk upgrade && npm install --production
EXPOSE 8080
CMD ["npm", "start"]
