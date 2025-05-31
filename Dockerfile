# 1. Pick a Node base image with Debian under the hood:
    FROM node:18-bullseye

    # 2. Install Python 3 and pip (Debian package names):
    RUN apt-get update && \
        apt-get install -y python3 python3-pip && \
        rm -rf /var/lib/apt/lists/*
    
    # 3. Install yt-dlp globally via pip3:
    RUN pip3 install yt-dlp
    
    # 4. Create/app directory
    WORKDIR /usr/src/app
    
    # 5. Copy package.json and lockfile first (to leverage Docker cache)
    COPY package*.json ./
    
    # 6. Install Node dependencies
    RUN npm ci
    
    # 7. Copy the rest of your Next.js source code
    COPY . .
    
    # 8. Build the Next.js app
    RUN npm run build
    
    # 9. Expose port (optional; Render uses PORT env var at runtime)
    EXPOSE 3000
    
    # 10. Tell Docker how to start your app in production
    CMD ["npm", "run", "start"]
    