# ESP32 Sensor Dashboard

A full-stack real-time dashboard for ESP32 sensor data with export and authentication support.

## Structure
- `client/` - frontend dashboard UI with Chart.js
- `server/` - Node.js + Express backend with SQLite storage and Socket.io updates
- `esp32/` - Arduino example code for sending temperature/humidity JSON to the dashboard

## Run the backend
1. Open a terminal in `server/`
2. Run `npm install`
3. Start the server with `npm start`
4. Open `http://localhost:3000`

## Default account
- Username: `admin`
- Password: `admin123`

## ESP32 setup
- Update `SSID`, `PASSWORD`, and `serverUrl` in `esp32/esp32_sensor_post.ino`
- Upload to your ESP32

## Features
- Real-time WebSocket dashboard updates
- Historical sensor data storage
- Export filtered data to CSV and JSON
- Login authentication and date range filtering
