import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';

const CashierScreen = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = () => {
      axios.get('http://localhost:3001/orders?status=servido')
        .then(response => {
          setOrders(response.data);
        })
        .catch(error => console.error('Error fetching orders:', error));
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectOrder = (order) => {
    setSelectedOrders(prev => {
      if (prev.includes(order)) {
        return prev.filter(o => o.id !== order.id);
      } else {
        return [...prev, order];
      }
    });
  };

  const calculateTotal = () => {
    return selectedOrders.reduce((sum, order) => {
      return sum + order.dishes.reduce((dishSum, dish) => dishSum + parseFloat(dish.price || 0), 0);
    }, 0).toFixed(2);
  };

  const handlePayment = () => {
    if (selectedOrders.length === 0) {
      setError('Selecciona al menos una orden para procesar el pago.');
      return;
    }
    setError('');

    const paymentData = selectedOrders.map(order => ({
      order_id: order.id,
      total: order.dishes.reduce((sum, dish) => sum + parseFloat(dish.price || 0), 0),
      method: paymentMethod,
    }));

    console.log('Payment Data:', paymentData); // Debugging log

    axios.post('http://localhost:3001/payments', paymentData)
      .then(() => {
        alert('Pago procesado exitosamente');
        setOrders(orders.filter(order => !selectedOrders.includes(order)));
        setSelectedOrders([]);
      })
      .catch(error => {
        console.error('Error al procesar el pago:', error); // Debugging log
        setError('Error al procesar el pago.');
      });
  };

  return (
    <div className="cashier-container">
      <h1 className="cashier-title">💳 Pantalla del Cobrador</h1>

      <h2 className="cashier-section-title">Órdenes Servidas</h2>
      <ul className="cashier-orders-list">
        {orders.map(order => (
          <li
            className={`cashier-order-item ${selectedOrders.includes(order) ? 'selected' : ''}`}
            key={order.id}
            onClick={() => handleSelectOrder(order)}
          >
            <div>
              <strong>Orden #{order.id} - Mesa {order.mesa || 'N/A'}</strong>
              <ul className="cashier-dishes-list">
                {order.dishes.map((dish, i) => (
                  <li key={i}>{dish.name} ({dish.type}) - ${dish.price}</li>
                ))}
              </ul>
            </div>
            <span className="cashier-order-total">Total: ${order.dishes.reduce((sum, dish) => sum + parseFloat(dish.price), 0).toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <h2 className="cashier-section-title">Procesar Pago</h2>
      {error && <div className="cashier-error">{error}</div>}

      <div className="cashier-summary">
        <span>Total a pagar: ${calculateTotal()}</span>
      </div>

      <div className="cashier-payment-method">
        <label>Método de Pago:</label>
        <select
          value={paymentMethod}
          onChange={e => setPaymentMethod(e.target.value)}
        >
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
        </select>
      </div>

      <button className="cashier-pay-button" onClick={handlePayment}>Procesar Pago</button>
    </div>
  );
};

export default CashierScreen;