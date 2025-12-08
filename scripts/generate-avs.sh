#!/bin/bash

# Simple wrapper for AVS test generation
# Usage: ./scripts/generate-avs.sh "Generate 2 test scenarios..."

if [ -z "$1" ]; then
  echo "Usage: ./scripts/generate-avs.sh \"Your test description\""
  echo "   or: npm run generate:avs \"Your test description\""
  exit 1
fi

npx tsx src/cli/index.ts api generate -i "$1"

