FROM node:16-alpine

ARG APP_ENV
ENV APP_ENV=${APP_ENV}

COPY . /app
WORKDIR /app

RUN yarn install

CMD yarn start
