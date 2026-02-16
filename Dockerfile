# 1. Use official Node.js LTS image
FROM node:20

# 2. Set working directory
WORKDIR /app

# 3. Install yt-dlp globally
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

# 4. Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# 5. Install dependencies
RUN npm install

# 6. Copy the rest of your project
COPY . .

# 7. Build Next.js app
RUN npm run build

# 8. Expose the port Railway will use
EXPOSE 8080

# 9. Start server using the standalone output
CMD ["node", ".next/standalone/server.js"]