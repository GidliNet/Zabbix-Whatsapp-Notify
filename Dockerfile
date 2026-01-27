# Use an official Node.js LTS image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install 

# Copy the rest of the app
COPY . .

# Set environment variable for port (optional)
ENV PORT=3000

# Expose the port your Express app runs on
EXPOSE 3000

# Start the server
CMD ["node", "index.js"]
