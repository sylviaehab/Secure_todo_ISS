/**
 * Winston Logger Configuration (ISS Security Requirement)
 * 
 * Implements structured logging for:
 * - Authentication events (login, logout, failures)
 * - Authorization failures
 * - Security violations (rate limiting, invalid tokens)
 * - Application errors and warnings
 */

const winston = require('winston');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Define transports
const transports = [
  // Console transport for all environments
  new winston.transports.Console({
    format: consoleFormat,
  }),
  
  // File transport for errors
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    format: format,
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join('logs', 'combined.log'),
    format: format,
  }),
  
  // File transport for security events
  new winston.transports.File({
    filename: path.join('logs', 'security.log'),
    level: 'warn',
    format: format,
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  levels,
  format,
  transports,
  exitOnError: false,
});

/**
 * Log authentication success
 * @param {string} userId - User ID
 * @param {string} method - Auth method (local, google)
 * @param {string} ip - IP address
 */
logger.logAuth = function(userId, method, ip) {
  this.info('Authentication successful', {
    userId,
    method,
    ip,
    timestamp: new Date().toISOString(),
    type: 'AUTH_SUCCESS'
  });
};

/**
 * Log authentication failure
 * @param {string} email - Email attempted
 * @param {string} reason - Failure reason
 * @param {string} ip - IP address
 */
logger.logAuthFailure = function(email, reason, ip) {
  this.warn('Authentication failed', {
    email,
    reason,
    ip,
    timestamp: new Date().toISOString(),
    type: 'AUTH_FAILURE'
  });
};

/**
 * Log authorization failure
 * @param {string} userId - User ID
 * @param {string} resource - Resource attempted
 * @param {string} ip - IP address
 */
logger.logAuthzFailure = function(userId, resource, ip) {
  this.warn('Authorization failed', {
    userId,
    resource,
    ip,
    timestamp: new Date().toISOString(),
    type: 'AUTHZ_FAILURE'
  });
};

/**
 * Log rate limit violation
 * @param {string} ip - IP address
 * @param {string} endpoint - Endpoint hit
 */
logger.logRateLimit = function(ip, endpoint) {
  this.warn('Rate limit exceeded', {
    ip,
    endpoint,
    timestamp: new Date().toISOString(),
    type: 'RATE_LIMIT'
  });
};

/**
 * Log security violation
 * @param {string} type - Violation type
 * @param {string} details - Details
 * @param {string} ip - IP address
 */
logger.logSecurityViolation = function(type, details, ip) {
  this.error('Security violation detected', {
    type,
    details,
    ip,
    timestamp: new Date().toISOString(),
    type: 'SECURITY_VIOLATION'
  });
};

/**
 * Log integrity check failure
 * @param {string} todoId - Todo ID
 * @param {string} userId - User ID
 */
logger.logIntegrityFailure = function(todoId, userId) {
  this.error('Integrity check failed - possible data tampering', {
    todoId,
    userId,
    timestamp: new Date().toISOString(),
    type: 'INTEGRITY_FAILURE'
  });
};

module.exports = logger;
