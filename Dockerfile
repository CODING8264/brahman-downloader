# 1️⃣ Use official Node 20 image
FROM node:20

# 2️⃣ Set working directory
WORKDIR /app

# 3️⃣ Install YT-DLP globally
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

# 4️⃣ Copy package.json and package-lock.json first for caching
COPY package*.json ./

# 5️⃣ Install dependencies
RUN npm install

# 6️⃣ Copy rest of the project
COPY . .

# 7️⃣ Generate Prisma client (only if schema exists)
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

# 8️⃣ Build Next.js app
RUN npm run build

# 9️⃣ Expose port (optional, Railway overrides with $PORT)
EXPOSE 3000

# 🔟 Start the server with dynamic port
CMD ["sh", "-c", "PORT=${PORT:-3000} node .next/standalone/server.js"]