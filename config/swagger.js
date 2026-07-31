const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blog Platform API',
      version: '1.0.0',
      description: 'Blog Platform with Content Moderation - API Documentation',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: process.env.CLIENT_URL?.replace(3000, 5000) || 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'MODERATOR', 'ADMIN'] },
            avatar: { type: 'string' },
            bio: { type: 'string' },
            violationScore: { type: 'integer' },
            status: { type: 'string', enum: ['ACTIVE', 'MUTED', 'BANNED', 'DELETED'] },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Post: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            content_html: { type: 'string' },
            content_json: { type: 'object' },
            slug: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            visibility: { type: 'string', enum: ['PUBLIC', 'PRIVATE', 'HIDDEN'] },
            author: { $ref: '#/components/schemas/User' },
            original_post: { $ref: '#/components/schemas/Post' },
            media: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['IMAGE', 'VIDEO'] },
                  url: { type: 'string' },
                  public_id: { type: 'string' },
                  width: { type: 'integer' },
                  height: { type: 'integer' },
                  duration: { type: 'integer' },
                  order_index: { type: 'integer' }
                }
              }
            },
            isLiked: { type: 'boolean' },
            isBookmarked: { type: 'boolean' },
            isReposted: { type: 'boolean' },
            likesCount: { type: 'integer' },
            bookmarksCount: { type: 'integer' },
            sharesCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Comment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            post_id: { type: 'string' },
            author: { $ref: '#/components/schemas/User' },
            parent_id: { type: 'string', nullable: true },
            depth: { type: 'integer' },
            content: { type: 'string' },
            spam_score: { type: 'number' },
            toxicity_score: { type: 'number' },
            label: { type: 'string', enum: ['NORMAL', 'SPAM', 'TOXIC', 'AI_UNAVAILABLE'] },
            is_hidden: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Notification: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            recipient: { $ref: '#/components/schemas/User' },
            sender: { $ref: '#/components/schemas/User', nullable: true },
            type: { type: 'string', enum: ['LIKE', 'COMMENT', 'FOLLOW', 'REPOST', 'REPLY', 'AI_MODERATION', 'APPEAL_RESOLVED'] },
            entity_id: { type: 'string' },
            entity_model: { type: 'string', enum: ['Post', 'Comment', 'Appeal'] },
            metadata: { type: 'object' },
            is_read: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Appeal: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user_id: { $ref: '#/components/schemas/User' },
            target_id: { type: 'string' },
            target_model: { type: 'string', enum: ['Post', 'Comment'] },
            reason: { type: 'string' },
            ai_label: { type: 'string', enum: ['SPAM', 'TOXIC', 'AI_UNAVAILABLE'] },
            ai_spam_score: { type: 'number' },
            ai_toxicity_score: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
            reviewed_by: { $ref: '#/components/schemas/User' },
            admin_note: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Report: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            reporter_id: { $ref: '#/components/schemas/User' },
            target_id: { type: 'string' },
            target_model: { type: 'string', enum: ['Post', 'Comment'] },
            reason: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'RESOLVED', 'DISMISSED'] },
            resolved_by: { $ref: '#/components/schemas/User' },
            admin_note: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            data: { type: 'null' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: { type: 'array', items: {} },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                skip: { type: 'integer' },
                limit: { type: 'integer' }
              }
            }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./routes/*.js', './controllers/*.js', './validators/schemas.js']
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };