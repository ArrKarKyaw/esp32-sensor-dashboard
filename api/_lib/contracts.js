function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function toNullableNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDoorStatus(value) {
  const rawValue = String(firstDefined(value, 'Unknown')).trim().toLowerCase();

  if (!rawValue) {
    return 'Unknown';
  }

  if (['open', 'opened', '1', 'true'].includes(rawValue)) {
    return 'Open';
  }

  if (['closed', 'close', '0', 'false'].includes(rawValue)) {
    return 'Closed';
  }

  return rawValue.charAt(0).toUpperCase() + rawValue.slice(1);
}

function normalizeSensorPayload(payload = {}) {
  const deviceId = firstDefined(
    payload.device_id,
    payload.deviceId,
    payload.device_key,
    payload.deviceKey,
    payload.ce_id
  );

  return {
    device_id: deviceId ? String(deviceId).trim() : '',
    device_name: firstDefined(payload.device_name, payload.deviceName, payload.name, null),
    temperature: toNullableNumber(payload.temperature),
    humidity: toNullableNumber(payload.humidity),
    pressure: toNullableNumber(payload.pressure),
    accel_x: toNullableNumber(firstDefined(payload.accel_x, payload.accelX, payload.vibration_x, payload.vibrationX)),
    accel_y: toNullableNumber(firstDefined(payload.accel_y, payload.accelY, payload.vibration_y, payload.vibrationY)),
    accel_z: toNullableNumber(firstDefined(payload.accel_z, payload.accelZ, payload.vibration_z, payload.vibrationZ)),
    door_status: normalizeDoorStatus(payload.door_status ?? payload.doorStatus),
  };
}

function normalizeSensorRecord(record = {}) {
  const normalizedPayload = normalizeSensorPayload(record);

  return {
    id: record.id,
    created_at: record.created_at,
    device_id: normalizedPayload.device_id,
    device_name: firstDefined(record.device_name, normalizedPayload.device_name, null),
    temperature: normalizedPayload.temperature,
    humidity: normalizedPayload.humidity,
    pressure: normalizedPayload.pressure,
    accel_x: normalizedPayload.accel_x,
    accel_y: normalizedPayload.accel_y,
    accel_z: normalizedPayload.accel_z,
    door_status: normalizedPayload.door_status,
    other: firstDefined(record.other, null),
  };
}

function normalizeDevicePayload(payload = {}) {
  const deviceKey = firstDefined(payload.device_key, payload.deviceKey, payload.id);

  return {
    device_key: deviceKey ? String(deviceKey).trim() : '',
    name: firstDefined(payload.name, payload.device_name, payload.deviceName, 'ESP32 Device'),
  };
}

module.exports = {
  normalizeDevicePayload,
  normalizeDoorStatus,
  normalizeSensorPayload,
  normalizeSensorRecord,
  toNullableNumber,
};
