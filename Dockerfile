# Use Node.js 22 Alpine for smaller image
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install

# Copy application code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run Vite dev server with host flag to accept external connections
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
