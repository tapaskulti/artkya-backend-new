FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies ()install the same package .json version
RUN npm ci

# Copy the rest of the application
COPY . .


# Expose the application port
EXPOSE 6600

# Start the application
CMD ["npm", "start"]

# RUN npm run build