# @corpusai/sdk

Official TypeScript SDK for the CorpusAI API. Query your AI assistants programmatically.

## Installation

```bash
npm install @corpusai/sdk
```

## Quick Start

```typescript
import { CorpusAI } from '@corpusai/sdk';

const client = new CorpusAI('cai_your_api_key');

// Query an AI assistant
const { answer, sources, metrics } = await client.query('my-ai', 'What is RAG?');
console.log(answer);
console.log(`${sources.length} sources, ${metrics.totalMs}ms`);

// List your AI assistants
const ais = await client.listAIs();
for (const ai of ais) {
  console.log(`${ai.name} — ${ai.documentCount} documents`);
}
```

## API Reference

### `new CorpusAI(apiKey, options?)`

Create a client instance.

| Parameter         | Type     | Description                                       |
| ----------------- | -------- | ------------------------------------------------- |
| `apiKey`          | `string` | Your API key (starts with `cai_`)                 |
| `options.baseUrl` | `string` | API base URL (default: `https://api.corpusai.io`) |
| `options.timeout` | `number` | Request timeout in ms (default: `30000`)          |

### `client.query(slug, question)`

Query an AI assistant and get an answer with sources.

| Parameter  | Type     | Description                    |
| ---------- | -------- | ------------------------------ |
| `slug`     | `string` | The AI's unique slug           |
| `question` | `string` | Your question (max 2000 chars) |

Returns: `Promise<QueryResponse>`

```typescript
interface QueryResponse {
  answer: string;
  sources: Source[];
  metrics: QueryMetrics;
}

interface Source {
  chunkId: string;
  documentSource: string;
  score: number;
  text: string;
}
```

### `client.listAIs()`

List all AI assistants associated with your API key.

Returns: `Promise<AIInfo[]>`

```typescript
interface AIInfo {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  documentCount: number;
}
```

## Error Handling

```typescript
import { CorpusAI, CorpusAIError } from '@corpusai/sdk';

try {
  const response = await client.query('my-ai', 'Hello');
} catch (error) {
  if (error instanceof CorpusAIError) {
    console.error(`API Error ${error.status}: ${error.message}`);
    // error.status — HTTP status code (401, 404, 429, etc.)
    // error.code — Error type ("Unauthorized", "Not Found", etc.)
  }
}
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- TypeScript 5+ (for type definitions)

## Get an API Key

1. Go to your CorpusAI dashboard → Settings → API Keys
2. Create a new key
3. Copy the key (it starts with `cai_`)
