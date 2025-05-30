FROM node:18-alpine3.21

WORKDIR /use/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "src/server.js"]