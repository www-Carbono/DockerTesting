FROM node:18

WORKDIR /backend

COPY . .

RUN npm install
RUN apt-get update
RUN apt-get install -y ffmpeg
RUN apt-get clean 
RUN apt-get install -y ffmpeg




EXPOSE 3000

CMD  ["npm" , "start"]