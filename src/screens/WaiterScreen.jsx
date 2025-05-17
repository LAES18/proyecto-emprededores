import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WaiterScreen = () => {
  const [dishes, setDishes] = useState([]);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [mesa, setMesa] = useState('');
  const [tipo, setTipo] = useState('todos');

  useEffect(() => {
    const fetchDishes = () => {
      let url = 'http://localhost:3001/dishes';
      if (tipo !== 'todos') {
        url += `?type=${tipo}`;
      }
      axios.get(url)
        .then(response => {
          // Si no hay imagen, asignar una por defecto según el tipo
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
  }, [tipo]);

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
    <div className="container mt-4">
      <h1 className="mb-4">Pantalla del Mesero</h1>
      <h2 className="mt-4">Carta de Platillos</h2>
      <div className="mb-3 row">
        <div className="col-md-4">
          <label className="form-label">Filtrar por tipo:</label>
          <select className="form-select" value={tipo} onChange={e => setTipo(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="desayuno">Desayuno</option>
            <option value="almuerzo">Almuerzo</option>
            <option value="cena">Cena</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Número de mesa:</label>
          <input className="form-control" type="text" value={mesa} onChange={e => setMesa(e.target.value)} placeholder="Ej: 5" />
        </div>
      </div>
      <div className="row g-3">
        {dishes.map(dish => (
          <div className="col-6 col-md-3" key={dish.id}>
            <div className="card h-100 shadow-sm" style={{ minHeight: 220 }}>
              {dish.image && (
                <img src={dish.image} alt={dish.name} className="card-img-top" style={{ height: 120, objectFit: 'cover', borderTopLeftRadius: '0.5rem', borderTopRightRadius: '0.5rem' }} />
              )}
              <div className="card-body d-flex flex-column justify-content-between">
                <div>
                  <h5 className="card-title mb-1">{dish.name}</h5>
                  <span className="badge bg-secondary mb-2">{dish.type}</span>
                  <p className="card-text fw-bold">${dish.price}</p>
                </div>
                <button className="btn btn-primary mt-2 w-100" onClick={() => handleSelectDish(dish)}>Agregar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <h2 className="mt-4">Orden seleccionada</h2>
      <ul className="list-group mb-3">
        {selectedDishes.map((dish, index) => (
          <li className="list-group-item d-flex justify-content-between align-items-center" key={index}>
            {dish.name} <span className="badge bg-info">{dish.type}</span>
            <span>${dish.price}</span>
            <button className="btn btn-danger btn-sm" onClick={() => handleRemoveDish(index)}>Quitar</button>
          </li>
        ))}
      </ul>
      <button className="btn btn-success" onClick={handleSendOrder} disabled={selectedDishes.length === 0}>Enviar Orden</button>
    </div>
  );
};

export default WaiterScreen;