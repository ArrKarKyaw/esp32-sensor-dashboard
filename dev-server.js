const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env.local'), quiet: true });
require('dotenv').config({ quiet: true });

const express = require('express');

const app = express();
const clientDir = path.join(__dirname, 'client');
const apiRoutes = {
  '/api/devices': require('./api/devices'),
  '/api/get-sensor': require('./api/get-sensor'),
  '/api/login': require('./api/login'),
  '/api/sensor': require('./api/sensor'),
  '/api/users': require('./api/users'),
};
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

for (const [routePath, handler] of Object.entries(apiRoutes)) {
  app.all(routePath, async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(`Local route error on ${routePath}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Local development server error' });
      }
    }
  });
}

app.use(express.static(clientDir));

app.get('/', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(port, '127.0.0.1', () => {
  console.log(`ESP32 Sensor Dashboard running at http://127.0.0.1:${port}`);
});
