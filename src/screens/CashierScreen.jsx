import React, { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? '/api'
    : 'http://localhost:3001/api');

const CashierScreen = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [error, setError] = useState('');
  const [lastInvoice, setLastInvoice] = useState(null);

  useEffect(() => {
    const fetchOrders = () => {
      axios.get(`${API_URL}/orders?status=servido`)
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

    axios.post(`${API_URL}/payments`, paymentData)
      .then(() => {
        alert('Pago procesado exitosamente');
        setOrders(orders.filter(order => !selectedOrders.includes(order)));
        setLastInvoice(selectedOrders);
        handleDownloadInvoice(selectedOrders); // Descargar factura automáticamente
        setSelectedOrders([]);
      })
      .catch(error => {
        console.error('Error al procesar el pago:', error);
        setError('Error al procesar el pago.');
      });
  };

  const handleDownloadInvoice = (ordersToPrint) => {
    const ticketWidth = 164; // 58mm aprox
    const margin = 10;
    const lineHeight = 16;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: [ticketWidth, 900]
    });
    let y = margin + 8;
    doc.setFontSize(14);
    doc.text('RESTAURANTE', ticketWidth / 2, y, { align: 'center' });
    y += lineHeight;
    doc.setFontSize(11);
    doc.text('Factura', ticketWidth / 2, y, { align: 'center' });
    y += lineHeight;
    doc.setLineWidth(0.7);
    doc.line(margin, y, ticketWidth - margin, y);
    y += 8;
    ordersToPrint.forEach(order => {
      doc.setFontSize(10.5);
      doc.text(`Orden #${order.id}  Mesa: ${order.mesa || 'N/A'}`, margin, y);
      y += lineHeight;
      order.dishes.forEach(dish => {
        doc.text(`${dish.name} (${dish.type})`, margin + 4, y);
        doc.text(`$${parseFloat(dish.price).toFixed(2)}`, ticketWidth - margin - 8, y, { align: 'right' });
        y += lineHeight;
      });
      y += 4;
      doc.setLineWidth(0.3);
      doc.line(margin, y, ticketWidth - margin, y);
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.text(
        `Total: $${order.dishes.reduce((sum, dish) => sum + parseFloat(dish.price || 0), 0).toFixed(2)}`,
        margin,
        y
      );
      doc.setFont('helvetica', 'normal');
      y += lineHeight + 2;
    });
    doc.setFontSize(10.5);
    doc.text(`Método de pago: ${ordersToPrint[0]?.paymentMethod || ''}`, margin, y);
    y += lineHeight;
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('¡Gracias por su compra!', ticketWidth / 2, y, { align: 'center' });
    doc.save('factura.pdf');
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
      {/* El botón manual de descarga de factura sigue disponible si se desea */}
      {lastInvoice && (
        <button className="cashier-pay-button mt-2" onClick={() => downloadTicket(lastInvoice)}>
          Descargar Factura Último Pago
        </button>
      )}
    </div>
  );
};

export default CashierScreen;