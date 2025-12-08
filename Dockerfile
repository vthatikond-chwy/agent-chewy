FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Make the CLI executable
RUN chmod +x src/cli/index.ts

# Set up environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--import tsx"

# Default command - interactive shell
CMD ["/bin/bash"]

