FROM node:24-alpine

WORKDIR /app

# Copy package descriptors from the context root
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy only the frontend directory as a subdirectory
COPY frontend/ ./frontend/

EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host"]
