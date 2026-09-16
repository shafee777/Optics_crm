import { AppError } from '../shared/errors/AppError.js';

export const validate = (schema) => (req, _res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    next();
  } catch (error) {
    const issues = error.errors?.map((err) => ({
      field: err.path.slice(1).join('.'),
      message: err.message,
    })) || [{ message: error.message }];

    next(new AppError('Validation failed', 400, 'VALIDATION_ERROR', issues));
  }
};