import express from 'express'
import cors from 'cors'
import config from './config'
import logger from './utils/logger'
import { notFoundMiddleware, errorHandlerMiddleware } from './middleware/error'
import axios from 'axios'

// Create Express app
const app = express()

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  })
})

app.get('/', (req, res) => {
  res.status(200).send('ollama is running')
})

app.get('/api/tags', (req, res) => {
  const models = config.api.models.split(',').map(item => ({
    'name': item,
    'model': item,
    'modified_at': '2025-05-22T13:17:33.539324157+08:00',
    'size': 3200627168,
    'digest': 'fb90415cde1ef08aa669ae74b082d49b158729b6db1ab183c941417d507e71a1',
    'details': {
      'parent_model': '',
      'format': 'gguf',
      'family': 'qwen',
      'families': [
        'qwen'
      ],
      'parameter_size': '3.8B',
      'quantization_level': 'Q4_K_M'
    }
  }))
  res.status(200).json({
    models
  })
})

app.use('/api/chat', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const response = await axios({
      method: 'post',
      url: `${config.api.cloudApiUrl}`,
      data: req.body,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api.apiKey}`
      },
      responseType: 'stream'
    })

    req.on('close', () => {
      if (response.data && typeof response.data.destroy === 'function') {
        response.data.destroy()
      }
    })

    response.data.on('error', (error: Error) => {
      if (!res.headersSent) {
        res.status(500).json({
          error: 'Streaming Error',
          message: 'An error occurred while streaming the response'
        })
      }
      res.end()
    })

    // Handle successful completion
    response.data.on('end', () => {
      // Send final response with done: true
      const finalResponse = {
        model: req.body.model || 'kimi-k2',
        created_at: new Date().toISOString(),
        message: {
          role: 'assistant',
          content: ''
        },
        done: true,
        total_duration: 0,
        load_duration: 0,
        prompt_eval_count: 0,
        prompt_eval_duration: 0,
        eval_count: 0,
        eval_duration: 0
      }

      res.write(JSON.stringify(finalResponse) + '\n')
      res.end()
      logger.info('Chat streaming completed successfully')
    })

    let buffer = ''

    response.data.on('data', (chunk: any) => {
      const chunkStr = chunk.toString('utf8')

      // 处理可能的多行数据
      buffer += chunkStr
      const lines = buffer.split('\n')

      // 保留最后一行（可能不完整）
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim() && line.startsWith('data: ')) {
          try {
            const jsonStr = line.replace('data: ', '')
            if (jsonStr === '[DONE]') {
              return
            }

            const data = JSON.parse(jsonStr)

            // 转换为Ollama格式
            const ollamaResponse = {
              model: req.body.model || 'kimi-k2',
              created_at: new Date().toISOString(),
              message: {
                role: 'assistant',
                content: data.choices?.[0]?.delta?.content || ''
              },
              done: false
            }

            // 只有在有实际内容时才发送响应
            if (ollamaResponse.message.content) {
              res.write(JSON.stringify(ollamaResponse) + '\n')
            }
          } catch (parseError) {
            console.error('Error parsing chunk:', parseError)
          }
        }
      }
    })
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Chat Error',
        message: 'Failed to process chat request'
      })
    }
  }
})

// Error handling
app.use(notFoundMiddleware)
app.use(errorHandlerMiddleware)

// Start server
const PORT = config.server.port
app.listen(PORT, () => {
  logger.info(`Server running in ${config.server.nodeEnv} mode on port ${PORT}`)
})

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection', {
    error: err,
    stack: err.stack
  })
  // Don't exit the process in production, just log the error
  if (config.server.nodeEnv !== 'production') {
    process.exit(1)
  }
})

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception', {
    error: err,
    stack: err.stack
  })
  // Exit the process in case of uncaught exception (this is a serious error)
  process.exit(1)
})
