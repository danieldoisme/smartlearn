FROM node:24-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy everything else
COPY . .

EXPOSE 5173

# Start dev server
CMD ["npm", "run", "dev", "--", "--host"]
