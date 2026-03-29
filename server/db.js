const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(__dirname, 'data', 'sensors.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open SQLite database:', err.message);
    process.exit(1);
  }
});

const createTables = () => {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS sensor_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        temperature REAL NOT NULL,
        humidity REAL NOT NULL,
        pressure REAL,
        other TEXT,
        timestamp TEXT NOT NULL,
        device_id INTEGER
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_key TEXT UNIQUE NOT NULL,
        name TEXT,
        last_seen TEXT,
        last_temperature REAL,
        last_humidity REAL,
        last_pressure REAL,
        last_other TEXT
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
      )
    `);

    const ensureDefaultAdmin = () => {
      const defaultUser = 'admin';
      const defaultPassword = 'admin123';
      const hashedPassword = bcrypt.hashSync(defaultPassword, 10);

      db.get('SELECT id, role FROM users WHERE username = ?', [defaultUser], (err, row) => {
        if (err) {
          console.error('Error checking default user:', err.message);
          return;
        }
        if (!row) {
          db.run(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [defaultUser, hashedPassword, 'admin'],
            (insertErr) => {
              if (insertErr) {
                console.error('Failed to insert default user:', insertErr.message);
              } else {
                console.log(`Created default admin user: ${defaultUser} / ${defaultPassword}`);
              }
            }
          );
        } else if (row.role !== 'admin') {
          db.run('UPDATE users SET role = ? WHERE id = ?', ['admin', row.id], (updateErr) => {
            if (updateErr) {
              console.error('Failed to update admin role:', updateErr.message);
            } else {
              console.log(`Updated default user role to admin for: ${defaultUser}`);
            }
          });
        }
      });
    };

    db.all('PRAGMA table_info(sensor_data)', (err, columns) => {
      if (err) {
        console.error('Error checking sensor_data table columns:', err.message);
        return;
      }
      const hasDeviceId = columns.some((column) => column.name === 'device_id');
      if (!hasDeviceId) {
        db.run('ALTER TABLE sensor_data ADD COLUMN device_id INTEGER', (alterErr) => {
          if (alterErr) {
            console.error('Failed to add device_id column to sensor_data table:', alterErr.message);
          }
        });
      }
    });

    db.all('PRAGMA table_info(users)', (err, columns) => {
      if (err) {
        console.error('Error checking users table columns:', err.message);
        return;
      }
      const hasRole = columns.some((column) => column.name === 'role');
      if (!hasRole) {
        db.run("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'", (alterErr) => {
          if (alterErr) {
            console.error('Failed to add role column to users table:', alterErr.message);
          }
          ensureDefaultAdmin();
        });
      } else {
        ensureDefaultAdmin();
      }
    });
  });
};

createTables();

module.exports = { db };
