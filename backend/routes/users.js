const express = require('express');
const router = express.Router();
const { readData, writeData, generateId } = require('../utils/excelDb');

/**
 * GET /api/users
 * Returns list of all registered users (without face descriptors for performance)
 */
router.get('/', (req, res) => {
  try {
    const { users } = readData();
    const sortedUsers = users
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(u => {
        const { faceDescriptors, ...rest } = u;
        return rest;
      });
    res.json({ success: true, data: sortedUsers });
  } catch (err) {
    console.error('GET /users error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

/**
 * GET /api/users/:id
 * Get a single user by ID
 */
router.get('/:id', (req, res) => {
  try {
    const { users } = readData();
    const user = users.find(u => u.id === req.params.id || u._id === req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    const { faceDescriptors, ...rest } = user;
    res.json({ success: true, data: rest });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

/**
 * POST /api/register
 * Register a new user with face descriptors
 * Body: { name, employeeId, faceDescriptors: number[][] }
 */
router.post('/register', (req, res) => {
  try {
    const { name, employeeId, faceDescriptors } = req.body;

    // Validate input
    if (!name || !employeeId) {
      return res.status(400).json({ success: false, message: 'Name and Employee ID are required' });
    }
    if (!faceDescriptors || !Array.isArray(faceDescriptors) || faceDescriptors.length === 0) {
      return res.status(400).json({ success: false, message: 'Face descriptors are required' });
    }

    const { users, attendance } = readData();

    // Check for duplicate employee ID
    if (users.find(u => u.employeeId === employeeId)) {
      return res.status(409).json({
        success: false,
        message: `Employee ID "${employeeId}" is already registered`,
      });
    }

    const newUser = {
      id: generateId(),
      name,
      employeeId,
      faceDescriptors,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeData(users, attendance);

    res.status(201).json({
      success: true,
      message: `${name} registered successfully`,
      data: { id: newUser.id, name: newUser.name, employeeId: newUser.employeeId },
    });
  } catch (err) {
    console.error('POST /register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a registered user
 */
router.delete('/:id', (req, res) => {
  try {
    let { users, attendance } = readData();
    const initialLen = users.length;
    
    users = users.filter(u => u.id !== req.params.id && u._id !== req.params.id);
    
    if (users.length === initialLen) return res.status(404).json({ success: false, message: 'User not found' });
    
    writeData(users, attendance);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

module.exports = router;
