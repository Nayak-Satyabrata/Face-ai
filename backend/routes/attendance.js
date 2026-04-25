const express = require('express');
const router = express.Router();
const { readData, writeData, generateId } = require('../utils/excelDb');
const { format } = require('date-fns');

// ─── Utility: Euclidean Distance ─────────────────────────────────────────────

function euclideanDistance(d1, d2) {
  let sum = 0;
  for (let i = 0; i < d1.length; i++) {
    const diff = d1[i] - d2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function findBestMatch(queryDescriptor, users, threshold = 0.5) {
  let bestMatch = null;
  let bestDistance = Infinity;

  for (const user of users) {
    for (const storedDescriptor of user.faceDescriptors || []) {
      const dist = euclideanDistance(queryDescriptor, storedDescriptor);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatch = user;
      }
    }
  }

  if (bestDistance <= threshold) {
    return { user: bestMatch, distance: bestDistance };
  }
  return null;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.post('/recognize', (req, res) => {
  try {
    const { descriptor } = req.body;

    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({ success: false, message: 'Face descriptor is required' });
    }

    const { users, attendance } = readData();

    if (users.length === 0) {
      return res.json({ success: false, message: 'No registered users found. Please register users first.' });
    }

    const match = findBestMatch(descriptor, users);

    if (!match) {
      return res.json({ success: false, recognized: false, message: 'Unknown person' });
    }

    const { user, distance } = match;
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = format(new Date(), 'HH:mm:ss');
    const confidence = Math.round((1 - distance) * 100);

    const userId = user.id || user._id;

    // Check for duplicate attendance today
    const existing = attendance.find(a => a.userId === userId && a.date === today);
    if (existing) {
      return res.json({
        success: true,
        recognized: true,
        alreadyMarked: true,
        message: `${user.name} already marked present today at ${existing.time}`,
        user: { id: userId, name: user.name, employeeId: user.employeeId },
        confidence,
      });
    }

    // Mark attendance
    attendance.push({
      id: generateId(),
      userId: userId,
      name: user.name,
      employeeId: user.employeeId,
      date: today,
      time: now,
      status: 'present',
      confidence: parseFloat((1 - distance).toFixed(3)),
      createdAt: new Date().toISOString()
    });

    writeData(users, attendance);

    res.json({
      success: true,
      recognized: true,
      alreadyMarked: false,
      message: `Welcome, ${user.name}! Attendance marked at ${now}`,
      user: { id: userId, name: user.name, employeeId: user.employeeId },
      confidence,
    });
  } catch (err) {
    console.error('POST /recognize error:', err);
    res.status(500).json({ success: false, message: 'Recognition failed' });
  }
});

router.get('/', (req, res) => {
  try {
    const { attendance } = readData();
    let records = [...attendance];

    if (req.query.date) records = records.filter(r => r.date === req.query.date);
    if (req.query.userId) records = records.filter(r => r.userId === req.query.userId);

    records.sort((a, b) => {
      if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.json({ success: true, data: records.slice(0, 500) });
  } catch (err) {
    console.error('GET /attendance error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
  }
});

router.get('/stats', (req, res) => {
  try {
    const { users, attendance } = readData();
    const today = format(new Date(), 'yyyy-MM-dd');

    const totalUsers = users.length;
    const todayCount = attendance.filter(a => a.date === today).length;
    const totalRecords = attendance.length;

    res.json({ success: true, data: { totalUsers, todayCount, totalRecords } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

router.post('/manual', (req, res) => {
  try {
    const { userId, date } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    const { users, attendance } = readData();
    const user = users.find(u => u.id === userId || u._id === userId);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    const now = format(new Date(), 'HH:mm:ss');

    const existingIndex = attendance.findIndex(a => a.userId === userId && a.date === targetDate);

    let record;
    if (existingIndex >= 0) {
      attendance[existingIndex] = {
        ...attendance[existingIndex],
        time: now,
        status: 'manual'
      };
      record = attendance[existingIndex];
    } else {
      record = {
        id: generateId(),
        userId: userId,
        name: user.name,
        employeeId: user.employeeId,
        date: targetDate,
        time: now,
        status: 'manual',
        createdAt: new Date().toISOString()
      };
      attendance.push(record);
    }

    writeData(users, attendance);

    res.json({
      success: true,
      message: `Manual attendance marked for ${user.name} on ${targetDate}`,
      data: record,
    });
  } catch (err) {
    console.error('POST /attendance/manual error:', err);
    res.status(500).json({ success: false, message: 'Failed to mark attendance' });
  }
});

router.get('/export', (req, res) => {
  try {
    const { attendance } = readData();
    let records = [...attendance];

    if (req.query.date) records = records.filter(r => r.date === req.query.date);

    records.sort((a, b) => {
      if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const csvHeader = 'Name,Employee ID,Date,Time,Status,Confidence\n';
    const csvRows = records.map(r =>
      [r.name, r.employeeId, r.date, r.time, r.status, r.confidence ?? ''].join(',')
    );
    const csv = csvHeader + csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    let { users, attendance } = readData();
    attendance = attendance.filter(a => a.id !== req.params.id && a._id !== req.params.id);
    writeData(users, attendance);
    res.json({ success: true, message: 'Record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete record' });
  }
});

module.exports = router;
