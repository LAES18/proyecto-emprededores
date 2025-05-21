import React, { useState, useEffect } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';

// Define Spoonacular API key
const SPOONACULAR_API_KEY = "67ce982a724d41798877cf212f48d0de";

const AdminScreen = () => {
  const [activeTab, setActiveTab] = useState('platillos');
  const [dishes, setDishes] = useState([]);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [newDish, setNewDish] = useState({ name: '', price: '', type: 'desayuno' });
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [orderStatusFilter, setOrderStatusFilter] = useState('todos');
  const [mesaFilter, setMesaFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState("");
  const [spoonacularResults, setSpoonacularResults] = useState([]);
  const [loadingSpoonacular, setLoadingSpoonacular] = useState(false);
  const [errorSpoonacular, setErrorSpoonacular] = useState("");
  const [spoonacularTypeSelect, setSpoonacularTypeSelect] = useState({ show: false, item: null });
  const [selectedType, setSelectedType] = useState('desayuno');
  const [showAddUserForm, setShowAddUserForm] = useState(false);

  useEffect(() => {
    const fetchAll = () => {
      axios.get('http://localhost:3001/orders?status=pagado')
        .then(response => setOrders(response.data))
        .catch(error => console.error('Error al obtener las órdenes:', error));
      axios.get('http://localhost:3001/payments')
        .then(response => setPayments(response.data))
        .catch(error => console.error('Error al obtener los pagos:', error));
      axios.get('http://localhost:3001/dishes')
        .then(response => setDishes(response.data))
        .catch(error => console.error('Error al obtener los platillos:', error));
      axios.get('http://localhost:3001/users')
        .then(response => setUsers(response.data))
        .catch(error => console.error('Error al obtener los usuarios:', error));
    };
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddDish = () => {
    axios.post('http://localhost:3001/dishes', newDish)
      .then(() => {
        setNewDish({ name: '', price: '', type: 'desayuno' });
        axios.get('http://localhost:3001/dishes').then(r => setDishes(r.data));
      })
      .catch(error => console.error('Error al agregar el platillo:', error));
  };

  const handleDeleteDish = (dishId) => {
    axios.delete(`http://localhost:3001/dishes/${dishId}`)
      .then(() => {
        setDishes(dishes.filter(dish => dish.id !== dishId));
      })
      .catch(error => console.error('Error al eliminar el platillo:', error));
  };

  const handleAddUser = (newUser) => {
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.role) {
      alert("Por favor, completa todos los campos antes de agregar un usuario.");
      return;
    }
    axios.post('http://localhost:3001/register', newUser)
      .then(() => {
        setUsers([...users, newUser]);
        setNewUser({ name: '', email: '', password: '', role: '' }); // Limpiar formulario
      })
      .catch(error => console.error('Error al agregar el usuario:', error));
  };

  const handleDeleteUser = (userId) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      return;
    }
    axios.delete(`http://localhost:3001/users/${userId}`)
      .then(() => {
        setUsers(users.filter(user => user.id !== userId));
      })
      .catch(error => console.error('Error al eliminar el usuario:', error));
  };

  const handleEditUser = (userId, updatedUser) => {
    if (!updatedUser.name || !updatedUser.email || !updatedUser.password || !updatedUser.role) {
      alert("Por favor, completa todos los campos antes de editar el usuario.");
      return;
    }
    axios.put(`http://localhost:3001/users/${userId}`, updatedUser)
      .then(() => {
        setUsers(users.map(user => user.id === userId ? { ...user, ...updatedUser } : user));
      })
      .catch(error => console.error('Error al editar el usuario:', error));
  };

  const buscarPlatillosSpoonacular = async () => {
    setLoadingSpoonacular(true);
    setErrorSpoonacular("");
    try {
      const response = await axios.get(
        `https://api.spoonacular.com/food/menuItems/search?query=${encodeURIComponent(searchTerm)}&number=5&apiKey=${SPOONACULAR_API_KEY}`
      );
      setSpoonacularResults(response.data.menuItems || []);
    } catch (error) {
      setErrorSpoonacular("Error al buscar en Spoonacular");
    }
    setLoadingSpoonacular(false);
  };

  const agregarPlatilloDesdeSpoonacular = async (item, type) => {
    try {
      // Obtener detalles del platillo para el precio
      const response = await axios.get(
        `https://api.spoonacular.com/food/menuItems/${item.id}?apiKey=${SPOONACULAR_API_KEY}`
      );
      const price = response.data.price || 100; // Si no hay precio, poner 100 por defecto
      const newDish = {
        name: item.title,
        price: price,
        type: type,
        image: item.image
      };
      await axios.post('http://localhost:3001/dishes', newDish);
      setDishes([...dishes, newDish]);
      setSpoonacularTypeSelect({ show: false, item: null });
    } catch (error) {
      alert("Error al agregar el platillo desde Spoonacular");
    }
  };

  const filteredOrders = orders.filter(order => {
    const statusMatch = orderStatusFilter === 'todos' || order.status === orderStatusFilter;
    const mesaMatch = !mesaFilter || (order.mesa && order.mesa.toString().includes(mesaFilter));
    let fechaMatch = true;
    if (startDate) {
      fechaMatch = fechaMatch && order.created_at && order.created_at >= startDate;
    }
    if (endDate) {
      fechaMatch = fechaMatch && order.created_at && order.created_at <= endDate + ' 23:59:59';
    }
    return statusMatch && mesaMatch && fechaMatch;
  });

  return (
    <div className="container mt-5">
      <h1 className="text-center mb-4">⚙️ Pantalla del Administrador</h1>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link${activeTab === 'platillos' ? ' active' : ''}`} onClick={() => setActiveTab('platillos')}>Gestión de Platillos</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link${activeTab === 'ordenes' ? ' active' : ''}`} onClick={() => setActiveTab('ordenes')}>Órdenes</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link${activeTab === 'usuarios' ? ' active' : ''}`} onClick={() => setActiveTab('usuarios')}>Gestión de Usuarios</button>
        </li>
        <li className="nav-item">
          <button className={`nav-link${activeTab === 'pagos' ? ' active' : ''}`} onClick={() => setActiveTab('pagos')}>Pagos</button>
        </li>
      </ul>

      {activeTab === 'platillos' && (
        <div>
          <h2>Gestión de Platillos</h2>
          <div className="mb-3">
            <label className="form-label">Buscar platillo en Spoonacular:</label>
            <div className="input-group mb-2">
              <input
                type="text"
                className="form-control"
                placeholder="Ejemplo: pizza, pasta, hamburguesa..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <button className="btn btn-secondary" onClick={buscarPlatillosSpoonacular} disabled={loadingSpoonacular}>
                Buscar
              </button>
            </div>
            {loadingSpoonacular && <div>Buscando...</div>}
            {errorSpoonacular && <div className="text-danger">{errorSpoonacular}</div>}
            {spoonacularResults.length > 0 && (
              <ul className="list-group mb-2">
                {spoonacularResults.map(item => (
                  <li className="list-group-item d-flex align-items-center" key={item.id}>
                    <img src={item.image} alt={item.title} style={{width: 50, height: 50, objectFit: 'cover', marginRight: 10}} />
                    <span className="flex-grow-1">{item.title}</span>
                    <button className="btn btn-success btn-sm ms-2" onClick={() => setSpoonacularTypeSelect({ show: true, item })}>
                      Agregar
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {/* Selector de tipo para Spoonacular */}
            {spoonacularTypeSelect.show && (
              <div className="mb-3">
                <label className="form-label">Selecciona el tipo de platillo para "{spoonacularTypeSelect.item.title}":</label>
                <select className="form-select mb-2" value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                  <option value="desayuno">Desayuno</option>
                  <option value="almuerzo">Almuerzo</option>
                  <option value="cena">Cena</option>
                </select>
                <button className="btn btn-primary me-2" onClick={() => agregarPlatilloDesdeSpoonacular(spoonacularTypeSelect.item, selectedType)}>
                  Confirmar y agregar
                </button>
                <button className="btn btn-secondary" onClick={() => setSpoonacularTypeSelect({ show: false, item: null })}>
                  Cancelar
                </button>
              </div>
            )}
          </div>
          <ul className="list-group mb-3">
            {dishes.map(dish => (
              <li className="list-group-item d-flex justify-content-between align-items-center" key={dish.id}>
                {dish.name} - ${dish.price} <span className="badge bg-secondary">{dish.type}</span>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDish(dish.id)}>Eliminar</button>
              </li>
            ))}
          </ul>
          <h3>Agregar Nuevo Platillo</h3>
          <input
            type="text"
            className="form-control mb-2"
            placeholder="Nombre"
            value={newDish.name}
            onChange={(e) => setNewDish({ ...newDish, name: e.target.value })}
          />
          <input
            type="number"
            className="form-control mb-2"
            placeholder="Precio"
            value={newDish.price}
            onChange={(e) => setNewDish({ ...newDish, price: e.target.value })}
          />
          <select
            className="form-select mb-2"
            value={newDish.type}
            onChange={e => setNewDish({ ...newDish, type: e.target.value })}
          >
            <option value="desayuno">Desayuno</option>
            <option value="almuerzo">Almuerzo</option>
            <option value="cena">Cena</option>
          </select>
          <button className="btn btn-primary" onClick={handleAddDish}>Agregar</button>
        </div>
      )}
      {activeTab === 'ordenes' && (
        <div>
          <h2>Órdenes</h2>
          <div className="mb-2">
            <label className="form-label">Filtrar por estado:</label>
            <select className="form-select mb-2" value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="servido">Servido</option>
              <option value="pagado">Pagado</option>
            </select>
            <label className="form-label">Filtrar por mesa:</label>
            <input className="form-control" type="text" placeholder="Número de mesa" value={mesaFilter} onChange={e => setMesaFilter(e.target.value)} />
            <label className="form-label">Filtrar por fecha (inicio):</label>
            <input className="form-control mb-2" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <label className="form-label">Filtrar por fecha (fin):</label>
            <input className="form-control mb-2" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <ul className="list-group mb-3">
            {filteredOrders.map((order, index) => (
              <li className="list-group-item" key={order.id || index}>
                Orden #{order.id} - Mesa {order.mesa || 'N/A'} - Estado: {order.status}
                <ul>
                  {order.dishes && order.dishes.map((dish, dishIndex) => (
                    <li key={dishIndex}>{dish.name} ({dish.type}) - ${dish.price}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}
      {activeTab === 'usuarios' && (
        <div>
          <h2>Gestión de Usuarios</h2>
          <ul className="list-group mb-3">
            {users.map((user, index) => (
              <li className="list-group-item d-flex justify-content-between align-items-center" key={user.id || index}>
                {user.name} - {user.role}
                <div>
                  <button className="btn btn-warning btn-sm me-2" onClick={() => setEditingUser(user)}>Editar</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(user.id)}>Eliminar</button>
                </div>
              </li>
            ))}
          </ul>

          {editingUser && editingUser.id && (
            <div className="mb-3">
              <h3>Editar Usuario</h3>
              <input
                type="text"
                className="form-control mb-2"
                placeholder="Nombre"
                value={editingUser.name || ''}
                onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
              />
              <input
                type="email"
                className="form-control mb-2"
                placeholder="Email"
                value={editingUser.email || ''}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
              />
              <input
                type="password"
                className="form-control mb-2"
                placeholder="Contraseña"
                value={editingUser.password || ''}
                onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
              />
              <select
                className="form-select mb-2"
                value={editingUser.role || ''}
                onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
              >
                <option value="">Seleccionar Rol</option>
                <option value="administrador">Administrador</option>
                <option value="mesero">Mesero</option>
                <option value="cocina">Cocinero</option>
                <option value="cobrador">Cobrador</option>
              </select>
              <button className="btn btn-primary me-2" onClick={() => handleEditUser(editingUser.id, editingUser)}>Guardar Cambios</button>
              <button className="btn btn-secondary" onClick={() => setEditingUser(null)}>Cancelar</button>
            </div>
          )}

          <button className="btn btn-success mb-3" onClick={() => setShowAddUserForm(!showAddUserForm)}>
            {showAddUserForm ? 'Ocultar Formulario' : 'Agregar Usuario'}
          </button>

          {showAddUserForm && (
            <div className="mb-3">
              <h3>Agregar Nuevo Usuario</h3>
              <input
                type="text"
                className="form-control mb-2"
                placeholder="Nombre"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
              <input
                type="email"
                className="form-control mb-2"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
              <input
                type="password"
                className="form-control mb-2"
                placeholder="Contraseña"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
              <select
                className="form-select mb-2"
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
              >
                <option value="">Seleccionar Rol</option>
                <option value="administrador">Administrador</option>
                <option value="mesero">Mesero</option>
                <option value="cocina">Cocinero</option>
                <option value="cobrador">Cobrador</option>
              </select>
              <button className="btn btn-primary" onClick={() => handleAddUser(newUser)}>Agregar Usuario</button>
            </div>
          )}
        </div>
      )}
      {activeTab === 'pagos' && (
        <div>
          <h2>Pagos</h2>
          <ul className="list-group mb-3">
            {payments.map(payment => (
              <li className="list-group-item" key={payment.id}>
                Pago #{payment.id} - Orden #{payment.order_id} - Total: ${payment.total} - Método: {payment.method}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AdminScreen;