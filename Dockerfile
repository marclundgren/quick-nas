FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY server.js ./
COPY lib ./lib
COPY plugins ./plugins
COPY public ./public

# Create data directory
RUN mkdir -p /data

# Expose port
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV UPLOAD_DIR=/data

# Start server
CMD ["node", "server.js"]
