FROM node:24-slim
RUN useradd -ms /bin/sh -u 1001 app
WORKDIR /app
COPY package*.json .
RUN npm install
COPY --chown=app:app . .
CMD ["npm", "run", "start:dev"] 
