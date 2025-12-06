/**
 * Rate Limiting Middleware (ISS Security Requirement)
 * 
 * Implements rate limiting to prevent:
 * - Brute force attacks
 * - API abuse
 * - DoS attacks
 * 
 * Limit: 60 requests per minute per IP
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

/**
 * General API rate limiter - 60 requests per minute
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after a minute'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.logRateLimit(req.ip, req.path);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again after a minute'
    });
  }
});

/**
 * Strict rate limiter for authentication endpoints - 10 requests per 15 minutes
 * Prevents brute force attacks on login/signup
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes'
  },
  handler: (req, res) => {
    logger.logRateLimit(req.ip, req.path);
    logger.warn('Authentication rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      email: req.body.email
    });
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again after 15 minutes'
    });
  }
});

/**
 * Moderate rate limiter for todo operations - 30 requests per minute
 */
const todoLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    message: 'Too many todo operations, please slow down'
  },
  handler: (req, res) => {
    logger.logRateLimit(req.ip, req.path);
    res.status(429).json({
      success: false,
      message: 'Too many todo operations, please slow down'
    });
  }
});

module.exports = {
  apiLimiter,
  authLimiter,
  todoLimiter
};
