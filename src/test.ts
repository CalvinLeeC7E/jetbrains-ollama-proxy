import axios from 'axios';
import config from './config';
import logger from './utils/logger';

/**
 * Simple test script to verify the Ollama API proxy functionality
 */
async function testOllamaProxy() {
  logger.info('Starting Ollama API proxy test');

  try {
    // Test the health endpoint
    logger.info('Testing health endpoint...');
    const healthResponse = await axios.get('http://localhost:3000/health');
    logger.info(`Health endpoint response: ${JSON.stringify(healthResponse.data)}`);

    // Test a simple API endpoint (models list)
    logger.info('Testing models endpoint...');
    const modelsResponse = await axios.get('http://localhost:3000/api/tags');
    logger.info(`Models endpoint response status: ${modelsResponse.status}`);
    logger.info(`Models endpoint response data: ${JSON.stringify(modelsResponse.data, null, 2)}`);

    // Test a streaming endpoint with a simple prompt
    logger.info('Testing generate endpoint (streaming)...');
    const generateResponse = await axios.post(
      'http://localhost:3000/api/generate',
      {
        model: 'llama2',
        prompt: 'Hello, how are you?',
        stream: true
      },
      {
        responseType: 'stream'
      }
    );

    logger.info(`Generate endpoint response status: ${generateResponse.status}`);

    // Process the streaming response
    let responseData = '';
    generateResponse.data.on('data', (chunk: Buffer) => {
      const chunkStr = chunk.toString();
      responseData += chunkStr;
      logger.info(`Received chunk: ${chunkStr}`);
    });

    generateResponse.data.on('end', () => {
      logger.info('Streaming response completed');
      logger.info('Test completed successfully');
    });

    generateResponse.data.on('error', (err: Error) => {
      logger.error(`Error in streaming response: ${err.message}`);
    });

  } catch (error) {
    logger.error(`Test failed: ${(error as Error).message}`, { error });
  }
}

// Only run the test if this file is executed directly
if (require.main === module) {
  testOllamaProxy();
}

export default testOllamaProxy;
