FROM node:16
WORKDIR C:/_LA.Workstation/_LA.Environment.Sync
COPY package*.json ./
RUN npm install pm2 -g
RUN npm install
# Bundle app source
COPY . .

CMD [ "pm2", "main/timer.js" ]