FROM tannguyen/opencv4nodejs:latest

WORKDIR /app

COPY ./package.json /app/package.json
RUN npm install -g nodemon && npm install
RUN node -v

COPY ./src /app/src

EXPOSE 8000

CMD ["nodemon", "-L", "./src/server.js"]