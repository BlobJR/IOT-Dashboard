# IoT Dashboard Frontend

## Overview
A modern, real-time web interface for monitoring the IoT Parking System. Built with React and Vite, it features a high-performance 3D background visualization using Three.js.

## Key Features
- **Real-time Monitoring**: Automatically polls the backend API every 3 seconds to update parking availability.
- **3D Visualization**: An interactive Three.js scene that provides a stylized representation of the parking lot and sensor activity.
- **Admin Controls**: Secure interface for authorized personnel to reset or force parking counts.
- **Responsive Design**: Optimized for various screen sizes using modern CSS techniques.

## Tech Stack
- **React**: UI library.
- **Vite**: Build tool and development server.
- **Three.js**: 3D engine for the background animation.
- **Three Postprocessing**: UnrealBloomPass for the "neon/cyber" aesthetic.

## Development Setup
1. `cd iot-dashboard`
2. `npm install`
3. `npm run dev`

## Folder Structure
- `src/api.js`: Handles all communication with the backend server.
- `src/components/Dashboard.jsx`: Main UI logic and state management for the statistics display.
- `src/components/AnimatedBackground.jsx`: Encapsulates the Three.js scene and animation loop.
- `src/App.jsx`: Entry point that composes the background and the dashboard overlay.
