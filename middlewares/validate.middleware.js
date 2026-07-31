const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    // Normalize so body-less requests (e.g. cookie-only refresh, GET) parse fine
    const result = schema.parse({
      body: req.body ?? {},
      query: req.query ?? {},
      params: req.params ?? {}
    });
    
    // Merge validated data back into req
    req.body = result.body || req.body;
    req.query = result.query || req.query;
    req.params = result.params || req.params;
    
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues = error.issues || error.errors || [];
      const messages = issues.map(e => `${e.path.join('.')}: ${e.message}`);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }
    next(error);
  }
};

module.exports = { validate };