# IoT Dashboard

## Overview
The IoT Dashboard is a modern web application designed to receive and display numerical data from an IoT system. The application features a clean interface that allows users to easily view real-time data.

## Project Structure
```
iot-dashboard
├── src
│   ├── index.html          # Main HTML document for the web interface
│   ├── styles
│   │   └── style.css       # CSS styles for the web interface
│   ├── scripts
│   │   ├── app.js          # Main JavaScript file for application logic
│   │   └── api.js          # Functions for interacting with the IoT system's API
│   └── components
│       └── display.js      # Component for updating the display with received data
├── package.json             # Configuration file for npm
└── README.md                # Documentation for the project
```

## Setup Instructions
1. Clone the repository:
   ```
   git clone <repository-url>
   ```
2. Navigate to the project directory:
   ```
   cd iot-dashboard
   ```
3. Install the necessary dependencies:
   ```
   npm install
   ```

## Usage
- Open `src/index.html` in a web browser to view the dashboard.
- The application will automatically connect to the IoT system and display the received number.

## Features
- Real-time data display from an IoT system.
- Modern and clean user interface.
- Responsive design for various screen sizes.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.