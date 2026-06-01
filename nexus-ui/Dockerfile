FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 5173

# Start Vite dev server exposing hosts
CMD ["npm", "run", "dev", "--", "--host"]
