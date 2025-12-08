#!/bin/bash

# Interactive Docker script for agent-chewy
# This script helps you run agent-chewy in Docker with an interactive terminal

set -e

echo "🐳 Agent-Chewy Docker Interactive Mode"
echo "======================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Build the image if it doesn't exist
if ! docker images | grep -q "agent-chewy"; then
    echo "📦 Building Docker image..."
    docker-compose build
    echo ""
fi

# Check if container is already running
if docker ps | grep -q "agent-chewy"; then
    echo "✅ Container is already running. Attaching to it..."
    echo ""
    docker exec -it agent-chewy /bin/bash
else
    echo "🚀 Starting container in interactive mode..."
    echo ""
    echo "💡 Tips:"
    echo "   - Use 'npm run api:generate -- -s swagger/teams/avs/avs-api.json -i \"your description\"' to generate tests"
    echo "   - Use 'npm run test:avs' to run tests"
    echo "   - Type 'exit' to stop the container"
    echo ""
    docker-compose run --rm agent-chewy /bin/bash
fi

