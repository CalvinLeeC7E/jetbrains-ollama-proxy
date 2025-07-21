import { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';

/**
 * Creates a proxy middleware for forwarding Ollama API requests to the cloud API
 */
export const createOllamaProxy = () => {
  return createProxyMiddleware({
    target: config.api.cloudApiUrl,
    changeOrigin: true,
    pathRewrite: {
      // Keep the same path structure as Ollama API
      '^/api/(.*)': '/api/$1',
    },
    onProxyReq: (proxyReq, req, res) => {
      // Add API key to the request headers
      if (config.api.apiKey) {
        proxyReq.setHeader('Authorization', `Bearer ${config.api.apiKey}`);
      }

      // Log the proxied request
      logger.info(`Proxying request: ${req.method} ${req.url} -> ${config.api.cloudApiUrl}${req.url}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      // Simple logging without response interceptor to avoid header conflicts
      logger.info(`Received response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error: ${err.message}`, { error: err });

      // Check if headers have already been sent
      if (!res.headersSent && !res.finished) {
        res.status(500).json({
          error: 'Proxy Error',
          message: 'An error occurred while forwarding the request to the cloud API',
        });
      }
    },
  });
};

/**
 * Middleware to handle streaming responses from the Ollama API
 */
export const streamingProxyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Check if this is a streaming request (e.g., /api/generate or /api/chat)
  const isStreamingEndpoint = req.path.includes('/api/generate') || req.path.includes('/api/chat');

  if (!isStreamingEndpoint) {
    return next(); // Use regular proxy for non-streaming endpoints
  }

  // Check if the request explicitly asks for streaming
  const isStreamingRequest = req.body?.stream === true;

  if (!isStreamingRequest) {
    return next(); // Use regular proxy for non-streaming requests
  }

  try {
    logger.info(`Handling streaming request: ${req.method} ${req.url}`);

    // Check if response has already been sent or headers already sent
    if (res.headersSent || res.finished) {
      logger.warn('Response already sent, skipping streaming middleware');
      return;
    }

    // Set appropriate headers for streaming response
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Mark this response as handled by streaming middleware
    res.locals.streamingHandled = true;

    // Forward the request to the cloud API with streaming enabled
    const response = await axios({
      method: req.method,
      url: `${config.api.cloudApiUrl}${req.url}`,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        ...(config.api.apiKey && { 'Authorization': `Bearer ${config.api.apiKey}` }),
      },
      responseType: 'stream',
      timeout: 30000, // 30 seconds timeout
    });

    // Set response status code
    res.status(response.status);

    // Handle connection close
    req.on('close', () => {
      logger.info('Client disconnected, destroying stream');
      if (response.data && typeof response.data.destroy === 'function') {
        response.data.destroy();
      }
    });

    // Handle errors in the stream
    response.data.on('error', (error: Error) => {
      logger.error(`Streaming error: ${error.message}`, { error });

      // Only send error response if headers haven't been sent
      if (!res.headersSent && !res.finished) {
        res.status(500).json({
          error: 'Streaming Error',
          message: 'An error occurred while streaming the response',
        });
      } else {
        // If headers were already sent, we can't send a JSON response
        // Just end the response
        res.end();
      }
    });

    // Handle successful completion
    response.data.on('end', () => {
      logger.info('Streaming completed successfully');
    });

    // Pipe the streaming response back to the client
    response.data.pipe(res);

  } catch (error) {
    logger.error(`Error in streaming proxy: ${(error as Error).message}`, { error });

    // Only send error response if headers haven't been sent
    if (!res.headersSent && !res.finished) {
      res.status(500).json({
        error: 'Proxy Error',
        message: 'An error occurred while forwarding the streaming request',
      });
    }
  }
};
