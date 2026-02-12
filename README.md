# IoT Parking System

## Project Overview
This project is a full-stack IoT solution designed for monitoring and managing a parking lot in real-time. It consists of a robust Node.js backend that handles secure data ingestion from IoT sensors and a modern React frontend for data visualization.

## System Architecture
1. **IoT Nodes (Hardware)**: Arduinos or similar devices that monitor parking spots and send signed messages via MQTT.
2. **Backend (Node.js)**: 
    - Subscribes to MQTT topics.
    - Verifies message authenticity using HMAC-SHA256.
    - Serves data via a REST API.
    - Sends notifications (Discord) on critical events.
3. **Frontend (React)**:
    - Provides a real-time dashboard.
    - Features an interactive 3D background visualizing the sensor network.
    - Includes administrative tools for system management.

## Project Structure
- `iot-dashboard/`: The React-based frontend application.
- `iot-dashboard_back/`: The Node.js backend service.

## Getting Started
To run the entire system locally:

1. **Start the Backend**:
   ```bash
   cd iot-dashboard_back
   npm install
   # Configure your .env file
   node server.js
   ```

2. **Start the Frontend**:
   ```bash
   cd iot-dashboard
   npm install
   npm run dev
   ```

## Security
The system ensures data integrity through a "blockchain-lite" approach where each message from a sensor contains a signature and a reference to the previous signature, preventing replay and tampering attacks.
