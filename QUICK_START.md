# Quick Start Guide

## Generate API Tests in 3 Steps

### 1. Set up OpenAI Key
```bash
echo "OPENAI_API_KEY=sk-your-key-here" > .env
```

### 2. Run Generator
```typescript
import { ApiTestGenerator } from './src/api-generator';

const generator = new ApiTestGenerator();

await generator.generateFromNaturalLanguage({
  naturalLanguageInput: "Test user registration with valid email and password",
  swaggerSpecPath: "./swagger.json"
});
```

### 3. Run Generated Tests
```bash
npx cucumber-js features/api/
```

## Common Commands
```bash
# Install dependencies
npm install

# Build project
npm run build

# Generate tests
npm run generate:api -- --swagger ./spec.yaml --nl "test description"

# Run tests
npm test
```

