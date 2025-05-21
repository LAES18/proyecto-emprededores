import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? '/api'
    : 'http://localhost:3001/api');

const KitchenScreen = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = () => {
      axios.get(`${API_URL}/orders`)
        .then(response => {
          // Mostrar solo órdenes pendientes o en_proceso
          const filteredOrders = response.data.filter(order => order.status === 'pendiente' || order.status === 'en_proceso');
          setOrders(filteredOrders);
        })
        .catch(error => console.error('Error al obtener las órdenes:', error));
    };
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsReady = (orderId) => {
    axios.patch(`${API_URL}/orders/${orderId}`, { status: 'servido' })
      .then(() => {
        alert('Orden marcada como lista');
        setOrders(orders.filter(order => order.id !== orderId));
      })
      .catch(error => console.error('Error al actualizar la orden:', error));
  };

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">👨‍🍳 Pantalla de la Cocina</h1>

      <div className="row">
        {orders.map(order => (
          <div className="col-md-6 mb-4" key={order.id}>
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Orden #{order.id} - Mesa {order.mesa || 'N/A'}</h5>
                <ul className="list-unstyled">
                  {order.dishes && order.dishes.map((dish, i) => (
                    <li key={i}>{dish.name} ({dish.type}) - ${dish.price}</li>
                  ))}
                </ul>
                <button className="btn btn-success" onClick={() => handleMarkAsReady(order.id)}>Marcar como lista</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KitchenScreen;