# Use Node.js 20 as base image
FROM node:20

# Set working directory
WORKDIR /app

# Install yt-dlp binary globally
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp

# Copy package.json and package-lock.json (or just package.json)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY . .

# Build the Next.js app
RUN npm run build

# Expose port Railway will use
EXPOSE 8080

# Start the standalone server
CMD ["node", ".next/standalone/server.js"]