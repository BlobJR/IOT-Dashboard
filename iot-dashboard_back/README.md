# IoT Dashboard Backend

## Overview
This is the backend service for the IoT Parking Dashboard. It acts as a bridge between the physical IoT sensors (communicating via MQTT) and the web frontend.

## Key Features
- **MQTT Integration**: Connects to an external MQTT broker to receive real-time updates from parking sensors.
- **Security**: Implements HMAC-SHA256 signature verification for every incoming message to ensure data integrity and authenticity.
- **State Management**: Maintains the current state of parking availability (standard and handicap spaces).
- **Manual Override**: Provides a secure administrative API to manually adjust parking counts when necessary.
- **Alerting**: Integrates with Discord webhooks to notify administrators when the parking lot is full.
- **Time Sync**: Automatically synchronizes system time with connected IoT nodes.

## Tech Stack
- **Node.js**: Runtime environment.
- **Express**: Web framework for the REST API.
- **MQTT.js**: Client library for MQTT communication.
- **Crypto**: Built-in Node.js module for security.

## Configuration
The backend uses environment variables for sensitive configuration. Create a `.env` file in this directory:
```env
ADMIN_PASSWORD=your_secure_password
```

## API Endpoints
- `GET /api/data`: Returns the latest verified parking statistics.
- `POST /api/admin/reset`: Requires `password` and `count` to manually override the parking data.

## Setup
1. `npm install`
2. Configure `.env`
3. `node server.js`
