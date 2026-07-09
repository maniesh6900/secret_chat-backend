FROM node:slim

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 3030

CMD npm start
