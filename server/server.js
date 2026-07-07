const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { db } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'esp32-dashboard-secret';

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));
app.use('/chartjs', express.static(path.join(__dirname, 'node_modules', 'chart.js', 'dist')));

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Authorization token required' });
  }
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    db.get('SELECT id, username, role FROM users WHERE id = ?', [payload.sub], (dbErr, user) => {
      if (dbErr || !user) {
        return res.status(403).json({ error: 'Invalid token' });
      }
      req.user = user;
      next();
    });
  });
}

function authorizeRole(allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function buildQueryWithDate(baseSql, params, start, end) {
  let sql = baseSql;
  if (start) {
    sql += ' AND timestamp >= ?';
    params.push(new Date(start).toISOString());
  }
  if (end) {
    sql += ' AND timestamp <= ?';
    params.push(new Date(end).toISOString());
  }
  return sql;
}

app.post('/login', async (req, res) => {
  const { username, password } = req.body; // username နေရာမှာ email ရိုက်ထည့်မှာဖြစ်ပါတယ်
  if (!username || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // 🚀 Supabase Auth စနစ်ဖြင့် Email နှင့် Password ကို လှမ်းစစ်ခြင်း
    const { data, error } = await db.auth.signInWithPassword({
      email: username,
      password: password,
    });

    if (error || !data.user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Login အောင်မြင်ရင် Token ထုတ်ပေးခြင်း
    const token = jwt.sign({ sub: data.user.id, username: data.user.email, role: 'admin' }, JWT_SECRET, {
      expiresIn: '12h'
    });

    res.json({ id: data.user.id, token, username: data.user.email, role: 'admin' });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/users', authenticateToken, authorizeRole(['admin']), (req, res) => {
  db.all('SELEapp.postCT id, username, role FROM users ORDER BY username ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch users' });
    }
    res.json(rows);
  });
});

('/users', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }
  const validRoles = ['admin', 'manager', 'user'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, hashedPassword, role],
    function (err) {
      if (err) {
        if (err.message && err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Failed to create user' });
      }
      res.status(201).json({ id: this.lastID, username, role });
    }
  );
});

app.delete('/users/:id', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const deleteId = Number(req.params.id);
  if (deleteId === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }
  db.run('DELETE FROM users WHERE id = ?', [deleteId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete user' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  });
});

app.get('/devices', authenticateToken, (req, res) => {
  db.all(
    `SELECT id, device_key AS deviceKey, name, last_seen AS lastSeen, last_temperature AS temperature, last_humidity AS humidity, last_pressure AS pressure, last_other AS other
     FROM devices ORDER BY name ASC`,
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch devices' });
      }
      res.json(rows);
    }
  );
});

app.post('/devices', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const { deviceKey, name } = req.body;
  if (!deviceKey || !name) {
    return res.status(400).json({ error: 'Device key and name are required' });
  }
  db.run(
    'INSERT INTO devices (device_key, name) VALUES (?, ?)',
    [deviceKey, name],
    function (err) {
      if (err) {
        if (err.message && err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Device key already exists' });
        }
        return res.status(500).json({ error: 'Failed to create device' });
      }
      res.status(201).json({ id: this.lastID, deviceKey, name });
    }
  );
});

app.put('/devices/:id', authenticateToken, authorizeRole(['admin']), (req, res) => {
  const deviceId = Number(req.params.id);
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Device name is required' });
  }
  db.run('UPDATE devices SET name = ? WHERE id = ?', [name, deviceId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to update device' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Device not found' });
    }
    res.json({ message: 'Device updated' });
  });
});

app.post('/sensor-data', (req, res) => {
  const { temperature, humidity, pressure, other, deviceKey, deviceName } = req.body;
  if (typeof temperature !== 'number' || typeof humidity !== 'number') {
    return res.status(400).json({ error: 'temperature and humidity must be numeric values' });
  }

  const normalizedKey = String(deviceKey || 'unknown').trim() || 'unknown';
  const normalizedName = String(deviceName || '').trim();
  const timestamp = new Date().toISOString();

  const findOrCreateDevice = (callback) => {
    db.get('SELECT * FROM devices WHERE device_key = ?', [normalizedKey], (err, device) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to lookup device' });
      }
      if (device) {
        callback(device);
      } else {
        const defaultName = normalizedName || `ESP32 ${normalizedKey.slice(-4)}`;
        db.run(
          'INSERT INTO devices (device_key, name, last_seen, last_temperature, last_humidity, last_pressure, last_other) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [normalizedKey, defaultName, timestamp, temperature, humidity, pressure || null, other || ''],
          function (insertErr) {
            if (insertErr) {
              return res.status(500).json({ error: 'Failed to register device' });
            }
            db.get('SELECT * FROM devices WHERE id = ?', [this.lastID], (getErr, newDevice) => {
              if (getErr || !newDevice) {
                return res.status(500).json({ error: 'Failed to lookup new device' });
              }
              callback(newDevice);
            });
          }
        );
      }
    });
  };

  findOrCreateDevice((device) => {
    if (!device.name && normalizedName) {
      db.run('UPDATE devices SET name = ? WHERE id = ?', [normalizedName, device.id]);
    }
    db.run(
      'UPDATE devices SET last_seen = ?, last_temperature = ?, last_humidity = ?, last_pressure = ?, last_other = ? WHERE id = ?',
      [timestamp, temperature, humidity, pressure || null, other || '', device.id],
      (updateErr) => {
        if (updateErr) {
          console.error('Failed to update device status:', updateErr.message);
        }
        const params = [temperature, humidity, pressure || null, other || '', timestamp, device.id];
        const sql = 'INSERT INTO sensor_data (temperature, humidity, pressure, other, timestamp, device_id) VALUES (?, ?, ?, ?, ?, ?)';

        db.run(sql, params, function (err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to save sensor data' });
          }
          const reading = {
            id: this.lastID,
            temperature,
            humidity,
            pressure: pressure || null,
            other: other || '',
            timestamp,
            deviceId: device.id,
            deviceKey: device.device_key,
            deviceName: device.name
          };
          io.emit('sensor-update', reading);
          res.status(201).json({ message: 'Sensor data saved', reading, device });
        });
      }
    );
  });
});

app.get('/sensor-data', authenticateToken, (req, res) => {
  const { start, end, deviceId, deviceKey } = req.query;
  let sql = 'SELECT id, temperature, humidity, pressure, other, timestamp, device_id AS deviceId FROM sensor_data WHERE 1=1';
  const params = [];
  sql = buildQueryWithDate(sql, params, start, end);
  if (deviceId) {
    sql += ' AND device_id = ?';
    params.push(deviceId);
  }
  if (deviceKey) {
    sql += ' AND device_id = (SELECT id FROM devices WHERE device_key = ?)';
    params.push(deviceKey);
  }
  sql += ' ORDER BY timestamp ASC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to fetch sensor data' });
    }
    res.json(rows);
  });
});

app.get('/export/csv', authenticateToken, (req, res) => {
  const { start, end } = req.query;
  let sql = 'SELECT id, temperature, humidity, pressure, other, timestamp FROM sensor_data WHERE 1=1';
  const params = [];
  sql = buildQueryWithDate(sql, params, start, end);
  sql += ' ORDER BY timestamp ASC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Export failed' });
    }
    const csvRows = [
      'id,temperature,humidity,pressure,other,timestamp',
      ...rows.map((row) =>
        [row.id, row.temperature, row.humidity, row.pressure ?? '', JSON.stringify(row.other || ''), row.timestamp].join(',')
      )
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sensor-data.csv"');
    res.send(csvRows.join('\n'));
  });
});

app.get('/export/json', authenticateToken, (req, res) => {
  const { start, end } = req.query;
  let sql = 'SELECT id, temperature, humidity, pressure, other, timestamp FROM sensor_data WHERE 1=1';
  const params = [];
  sql = buildQueryWithDate(sql, params, start, end);
  sql += ' ORDER BY timestamp ASC';

  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Export failed' });
    }
    res.json(rows);
  });
});

app.get('/me', authenticateToken, (req, res) => {
  res.json({ id: req.user.id, username: req.user.username, role: req.user.role });
});

app.use((req, res) => {
  if (req.method !== 'GET') {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// -------------------------------------------------------------
// SERVER START & AUTO ADMIN ACCOUNT CREATION
// -------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);

  // 🛠 ယာယီအကောင့်အသစ် အလိုအလျောက် ဆောက်ပေးမည့်ကုဒ်
  const usernameNew = 'admin'; 
  const passwordNew = '12345678'; // သင်သုံးရမည့် Password
  const hashedPassword = bcrypt.hashSync(passwordNew, 10);
  
  db.run(
    'INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)',
    [usernameNew, hashedPassword, 'admin'],
    function(err) {
      if (!err) {
        console.log(`[SUCCESS] Admin Account Ensured: ${usernameNew} / ${passwordNew}`);
      } else {
        console.error(`[ERROR] Failed to ensure admin account:`, err.message);
      }
    }
  );
});