import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ObserveData from './pages/ObserveData';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <div className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/observe-data" element={<ObserveData />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
