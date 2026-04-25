const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const crypto = require('crypto');
const { format } = require('date-fns');

const DB_PATH = path.join(__dirname, '..', 'data.xlsx');

/**
 * Helper to split date into Date and Time components
 * @param {string|Date} dateVal 
 * @returns {{ date: string, time: string }}
 */
function splitDateTime(dateVal) {
  if (!dateVal) return { date: '', time: '' };
  try {
    const date = new Date(dateVal);
    if (isNaN(date.getTime())) return { date: dateVal, time: '' };
    return {
      date: format(date, 'yyyy-MM-dd'),
      time: format(date, 'HH:mm:ss')
    };
  } catch (e) {
    return { date: dateVal, time: '' };
  }
}

function initDb() {
  if (!fs.existsSync(DB_PATH)) {
    const wb = xlsx.utils.book_new();
    const wsUsers = xlsx.utils.json_to_sheet([]);
    const wsAttendance = xlsx.utils.json_to_sheet([]);
    const wsFaceData = xlsx.utils.json_to_sheet([]);
    
    xlsx.utils.book_append_sheet(wb, wsUsers, 'Users');
    xlsx.utils.book_append_sheet(wb, wsAttendance, 'Attendance');
    xlsx.utils.book_append_sheet(wb, wsFaceData, 'FaceData');
    
    xlsx.writeFile(wb, DB_PATH);
  }
}

function readData() {
  if (!fs.existsSync(DB_PATH)) initDb();
  const wb = xlsx.readFile(DB_PATH);
  
  const users = xlsx.utils.sheet_to_json(wb.Sheets['Users'] || xlsx.utils.json_to_sheet([]));
  const attendance = xlsx.utils.sheet_to_json(wb.Sheets['Attendance'] || xlsx.utils.json_to_sheet([]));
  const faceData = xlsx.utils.sheet_to_json(wb.Sheets['FaceData'] || xlsx.utils.json_to_sheet([]));
  
  // Parse JSON fields and merge face descriptors
  users.forEach(u => {
    let descriptors = [];
    
    // Merge date and time back into createdAt if they exist
    if (!u.createdAt && u.date && u.time) {
      u.createdAt = `${u.date}T${u.time}`;
    }

    // Migration: Check if descriptors are still in the Users sheet (old format)
    if (u.faceDescriptors) {
      try {
        descriptors = JSON.parse(u.faceDescriptors);
      } catch(e) {
        descriptors = [];
      }
    }
    
    // Check in FaceData sheet (new format)
    const stored = faceData.filter(d => d.userId === u.id || d.userId === u._id);
    if (stored.length > 0) {
      const newDescriptors = stored.map(s => {
        try {
          return JSON.parse(s.descriptor);
        } catch(e) {
          return null;
        }
      }).filter(d => d !== null);
      
      if (newDescriptors.length > 0) descriptors = newDescriptors;
    }
    
    u.faceDescriptors = descriptors;
  });
  
  return { users, attendance };
}

function writeData(users, attendance) {
  const wb = xlsx.utils.book_new();
  
  // 1. Prepare Users sheet (Clean: No descriptors, split date/time)
  const usersToSave = users.map(u => {
    const { faceDescriptors, createdAt, ...rest } = u;
    const { date, time } = splitDateTime(createdAt);
    return {
      ...rest,
      date,
      time
    };
  });
  
  // 2. Prepare Attendance sheet (Split date/time for createdAt if needed, though it already has date/time)
  const attendanceToSave = attendance.map(a => {
    const { createdAt, ...rest } = a;
    // We keep rest.date and rest.time if they exist, otherwise we derive from createdAt
    const derived = splitDateTime(createdAt);
    return {
      ...rest,
      date: rest.date || derived.date,
      time: rest.time || derived.time
    };
  });
  
  // 3. Prepare FaceData sheet (The "useless" but necessary system data)
  const faceDataToSave = [];
  users.forEach(u => {
    if (u.faceDescriptors && Array.isArray(u.faceDescriptors)) {
      u.faceDescriptors.forEach(d => {
        faceDataToSave.push({
          userId: u.id || u._id,
          descriptor: JSON.stringify(d)
        });
      });
    }
  });
  
  const wsUsers = xlsx.utils.json_to_sheet(usersToSave);
  const wsAttendance = xlsx.utils.json_to_sheet(attendanceToSave);
  const wsFaceData = xlsx.utils.json_to_sheet(faceDataToSave);
  
  // Set uniform column widths (25 characters wide)
  const colWidths = [
    { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 },
    { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 25 }
  ];
  wsUsers['!cols'] = colWidths;
  wsAttendance['!cols'] = colWidths;

  xlsx.utils.book_append_sheet(wb, wsUsers, 'Users');
  xlsx.utils.book_append_sheet(wb, wsAttendance, 'Attendance');
  xlsx.utils.book_append_sheet(wb, wsFaceData, 'FaceData');
  
  xlsx.writeFile(wb, DB_PATH);
}

module.exports = {
  initDb,
  readData,
  writeData,
  generateId: () => crypto.randomUUID()
};
