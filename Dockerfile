FROM node:20
WORKDIR /app

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp

COPY package*.json ./
RUN npm install

# Copy the rest of the code
COPY . .

# Only generate Prisma client if schema exists
RUN if [ -f prisma/schema.prisma ]; then npx prisma generate; fi

RUN npm run build

EXPOSE 3000
CMD ["sh", "-c", "PORT=${PORT:-3000} node .next/standalone/server.js"]