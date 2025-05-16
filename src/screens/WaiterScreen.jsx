import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WaiterScreen = () => {
  const [dishes, setDishes] = useState([]);
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [mesa, setMesa] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchDishes = (type) => {
    let url = 'http://localhost:3001/dishes';
    if (type && type !== 'todos') {
      url += `?type=${type}`;
    }
    axios.get(url)
      .then(response => setDishes(response.data))
      .catch(error => console.error('Error al obtener los platillos:', error));
  };

  useEffect(() => {
    fetchDishes(tipo);
  }, [tipo]);

  const handleSelectDish = (dish) => {
    if (!selectedDishes.find(d => d.id === dish.id)) {
      setSelectedDishes([...selectedDishes, dish]);
    }
  };

  const handleRemoveDish = (index) => {
    setSelectedDishes(selectedDishes.filter((_, i) => i !== index));
  };

  const validateMesa = (value) => {
    // Solo permitir números y no vacío
    return /^\d+$/.test(value);
  };

  const handleMesaChange = (e) => {
    const value = e.target.value;
    if (value === '' || validateMesa(value)) {
      setMesa(value);
    }
  };

  const totalPrice = selectedDishes.reduce((sum, dish) => sum + parseFloat(dish.price), 0).toFixed(2);

  const handleSendOrder = () => {
    if (!mesa) {
      setMessage({ type: 'error', text: 'Por favor, ingresa el número de mesa.' });
      return;
    }
    if (selectedDishes.length === 0) {
      setMessage({ type: 'error', text: 'Por favor, selecciona al menos un platillo.' });
      return;
    }
    setShowConfirm(true);
  };

  const confirmSendOrder = () => {
    setShowConfirm(false);
    setLoading(true);
    setMessage(null);
    const orderData = {
      dishes: selectedDishes.map(dish => ({ dish_id: dish.id })),
      user_id: 1, // Reemplazar con el usuario real
      mesa,
    };
    axios.post('http://localhost:3001/orders', orderData)
      .then(() => {
        setMessage({ type: 'success', text: 'Orden enviada exitosamente' });
        setSelectedDishes([]);
        setMesa('');
      })
      .catch(error => {
        console.error('Error al enviar la orden:', error);
        alert('Error al enviar la orden. Por favor verifica la consola para más detalles.');
        setMessage({ type: 'error', text: 'Error al enviar la orden. Intenta de nuevo.' });
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="container mt-4">
      <h1 className="mb-4">Pantalla del Mesero</h1>
      <div className="mb-3">
        <label className="form-label me-3">Filtrar por tipo:</label>
        {['todos', 'desayuno', 'almuerzo', 'cena'].map(typeOption => (
          <button
            key={typeOption}
            className={`btn me-2 ${tipo === typeOption ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setTipo(typeOption)}
          >
            {typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
          </button>
        ))}
      </div>
      <div className="mb-3 row">
        <div className="col-md-4">
          <label className="form-label">Número de mesa:</label>
          <input
            className="form-control"
            type="text"
            value={mesa}
            onChange={handleMesaChange}
            placeholder="Ej: 5"
            maxLength={3}
          />
        </div>
      </div>
      <h2 className="mt-4">Selecciona los platillos</h2>
      <div className="row" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {dishes.map(dish => (
          <div className="col-md-4 mb-3" key={dish.id}>
            <div className="card" style={{ boxShadow: 'none' }}>
              {dish.image && (
                <img src={dish.image} alt={dish.name} className="card-img-top" />
              )}
              <div className="card-body">
                <h5 className="card-title">{dish.name}</h5>
                <p className="card-text">Tipo: {dish.type}</p>
                <p className="card-text">Precio: ${dish.price}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => handleSelectDish(dish)}
                  disabled={selectedDishes.find(d => d.id === dish.id)}
                >
                  {selectedDishes.find(d => d.id === dish.id) ? 'Agregado' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <h2 className="mt-4">Orden seleccionada ({selectedDishes.length})</h2>
      <ul className="list-group mb-3">
        {selectedDishes.map((dish, index) => (
          <li className="list-group-item d-flex justify-content-between align-items-center" key={index}>
            {dish.name} - ${dish.price}
            <button className="btn btn-danger btn-sm" onClick={() => handleRemoveDish(index)}>Quitar</button>
          </li>
        ))}
      </ul>
      <p><strong>Total: </strong>${totalPrice}</p>
      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-danger' : 'alert-success'}`} role="alert">
          {message.text}
        </div>
      )}
      <button
        className="btn btn-success"
        onClick={handleSendOrder}
        disabled={selectedDishes.length === 0 || !mesa || loading}
      >
        {loading ? 'Enviando...' : 'Enviar Orden'}
      </button>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar Orden</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setShowConfirm(false)}></button>
              </div>
              <div className="modal-body">
                <p>¿Deseas enviar la orden para la mesa {mesa} con {selectedDishes.length} platillo(s)?</p>
                <ul>
                  {selectedDishes.map(dish => (
                    <li key={dish.id}>{dish.name} - ${dish.price}</li>
                  ))}
                </ul>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={confirmSendOrder}>Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WaiterScreen;
