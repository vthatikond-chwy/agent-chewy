# Docker Setup for Agent-Chewy

This guide explains how to run Agent-Chewy in Docker with an interactive terminal.

## Prerequisites

- Docker installed and running
- Docker Compose installed

## Quick Start

### Option 1: Using the Interactive Script (Recommended)

```bash
./docker-interactive.sh
```

This script will:
- Build the Docker image if needed
- Start the container in interactive mode
- Give you a bash shell inside the container

### Option 2: Using Docker Compose

```bash
# Start container in interactive mode
docker-compose run --rm agent-chewy /bin/bash

# Or start and keep running
docker-compose up -d
docker exec -it agent-chewy /bin/bash
```

### Option 3: Using Docker Directly

```bash
# Build the image
docker build -t agent-chewy .

# Run interactively
docker run -it --rm \
  -v $(pwd):/app \
  -v $(pwd)/.env:/app/.env:ro \
  -v $(pwd)/swagger:/app/swagger \
  -v $(pwd)/features:/app/features \
  -v $(pwd)/src/steps:/app/src/steps \
  agent-chewy /bin/bash
```

## Usage Inside Container

Once inside the container, you can use all the npm commands:

### Generate Tests with NLP

```bash
# Generate tests for AVS API
npm run api:generate -- -s swagger/teams/avs/avs-api.json -i "Generate exactly 2 test scenarios: 1) Test verifyAddress endpoint with a valid US address. 2) Test suggestAddresses endpoint with an incomplete address."

# Generate tests for any team
npm run api:generate -- -s swagger/teams/<team>/<api>.json -i "Your natural language description"
```

### Run Tests

```bash
# Run all AVS tests
npm run test:avs

# Run all API tests
npm run test:api

# Run specific feature file
NODE_OPTIONS="--import tsx" npx cucumber-js features/api/avs/verification/verify-address-with-valid-us-address.feature --import 'src/steps/api/common/common.steps.ts' --import 'src/steps/api/avs/**/*.steps.ts' --format progress
```

### List Endpoints

```bash
npm run api:list -- -s swagger/teams/avs/avs-api.json
```

## Environment Variables

Make sure your `.env` file is in the project root with:

```env
OPENAI_API_KEY=your-api-key-here
```

The Docker setup will mount this file as read-only into the container.

## Volume Mounts

The following directories are mounted as volumes:
- `/app` - Project root (for code changes)
- `/app/.env` - Environment variables (read-only)
- `/app/swagger` - Swagger specifications
- `/app/features` - Generated feature files
- `/app/src/steps` - Generated step definitions

This means any files you generate or modify inside the container will persist on your host machine.

## Troubleshooting

### Container won't start
```bash
# Check if port is already in use
docker ps -a

# Remove old container
docker-compose down

# Rebuild image
docker-compose build --no-cache
```

### Permission issues
```bash
# Fix permissions on host
sudo chown -R $USER:$USER .
```

### Environment variables not loading
```bash
# Check if .env file exists
ls -la .env

# Verify it's being mounted
docker exec agent-chewy cat /app/.env
```

## Exiting

To exit the interactive shell:
```bash
exit
```

If you used `docker-compose up -d`, stop the container:
```bash
docker-compose down
```

