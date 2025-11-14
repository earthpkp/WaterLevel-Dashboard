import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ObserveData from './pages/ObserveData';
import './App.css';

function Navigation() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <span className="nav-logo"></span>
          <span className="nav-title">???????????????</span>
        </div>
        <div className="nav-links">
          <Link 
            to="/" 
            className={'nav-link ' + (location.pathname === '/' ? 'active' : '')}
          >
             Dashboard
          </Link>
          <Link 
            to="/observe-data" 
            className={'nav-link ' + (location.pathname === '/observe-data' ? 'active' : '')}
          >
             ???? Observe
          </Link>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
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
