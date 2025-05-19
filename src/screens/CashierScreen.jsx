import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CashierScreen = () => {
  const [orders, setOrders] = useState([]);
  const [payment, setPayment] = useState({ orderId: '', total: '' });
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = () => {
      axios.get('http://localhost:3001/orders?status=servido')
        .then(response => {
          const filteredOrders = response.data.filter(order => order.status !== 'pagado');
          setOrders(filteredOrders);
        })
        .catch(error => console.error('Error fetching orders:', error));
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePayment = () => {
    if (!payment.orderId || !payment.total || isNaN(Number(payment.total)) || Number(payment.total) <= 0) {
      setError('Selecciona una orden válida y asegúrate de que el total sea mayor a 0.');
      return;
    }
    setError('');
    axios.post('http://localhost:3001/payments', {
      order_id: payment.orderId,
      total: payment.total,
      method: paymentMethod,
    })
      .then(() => {
        alert('Pago procesado exitosamente');
        setOrders(orders.filter(order => order.id !== parseInt(payment.orderId)));
        setPayment({ orderId: '', total: '' });
      })
      .catch(error => setError('Error al procesar el pago.'));
  };

  const handleSelectOrder = (order) => {
    const total = order.dishes.reduce((sum, dish) => sum + parseFloat(dish.price), 0);
    setPayment({ orderId: order.id, total: total.toFixed(2) });
  };

  return (
    <div>
      <h1>Pantalla del Cobrador</h1>
      <h2>Órdenes Servidas</h2>
      <ul className="list-group mb-3">
        {orders.map(order => (
          <li className="list-group-item" key={order.id} onClick={() => handleSelectOrder(order)} style={{ cursor: 'pointer' }}>
            <strong>Orden #{order.id} - Mesa {order.mesa || 'N/A'}</strong>
            <ul>
              {order.dishes && order.dishes.map((dish, i) => (
                <li key={i}>{dish.name} ({dish.type}) - ${dish.price}</li>
              ))}
            </ul>
            <span className="badge bg-info">Total: ${order.dishes.reduce((sum, dish) => sum + parseFloat(dish.price), 0).toFixed(2)}</span>
            <span className="ms-2 text-muted">(Haz clic para cobrar)</span>
          </li>
        ))}
      </ul>

      <h2>Procesar Pago</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <input
        type="number"
        placeholder="ID de la Orden"
        value={payment.orderId}
        onChange={(e) => setPayment({ ...payment, orderId: e.target.value })}
      />
      <input
        type="number"
        placeholder="Total"
        value={payment.total}
        onChange={(e) => setPayment({ ...payment, total: e.target.value })}
      />
      <select className="form-select mb-2" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
        <option value="efectivo">Efectivo</option>
        <option value="tarjeta">Tarjeta</option>
        <option value="transferencia">Transferencia</option>
      </select>
      <button onClick={handlePayment}>Procesar Pago</button>
    </div>
  );
};

export default CashierScreen;