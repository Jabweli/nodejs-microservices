FROM node:18-alpine3.21

WORKDIR /use/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3002

CMD ["node", "src/server.js"]