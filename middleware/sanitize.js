const sanitizeHtml = require('sanitize-html');

/**
 * Input Sanitization Middleware
 * Strips HTML and prevents XSS attacks
 */

const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }

  next();
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj) {
  const sanitized = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        // Strip all HTML tags and dangerous content
        sanitized[key] = sanitizeHtml(value, {
          allowedTags: [], // No HTML tags allowed
          allowedAttributes: {},
          disallowedTagsMode: 'recursiveEscape'
        }).trim();
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeObject(value);
      } else if (Array.isArray(value)) {
        // Sanitize array elements
        sanitized[key] = value.map(item => {
          if (typeof item === 'string') {
            return sanitizeHtml(item, {
              allowedTags: [],
              allowedAttributes: {},
              disallowedTagsMode: 'recursiveEscape'
            }).trim();
          } else if (typeof item === 'object' && item !== null) {
            return sanitizeObject(item);
          }
          return item;
        });
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

module.exports = sanitizeInput;