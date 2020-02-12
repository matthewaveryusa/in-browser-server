FROM node:alpine
RUN mkdir -p /app/data && chown -R node:node /app
WORKDIR /app
COPY --chown=node:node . .
CMD [ "node", "server.js"]
