import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import App from './App';
import WaiterScreen from './screens/WaiterScreen';
import KitchenScreen from './screens/KitchenScreen';
import CashierScreen from './screens/CashierScreen';
import AdminScreen from './screens/AdminScreen';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/waiter" element={<WaiterScreen />} />
        <Route path="/kitchen" element={<KitchenScreen />} />
        <Route path="/cashier" element={<CashierScreen />} />
        <Route path="/admin" element={<AdminScreen />} />
      </Routes>
    </Router>
  </React.StrictMode>
);
