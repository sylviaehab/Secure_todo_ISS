/**
 * Todo Routes with Encryption and Integrity Verification
 * Implements AES-256-GCM encryption and SHA-256 integrity hashing
 */

const express = require('express');
const router = express.Router();
const Todo = require('../models/Todo');
const { authenticate } = require('../middleware/authMiddleware');
const { validateTodo, handleValidationErrors } = require('../middleware/validator');
const { todoLimiter } = require('../middleware/rateLimiter');
const { encrypt, decrypt } = require('../utils/crypto');
const { generateIntegrityHash, verifyIntegrity } = require('../utils/hash');
const logger = require('../utils/logger');

// Apply authentication to all todo routes
router.use(authenticate);

/**
 * GET /api/todos
 * Get all todos for authenticated user
 */
router.get('/', todoLimiter, async (req, res) => {
  try {
    const todos = await Todo.find({ userId: req.userId }).sort({ createdAt: -1 });

    // Decrypt todos
    const decryptedTodos = todos.map(todo => {
      try {
        const decryptedContent = decrypt(
          todo.encryptedContent,
          todo.iv,
          todo.authTag
        );

        // Verify integrity
        const isIntegrityValid = verifyIntegrity(decryptedContent, todo.integrityHash);
        
        if (!isIntegrityValid) {
          logger.logIntegrityFailure(todo._id, req.userId);
        }

        return {
          id: todo._id,
          title: todo.title,
          description: decryptedContent,
          completed: todo.completed,
          createdAt: todo.createdAt,
          updatedAt: todo.updatedAt,
          integrityValid: isIntegrityValid
        };
      } catch (error) {
        logger.error('Todo decryption error', { 
          todoId: todo._id, 
          error: error.message 
        });
        return {
          id: todo._id,
          title: todo.title,
          description: '[Decryption Failed]',
          completed: todo.completed,
          createdAt: todo.createdAt,
          updatedAt: todo.updatedAt,
          integrityValid: false,
          error: 'Decryption failed'
        };
      }
    });

    res.json({
      success: true,
      todos: decryptedTodos
    });
  } catch (error) {
    logger.error('Get todos error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve todos'
    });
  }
});

/**
 * GET /api/todos/:id
 * Get a specific todo by ID
 */
router.get('/:id', todoLimiter, async (req, res) => {
  try {
    const todo = await Todo.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    // Decrypt content
    const decryptedContent = decrypt(
      todo.encryptedContent,
      todo.iv,
      todo.authTag
    );

    // Verify integrity
    const isIntegrityValid = verifyIntegrity(decryptedContent, todo.integrityHash);
    
    if (!isIntegrityValid) {
      logger.logIntegrityFailure(todo._id, req.userId);
    }

    res.json({
      success: true,
      todo: {
        id: todo._id,
        title: todo.title,
        description: decryptedContent,
        completed: todo.completed,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt,
        integrityValid: isIntegrityValid
      }
    });
  } catch (error) {
    logger.error('Get todo error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve todo'
    });
  }
});

/**
 * POST /api/todos
 * Create a new todo
 */
router.post('/',
  todoLimiter,
  validateTodo,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, description } = req.body;

      // Encrypt description
      const { encryptedContent, iv, authTag } = encrypt(description);

      // Generate integrity hash of plaintext
      const integrityHash = generateIntegrityHash(description);

      // Create todo
      const todo = await Todo.create({
        userId: req.userId,
        title,
        encryptedContent,
        iv,
        authTag,
        integrityHash,
        completed: false
      });

      logger.info('Todo created', { todoId: todo._id, userId: req.userId });

      res.status(201).json({
        success: true,
        message: 'Todo created successfully',
        todo: {
          id: todo._id,
          title: todo.title,
          description, // Return decrypted for convenience
          completed: todo.completed,
          createdAt: todo.createdAt,
          updatedAt: todo.updatedAt,
          integrityValid: true
        }
      });
    } catch (error) {
      logger.error('Create todo error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to create todo',
        error: error.message
      });
    }
  }
);

/**
 * PUT /api/todos/:id
 * Update an existing todo
 */
router.put('/:id',
  todoLimiter,
  validateTodo,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, description, completed } = req.body;

      // Find todo
      const todo = await Todo.findOne({ 
        _id: req.params.id, 
        userId: req.userId 
      });

      if (!todo) {
        logger.logAuthzFailure(req.userId, `todo:${req.params.id}`, req.ip);
        return res.status(404).json({
          success: false,
          message: 'Todo not found'
        });
      }

      // Update title and completed status
      todo.title = title;
      todo.completed = completed !== undefined ? completed : todo.completed;

      // Re-encrypt description if provided
      if (description) {
        const { encryptedContent, iv, authTag } = encrypt(description);
        const integrityHash = generateIntegrityHash(description);

        todo.encryptedContent = encryptedContent;
        todo.iv = iv;
        todo.authTag = authTag;
        todo.integrityHash = integrityHash;
      }

      await todo.save();

      // Decrypt for response
      const decryptedContent = decrypt(
        todo.encryptedContent,
        todo.iv,
        todo.authTag
      );

      logger.info('Todo updated', { todoId: todo._id, userId: req.userId });

      res.json({
        success: true,
        message: 'Todo updated successfully',
        todo: {
          id: todo._id,
          title: todo.title,
          description: decryptedContent,
          completed: todo.completed,
          createdAt: todo.createdAt,
          updatedAt: todo.updatedAt,
          integrityValid: true
        }
      });
    } catch (error) {
      logger.error('Update todo error', { error: error.message });
      res.status(500).json({
        success: false,
        message: 'Failed to update todo',
        error: error.message
      });
    }
  }
);

/**
 * DELETE /api/todos/:id
 * Delete a todo
 */
router.delete('/:id', todoLimiter, async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!todo) {
      logger.logAuthzFailure(req.userId, `todo:${req.params.id}`, req.ip);
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    logger.info('Todo deleted', { todoId: todo._id, userId: req.userId });

    res.json({
      success: true,
      message: 'Todo deleted successfully'
    });
  } catch (error) {
    logger.error('Delete todo error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete todo'
    });
  }
});

/**
 * PATCH /api/todos/:id/toggle
 * Toggle todo completed status
 */
router.patch('/:id/toggle', todoLimiter, async (req, res) => {
  try {
    const todo = await Todo.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    todo.completed = !todo.completed;
    await todo.save();

    logger.info('Todo toggled', { todoId: todo._id, completed: todo.completed });

    res.json({
      success: true,
      message: 'Todo status updated',
      completed: todo.completed
    });
  } catch (error) {
    logger.error('Toggle todo error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to toggle todo'
    });
  }
});

module.exports = router;
