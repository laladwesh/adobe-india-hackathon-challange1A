# Use an official Node.js runtime as the base image.
# Using Alpine Linux for a smaller image size.
FROM node:18-alpine

# Set the working directory inside the container.
WORKDIR /app

# Copy package.json and package-lock.json (if it exists)
# This leverages Docker's layer caching.
COPY package*.json ./

# Install project dependencies.
RUN npm install

# Copy the rest of your application's source code into the container.
COPY . .

# The command to run your application when the container starts.
# This will execute the Node.js script.
CMD ["node", "index.js"]
