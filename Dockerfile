FROM node:18

# Create app directory
WORKDIR /app

# Install app dependencies
COPY package.json /app
COPY package-lock.json /app
RUN npm install

# Bundle app source
COPY . /app

# Expose the port the app runs on
EXPOSE 3000

# Serve the app
CMD ["npm", "run", "start"]