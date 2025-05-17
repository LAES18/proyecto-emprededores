import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WaiterScreen = () => {
  const [dishes, setDishes] = useState([]);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [mesa, setMesa] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [filteredDishes, setFilteredDishes] = useState([]);

  useEffect(() => {
    const fetchDishes = () => {
      axios.get('http://localhost:3001/dishes')
        .then(response => {
          const defaultImages = {
            desayuno: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
            almuerzo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80',
            cena: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
            default: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80',
          };
          const dishesWithImages = response.data.map(dish => ({
            ...dish,
            image: dish.image || defaultImages[dish.type] || defaultImages.default
          }));
          setDishes(dishesWithImages);
        })
        .catch(error => console.error('Error al obtener los platillos:', error));
    };
    fetchDishes();
  }, []);

  useEffect(() => {
    if (tipo === 'todos') {
      setFilteredDishes(dishes);
    } else {
      setFilteredDishes(dishes.filter(d => d.type === tipo));
    }
  }, [tipo, dishes]);

  const handleSelectDish = (dish) => {
    setSelectedDishes([...selectedDishes, dish]);
  };

  const handleRemoveDish = (index) => {
    setSelectedDishes(selectedDishes.filter((_, i) => i !== index));
  };

  const handleSendOrder = () => {
    if (!mesa) {
      alert('Por favor, ingresa el número de mesa.');
      return;
    }
    if (selectedDishes.length === 0) {
      alert('Selecciona al menos un platillo.');
      return;
    }
    const orderData = {
      dishes: selectedDishes.map(dish => ({ dish_id: dish.id })),
      user_id: 1, // Reemplazar con el usuario real si tienes auth
      mesa,
    };
    axios.post('http://localhost:3001/orders', orderData)
      .then(() => {
        alert('Orden enviada exitosamente');
        setSelectedDishes([]);
        setMesa('');
      })
      .catch(error => {
        alert('Error al enviar la orden');
        console.error('Error al enviar la orden:', error);
      });
  };

  return (
    <div className="container-fluid py-4 waiter-bg" style={{ minHeight: '100vh' }}>
      <h1 className="mb-4 text-center waiter-title">🍽️ Pantalla del Mesero</h1>
      <div className="row mb-4 justify-content-center">
        <div className="col-md-3 col-12 mb-2">
          <label className="form-label waiter-label">Filtrar por tipo:</label>
          <select className="form-select" value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="desayuno">Desayuno</option>
            <option value="almuerzo">Almuerzo</option>
            <option value="cena">Cena</option>
          </select>
        </div>
      </div>
      <h2 className="text-center waiter-section-title mb-3">Carta de Platillos</h2>
      <div className="row g-4 justify-content-center">
        {filteredDishes.map(dish => (
          <div className="col-12 col-sm-6 col-md-4 col-lg-3 d-flex align-items-stretch" key={dish.id}>
            <div className="card waiter-card flex-fill text-center p-2" style={{ minWidth: 0, maxWidth: 220, margin: '0 auto', borderRadius: 16, boxShadow: '0 4px 16px rgba(184, 92, 0, 0.12)' }}>
              {dish.image && (
                <img src={dish.image} alt={dish.name} className="card-img-top waiter-card-img mx-auto" style={{ height: 110, width: '100%', objectFit: 'cover', borderRadius: 12 }} />
              )}
              <div className="card-body p-2 d-flex flex-column justify-content-between">
                <div>
                  <h6 className="card-title mb-1 waiter-dish-name" style={{ fontSize: '1.05rem', minHeight: 32 }}>{dish.name}</h6>
                  <span className="badge waiter-badge mb-1" style={{ fontSize: '0.9rem' }}>{dish.type}</span>
                  <p className="card-text fw-bold waiter-price mb-1" style={{ fontSize: '1.05rem' }}>${dish.price}</p>
                </div>
                <button className="btn btn-primary btn-sm mt-1 waiter-add-btn" style={{ fontSize: '1rem' }} onClick={() => handleSelectDish(dish)}>Agregar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Carrito flotante mejorado */}
      <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 999 }}>
        <div className="card waiter-card shadow-lg" style={{ minWidth: 320, maxWidth: 350, borderRadius: 18 }}>
          <div className="card-body p-3">
            <h5 className="card-title waiter-section-title mb-3" style={{ fontSize: '1.2rem' }}>🛒 Carrito de Orden</h5>
            {selectedDishes.length === 0 ? (
              <div className="text-muted">No hay platillos en el carrito.</div>
            ) : (
              <ul className="list-group mb-3">
                {selectedDishes.map((dish, index) => (
                  <li className="list-group-item d-flex justify-content-between align-items-center waiter-order-item" key={index}>
                    <span>{dish.name} <span className="badge bg-info waiter-badge">{dish.type}</span> <span>${dish.price}</span></span>
                    <button className="btn btn-danger btn-sm waiter-remove-btn" onClick={() => handleRemoveDish(index)}>Quitar</button>
                  </li>
                ))}
              </ul>
            )}
            <div className="mb-2">
              <label className="form-label waiter-label">Número de mesa:</label>
              <input className="form-control" type="text" value={mesa} onChange={e => setMesa(e.target.value)} placeholder="Ej: 5" />
            </div>
            <button className="btn btn-success w-100 waiter-send-btn" onClick={handleSendOrder} disabled={selectedDishes.length === 0}>Enviar Orden a Cocina</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaiterScreen;