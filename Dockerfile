# 1. Use official Node.js LTS image
FROM node:20

# 2. Set working directory
WORKDIR /app

# 3. Install yt-dlp globally
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

# 4. Copy package.json and package-lock.json
COPY package*.json ./

# 5. Install dependencies
RUN npm install

# 6. Generate Prisma client
RUN npx prisma generate

# 7. Copy the rest of your project
COPY . .

# 8. Build Next.js app
RUN npm run build

# 9. Expose port
EXPOSE 8080

# 10. Start server
CMD ["node", ".next/standalone/server.js"]