const { z } = require('zod');

const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters').max(30).optional(),
    avatar: z.string().url('Avatar must be a valid URL').optional(),
    bio: z.string().max(500, 'Bio must be at most 500 characters').optional(),
    role: z.enum(['USER', 'MODERATOR', 'ADMIN']).optional()
  })
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required')
  })
});

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required')
  })
});

const tagsSchema = z.preprocess(
  (val) => typeof val === 'string'
    ? val.split(',').map(t => t.trim()).filter(Boolean)
    : val,
  z.array(z.string().min(1)).max(20).optional()
);

const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200).optional(),
    content_html: z.string().min(1, 'Content is required'),
    content_json: z.any().optional(),
    tags: tagsSchema,
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'HIDDEN']).optional()
  })
});

const updatePostSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    content_html: z.string().optional(),
    content_json: z.any().optional(),
    tags: tagsSchema,
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'HIDDEN']).optional()
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid post ID')
  })
});

const repostSchema = z.object({
  body: z.object({
    content_html: z.string().optional(),
    content_json: z.any().optional(),
    title: z.string().max(200).optional()
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid post ID')
  })
});

const listPostsSchema = z.object({
  query: z.object({
    skip: z.coerce.number().int().min(0).optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    tag: z.string().optional()
  })
});

const getPostSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid post ID')
  })
});

const getPostBySlugSchema = z.object({
  params: z.object({
    slug: z.string().min(1, 'Slug is required')
  })
});

const createCommentSchema = z.object({
  body: z.object({
    post_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid post ID'),
    parent_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid comment ID').optional(),
    content: z.string().min(1, 'Content is required').max(5000)
  })
});

const appealSchema = z.object({
  body: z.object({
    target_id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid target ID'),
    target_model: z.enum(['Post', 'Comment']),
    reason: z.string().min(1, 'Reason is required').max(500),
    ai_label: z.enum(['SPAM', 'TOXIC', 'AI_UNAVAILABLE']),
    ai_spam_score: z.number().min(0).max(1).optional(),
    ai_toxicity_score: z.number().min(0).max(1).optional()
  })
});

const approveAppealSchema = z.object({
  body: z.object({
    admin_note: z.string().max(500).optional()
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid appeal ID')
  })
});

const rejectAppealSchema = z.object({
  body: z.object({
    admin_note: z.string().max(500).optional()
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid appeal ID')
  })
});

const appealIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid appeal ID')
  })
});

const paginationSchema = z.object({
  query: z.object({
    skip: z.coerce.number().int().min(0).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional()
  })
});

const objectIdParam = (name) => z.object({
  params: z.object({
    [name]: z.string().regex(/^[0-9a-fA-F]{24}$/, `Invalid ${name}`)
  })
});

const idParamSchema = objectIdParam('id');
const postIdParamSchema = objectIdParam('postId');
const userIdParamSchema = objectIdParam('userId');
const conversationIdParamSchema = objectIdParam('conversationId');
const messageIdParamSchema = objectIdParam('messageId');

const usernameParamSchema = z.object({
  params: z.object({
    username: z.string().min(1, 'Username is required').max(30)
  })
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  createPostSchema,
  updatePostSchema,
  repostSchema,
  listPostsSchema,
  getPostSchema,
  getPostBySlugSchema,
  createCommentSchema,
  appealSchema,
  approveAppealSchema,
  rejectAppealSchema,
  appealIdSchema,
  paginationSchema,
  idParamSchema,
  postIdParamSchema,
  userIdParamSchema,
  conversationIdParamSchema,
  messageIdParamSchema,
  usernameParamSchema
};