# 1. Use Node 20
FROM node:20

# 2. Set working directory
WORKDIR /app

# 3. Install yt-dlp globally
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

# 4. Copy package.json & package-lock.json first for caching
COPY package*.json ./

# 5. Install dependencies
RUN npm install

# 6. Copy Prisma schema and .env (if using DATABASE_URL)
COPY prisma ./prisma
COPY .env .env

# 7. Generate Prisma client
RUN npx prisma generate

# 8. Copy the rest of your project
COPY . .

# 9. Build Next.js project
RUN npm run build

# 10. Expose port (default Railway port or your app port)
EXPOSE 8080

# 11. Start the server
CMD ["node", ".next/standalone/server.js"]