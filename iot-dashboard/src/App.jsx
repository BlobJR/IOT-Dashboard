import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import AnimatedBackground from './components/AnimatedBackground';
import Dashboard from './components/Dashboard';

function App() {
  return (
    <div className="app">
      <AnimatedBackground />
      <Dashboard />
    </div>
  );
}

export default App;