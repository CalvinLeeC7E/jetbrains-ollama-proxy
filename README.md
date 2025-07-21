# Ollama API Proxy

A Node.js and TypeScript proxy server that forwards Ollama API requests to a cloud API endpoint.

## Features

- Forwards all Ollama API requests to a configured cloud API endpoint
- Supports streaming responses for `/api/generate` and `/api/chat` endpoints
- Adds authentication via API key
- Provides detailed logging
- Handles errors gracefully
- Includes health check endpoint

## Prerequisites

- Node.js 14.x or higher
- npm or yarn

## Installation

1. Clone this repository:
   ```bash
   git clone 
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```

4. Edit the `.env` file to configure your environment:
   ```
   PORT=3000
   NODE_ENV=development
   OLLAMA_API_URL=http://localhost:11434
   CLOUD_API_URL=https://your-cloud-api-endpoint.com
   API_KEY=your_api_key_here
   LOG_LEVEL=info
   ```

## Configuration

The following environment variables can be configured:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | The port on which the server will listen | 3000 |
| NODE_ENV | Environment mode (development, production) | development |
| CLOUD_API_URL | The URL of the cloud API to forward requests to | (required) |
| API_KEY | API key for authenticating with the cloud API | (required) |
| LOG_LEVEL | Logging level (error, warn, info, debug) | info |

## Usage

### Development

To run the server in development mode with hot reloading:

```bash
npm run dev
# or
yarn dev
```

### Production

To build and run the server in production mode:

```bash
npm run build
npm start
# or
yarn build
yarn start
```

## API Endpoints

The proxy server forwards all requests to the `/api` path to the configured cloud API endpoint. The following Ollama API endpoints are supported:

- `/api/generate` - Generate text from a prompt (streaming)
- `/api/chat` - Chat with a model (streaming)
- `/api/embeddings` - Generate embeddings for a text
- `/api/models` - List available models
- All other Ollama API endpoints

## Health Check

The server provides a health check endpoint at `/health` that returns a 200 OK response with the server status.

## Error Handling

The server handles errors gracefully and returns appropriate HTTP status codes and error messages. Errors are also logged for debugging purposes.

## Logging

Logs are written to the console in all environments. In production mode, logs are also written to files in the `logs` directory:

- `logs/error.log` - Error logs
- `logs/combined.log` - All logs

## License

MIT
