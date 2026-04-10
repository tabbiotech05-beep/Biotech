import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import DashboardSelection from './DashboardSelection';

function App() {
  useEffect(() => {
    // Global axios interceptor for 401 errors
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && error.response.status === 401) {
          handleAuthError();
        }
        return Promise.reject(error);
      }
    );

    // Global fetch interceptor for 401 errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        handleAuthError();
      }
      return response;
    };

    function handleAuthError() {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      localStorage.removeItem('allowedDashboards');
      localStorage.removeItem('role');
      // Use window.location.href to force a full reload and redirect
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    return () => {
      axios.interceptors.response.eject(interceptor);
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard-selection" element={<DashboardSelection />} />
        <Route path="/dashboard/:dashboardId" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
