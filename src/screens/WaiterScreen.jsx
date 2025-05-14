import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WaiterScreen = () => {
  const [dishes, setDishes] = useState([]);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [mesa, setMesa] = useState('');
  const [tipo, setTipo] = useState('todos');

  useEffect(() => {
    axios.get('http://localhost:3001/dishes')
      .then(response => setDishes(response.data))
      .catch(error => console.error('Error al obtener los platillos:', error));
  }, []);

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
    const orderData = {
      dishes: selectedDishes.map(dish => ({ dish_id: dish.id })),
      user_id: 1, // Reemplazar con el usuario real
      mesa,
    };
    axios.post('http://localhost:3001/orders', orderData)
      .then(() => {
        alert('Orden enviada exitosamente');
        setSelectedDishes([]);
        setMesa('');
      })
      .catch(error => console.error('Error al enviar la orden:', error));
  };

  const filteredDishes = tipo === 'todos' ? dishes : dishes.filter(d => d.type === tipo);

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Pantalla del Mesero</h1>
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
      <h2 className="mt-4">Selecciona los platillos</h2>
      <div className="row">
        {filteredDishes.map(dish => (
          <div className="col-md-4 mb-3" key={dish.id}>
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">{dish.name}</h5>
                <p className="card-text">Tipo: {dish.type}</p>
                <p className="card-text">Precio: ${dish.price}</p>
                <button className="btn btn-primary" onClick={() => handleSelectDish(dish)}>Agregar</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <h2 className="mt-4">Orden seleccionada</h2>
      <ul className="list-group mb-3">
        {selectedDishes.map((dish, index) => (
          <li className="list-group-item d-flex justify-content-between align-items-center" key={index}>
            {dish.name}
            <button className="btn btn-danger btn-sm" onClick={() => handleRemoveDish(index)}>Quitar</button>
          </li>
        ))}
      </ul>
      <button className="btn btn-success" onClick={handleSendOrder} disabled={selectedDishes.length === 0}>Enviar Orden</button>
    </div>
  );
};

export default WaiterScreen;