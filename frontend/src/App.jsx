import { useState } from 'react'
import './App.css'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import MainLayout from './components/Layout/MainLayout'
import Login from './components/Pages/Login/login'
import { getAccessToken } from './api'
import { useBackendStore } from './store/backendStore';

const PrivateRoute = ({ children, backendStatus }) => {
  const token = getAccessToken();
  // && backendStatus==="online"
  return token  ? children : <Navigate to="/login" replace />;
};

export default function App() {
  const backendStatus = useBackendStore((state) => state.status);
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login backendStatus={backendStatus} />} />

        {/* Protected */}
        <Route
          path="/*"
          element={
            <PrivateRoute backendStatus={backendStatus}>
              <MainLayout backendStatus={backendStatus}/>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}