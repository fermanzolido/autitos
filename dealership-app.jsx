import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

// --- INSTRUCCIONES DE CONFIGURACIÓN ---
// 1. Reemplaza el objeto `firebaseConfig` con la configuración de tu propio proyecto de Firebase.
// 2. Asegúrate de que tu `index.html` incluya TailwindCSS a través del CDN.
// 3. Habilita la autenticación por Email/Contraseña en tu proyecto de Firebase.
// 4. Configura las reglas de Firestore para mayor seguridad en producción.
// 5. Para que los roles (admin, factory, dealer) funcionen, debes configurar Custom Claims
//    para los usuarios en Firebase. Esto generalmente se hace a través de una Cloud Function
//    que se dispara al crear un usuario o mediante el Admin SDK en un backend.
//    Ejemplo de cómo hacerlo con el Admin SDK (en un entorno de Node.js):
//    admin.auth().setCustomUserClaims(uid, { role: 'admin', dealerId: 'some-dealer-id' }); // Opcional dealerId

// --- SDK de Firebase ---
// En un proyecto real, instalarías estos paquetes vía npm/yarn.
// Como se solicita un solo archivo, asumimos que se cargarán de alguna manera,
// o se usarán los scripts en `index.html` con compatibilidad de módulos ES.
// Por simplicidad, aquí usaremos nombres de importación estándar.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import {
    getFirestore, collection, onSnapshot, doc, addDoc,
    updateDoc, deleteDoc, writeBatch, serverTimestamp, query, where
} from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- INICIALIZACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_STORAGE_BUCKET",
  messagingSenderId: "TU_MESSAGING_SENDER_ID",
  appId: "TU_APP_ID"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);


// --- HOOKS PERSONALIZADOS ---

/**
 * Hook para gestionar la autenticación y el rol del usuario.
 */
function useAuth() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userClaims, setUserClaims] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const idTokenResult = await firebaseUser.getIdTokenResult(true); // Forzar recarga de token
        const claims = idTokenResult.claims;
        setUser(firebaseUser);
        setRole(claims.role || null);
        setUserClaims(claims);
      } else {
        setUser(null);
        setRole(null);
        setUserClaims(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, role, userClaims, loading };
}

/**
 * Hook genérico para suscribirse a una colección de Firestore en tiempo real.
 * @param {string} collectionName - El nombre de la colección.
 * @param {Array} queryConstraints - Array de condiciones de consulta de Firestore (ej: where("status", "==", "vendido")).
 */
function useFirestoreCollection(collectionName, queryConstraints = []) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const memoizedConstraints = useMemo(() => queryConstraints, [JSON.stringify(queryConstraints)]);

  useEffect(() => {
    if (!collectionName) return;

    setLoading(true);
    const collRef = collection(db, collectionName);
    const q = query(collRef, ...memoizedConstraints);

    const unsubscribe = onSnapshot(q, snapshot => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setData(items);
      setLoading(false);
    }, error => {
      console.error(`Error fetching ${collectionName}:`, error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [collectionName, memoizedConstraints]);

  return { data, loading };
}


// --- COMPONENTES DE UI ---

function Notification({ message, type, onDismiss }) {
  if (!message) return null;
  const baseClasses = "fixed top-5 right-5 p-4 rounded-md shadow-lg text-white transition-opacity duration-300 z-50";
  const typeClasses = { success: "bg-green-500", error: "bg-red-500" };
  useEffect(() => { const timer = setTimeout(onDismiss, 5000); return () => clearTimeout(timer); }, [onDismiss]);
  return (
    <div className={`${baseClasses} ${typeClasses[type]}`}>
      <span>{message}</span>
      <button onClick={onDismiss} className="ml-4 font-bold">X</button>
    </div>
  );
}

function Spinner() {
    return (
        <div className="flex justify-center items-center h-full"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div></div>
    );
}

function Modal({ show, onClose, title, children }) {
    if (!show) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-2xl">&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
}


// --- PÁGINAS DE LA APLICACIÓN ---

function LoginPage({ setNotification }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setNotification({ type: 'error', message: 'Credenciales inválidas o error de red.' });
      console.error("Error de inicio de sesión:", err);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Iniciar Sesión</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Contraseña</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required />
          </div>
          <button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full disabled:bg-blue-300">
              {loading ? 'Iniciando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardPage() {
    const { data: vehicles } = useFirestoreCollection('vehicles');
    const { data: sales } = useFirestoreCollection('sales');
    const { data: dealers } = useFirestoreCollection('dealers');
    const stats = useMemo(() => ({
        vehiclesInStock: vehicles.filter(v => v.status !== 'vendido').length,
        totalSales: sales.length,
        totalDealers: dealers.length,
    }), [vehicles, sales, dealers]);

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-lg font-semibold">Vehículos en Stock</h3><p className="text-4xl font-bold text-blue-600">{stats.vehiclesInStock}</p></div>
                <div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-lg font-semibold">Ventas Totales</h3><p className="text-4xl font-bold text-green-600">{stats.totalSales}</p></div>
                <div className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-lg font-semibold">Concesionarios</h3><p className="text-4xl font-bold text-purple-600">{stats.totalDealers}</p></div>
            </div>
        </div>
    );
}

// ... (El resto de los componentes de página se actualizarán de forma similar)

/**
 * Componente para el formulario de Vehículo
 */
function DealerForm({ dealer, onSave, onCancel, setNotification }) {
    const [formData, setFormData] = useState({
        name: '', address: '', territory: '', ...dealer
    });

    const handleChange = e => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!formData.name || !formData.address) {
            setNotification({ type: 'error', message: 'Nombre y Dirección son obligatorios.' });
            return;
        }
        await onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Nombre" className="border p-2 rounded w-full" />
            <input name="address" value={formData.address} onChange={handleChange} placeholder="Dirección" className="border p-2 rounded w-full" />
            <input name="territory" value={formData.territory} onChange={handleChange} placeholder="Territorio" className="border p-2 rounded w-full" />
            <div className="flex justify-end gap-4">
                <button type="button" onClick={onCancel} className="bg-gray-500 text-white px-4 py-2 rounded">Cancelar</button>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Guardar</button>
            </div>
        </form>
    );
}

function VehicleForm({ vehicle, onSave, onCancel, setNotification }) {
    const [formData, setFormData] = useState({
        make: '', model: '', version: '', vin: '', color: '', price: 0, status: 'enFabrica', ...vehicle
    });

    const handleChange = e => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'price' ? Number(value) : value }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!formData.make || !formData.vin || !formData.price) {
            setNotification({ type: 'error', message: 'Marca, VIN y Precio son obligatorios.' });
            return;
        }
        await onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="make" value={formData.make} onChange={handleChange} placeholder="Marca" className="border p-2 rounded w-full" />
            <input name="model" value={formData.model} onChange={handleChange} placeholder="Modelo" className="border p-2 rounded w-full" />
            <input name="version" value={formData.version} onChange={handleChange} placeholder="Versión" className="border p-2 rounded w-full" />
            <input name="vin" value={formData.vin} onChange={handleChange} placeholder="VIN" className="border p-2 rounded w-full" />
            <input name="color" value={formData.color} onChange={handleChange} placeholder="Color" className="border p-2 rounded w-full" />
            <input name="price" type="number" value={formData.price} onChange={handleChange} placeholder="Precio" className="border p-2 rounded w-full" />
            <select name="status" value={formData.status} onChange={handleChange} className="border p-2 rounded w-full">
                <option value="enFabrica">En Fábrica</option>
                <option value="enTransito">En Tránsito</option>
                <option value="enConcesionario">En Concesionario</option>
                <option value="vendido">Vendido</option>
            </select>
            <div className="flex justify-end gap-4">
                <button type="button" onClick={onCancel} className="bg-gray-500 text-white px-4 py-2 rounded">Cancelar</button>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Guardar</button>
            </div>
        </form>
    );
}

function VehiclesPage({ role, userClaims, setNotification }) {
    const queryConstraints = useMemo(() => {
        if (role === 'dealer' && userClaims?.dealerId) {
            return [where('dealerId', '==', userClaims.dealerId)];
        }
        return [];
    }, [role, userClaims]);

    const { data: vehicles, loading } = useFirestoreCollection('vehicles', queryConstraints);
    const { data: dealers } = useFirestoreCollection('dealers');
    const [filters, setFilters] = useState({ status: '', make: '', model: '' });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);

    const handleSaveVehicle = async (vehicleData) => {
        try {
            if (vehicleData.id) {
                const { id, ...data } = vehicleData;
                await updateDoc(doc(db, 'vehicles', id), data);
                setNotification({ type: 'success', message: 'Vehículo actualizado.' });
            } else {
                await addDoc(collection(db, 'vehicles'), vehicleData);
                setNotification({ type: 'success', message: 'Vehículo creado.' });
            }
            setIsModalOpen(false);
            setEditingVehicle(null);
        } catch (error) {
            setNotification({ type: 'error', message: 'Error al guardar el vehículo.' });
            console.error(error);
        }
    };

    const handleDeleteVehicle = async (id) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este vehículo?')) {
            try {
                await deleteDoc(doc(db, 'vehicles', id));
                setNotification({ type: 'success', message: 'Vehículo eliminado.' });
            } catch (error) {
                setNotification({ type: 'error', message: 'Error al eliminar.' });
            }
        }
    };

    const handleAssignDealer = async (vehicleId, dealerId) => {
        try {
            await updateDoc(doc(db, 'vehicles', vehicleId), { dealerId });
            setNotification({ type: 'success', message: 'Concesionario asignado.' });
        } catch (error) {
            setNotification({ type: 'error', message: 'Error al asignar.' });
        }
    };

    const filteredVehicles = useMemo(() => vehicles.filter(v =>
        (filters.status ? v.status === filters.status : true) &&
        (filters.make ? v.make.toLowerCase().includes(filters.make.toLowerCase()) : true) &&
        (filters.model ? v.model.toLowerCase().includes(filters.model.toLowerCase()) : true)
    ), [vehicles, filters]);

    if (loading) return <Spinner />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Vehículos</h1>
                {(role === 'admin' || role === 'factory') && (
                    <button onClick={() => { setEditingVehicle(null); setIsModalOpen(true); }} className="bg-blue-500 text-white px-4 py-2 rounded shadow">Añadir Vehículo</button>
                )}
            </div>

            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingVehicle ? "Editar Vehículo" : "Añadir Vehículo"}>
                <VehicleForm vehicle={editingVehicle} onSave={handleSaveVehicle} onCancel={() => setIsModalOpen(false)} setNotification={setNotification} />
            </Modal>

            <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg shadow">
                <input type="text" placeholder="Filtrar por Marca" onChange={e => setFilters({...filters, make: e.target.value})} className="border p-2 rounded"/>
                <input type="text" placeholder="Filtrar por Modelo" onChange={e => setFilters({...filters, model: e.target.value})} className="border p-2 rounded"/>
                <select onChange={e => setFilters({...filters, status: e.target.value})} className="border p-2 rounded">
                    <option value="">Todos los Estados</option>
                    <option value="enFabrica">En Fábrica</option><option value="enTransito">En Tránsito</option>
                    <option value="enConcesionario">En Concesionario</option><option value="vendido">Vendido</option>
                </select>
            </div>

            <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca/Modelo</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">VIN/Precio</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredVehicles.map(v => (
                            <tr key={v.id}>
                                <td className="px-6 py-4">{v.make} {v.model}</td>
                                <td className="px-6 py-4">{v.vin}<br/>${(v.price || 0).toLocaleString()}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                        v.status === 'vendido' ? 'bg-red-100 text-red-800' :
                                        v.status === 'enConcesionario' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>{v.status}</span>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium">
                                    {(role === 'admin' || role === 'factory') && (
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => { setEditingVehicle(v); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900">Editar</button>
                                            <button onClick={() => handleDeleteVehicle(v.id)} className="text-red-600 hover:text-red-900">Eliminar</button>
                                            <select onChange={(e) => handleAssignDealer(v.id, e.target.value)} value={v.dealerId || ""} className="border p-1 rounded text-xs">
                                                <option value="" disabled>Asignar...</option>
                                                {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                    )}
                                    {role === 'dealer' && <span className="text-gray-500">Sin acciones</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function DealersPage({ role, setNotification }) {
    if (role !== 'admin' && role !== 'factory') {
        return <div className="p-4">Acceso denegado. No tienes permisos para ver esta página.</div>;
    }

    const { data: dealers, loading } = useFirestoreCollection('dealers');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDealer, setEditingDealer] = useState(null);

    const handleSaveDealer = async (dealerData) => {
        if (role !== 'admin') {
            setNotification({ type: 'error', message: 'No tienes permisos para esta acción.' });
            return;
        }
        try {
            if (dealerData.id) {
                const { id, ...data } = dealerData;
                await updateDoc(doc(db, 'dealers', id), data);
                setNotification({ type: 'success', message: 'Concesionario actualizado.' });
            } else {
                await addDoc(collection(db, 'dealers'), dealerData);
                setNotification({ type: 'success', message: 'Concesionario creado.' });
            }
            setIsModalOpen(false);
            setEditingDealer(null);
        } catch (error) {
            setNotification({ type: 'error', message: 'Error al guardar el concesionario.' });
            console.error(error);
        }
    };

    const handleDeleteDealer = async (id) => {
        if (role !== 'admin') {
            setNotification({ type: 'error', message: 'No tienes permisos para esta acción.' });
            return;
        }
        if (window.confirm('¿Estás seguro de que quieres eliminar este concesionario?')) {
            try {
                await deleteDoc(doc(db, 'dealers', id));
                setNotification({ type: 'success', message: 'Concesionario eliminado.' });
            } catch (error) {
                setNotification({ type: 'error', message: 'Error al eliminar.' });
            }
        }
    };

    if (loading) return <Spinner />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Concesionarios</h1>
                {role === 'admin' && (
                    <button onClick={() => { setEditingDealer(null); setIsModalOpen(true); }} className="bg-blue-500 text-white px-4 py-2 rounded shadow">Añadir Concesionario</button>
                )}
            </div>

            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDealer ? "Editar Concesionario" : "Añadir Concesionario"}>
                <DealerForm dealer={editingDealer} onSave={handleSaveDealer} onCancel={() => setIsModalOpen(false)} setNotification={setNotification} />
            </Modal>

            <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dirección</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Territorio</th>
                            {role === 'admin' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {dealers.map(d => (
                            <tr key={d.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{d.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{d.address}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{d.territory}</td>
                                {role === 'admin' && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => { setEditingDealer(d); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900">Editar</button>
                                        <button onClick={() => handleDeleteDealer(d.id)} className="text-red-600 hover:text-red-900 ml-4">Eliminar</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function CustomerForm({ customer, onSave, onCancel, setNotification }) {
    const [formData, setFormData] = useState({
        name: '', dni: '', email: '', phone: '', ...customer
    });

    const handleChange = e => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!formData.name || !formData.dni) {
            setNotification({ type: 'error', message: 'Nombre y DNI son obligatorios.' });
            return;
        }
        await onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Nombre Completo" className="border p-2 rounded w-full" />
            <input name="dni" value={formData.dni} onChange={handleChange} placeholder="DNI" className="border p-2 rounded w-full" />
            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className="border p-2 rounded w-full" />
            <input name="phone" value={formData.phone} onChange={handleChange} placeholder="Teléfono" className="border p-2 rounded w-full" />
            <div className="flex justify-end gap-4">
                <button type="button" onClick={onCancel} className="bg-gray-500 text-white px-4 py-2 rounded">Cancelar</button>
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Guardar</button>
            </div>
        </form>
    );
}

function CustomersPage({ role, setNotification }) {
    if (role !== 'admin' && role !== 'dealer') {
        return <div className="p-4">Acceso denegado.</div>;
    }

    const { data: customers, loading } = useFirestoreCollection('customers');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    const handleSaveCustomer = async (customerData) => {
        try {
            if (customerData.id) { // Editing
                if (role !== 'admin') {
                    setNotification({ type: 'error', message: 'No tienes permisos para editar.' });
                    return;
                }
                const { id, ...data } = customerData;
                await updateDoc(doc(db, 'customers', id), data);
                setNotification({ type: 'success', message: 'Cliente actualizado.' });
            } else { // Creating
                await addDoc(collection(db, 'customers'), customerData);
                setNotification({ type: 'success', message: 'Cliente creado.' });
            }
            setIsModalOpen(false);
            setEditingCustomer(null);
        } catch (error) {
            setNotification({ type: 'error', message: 'Error al guardar el cliente.' });
            console.error(error);
        }
    };

    const handleDeleteCustomer = async (id) => {
        if (role !== 'admin') {
            setNotification({ type: 'error', message: 'No tienes permisos para eliminar.' });
            return;
        }
        if (window.confirm('¿Estás seguro de que quieres eliminar este cliente?')) {
            try {
                await deleteDoc(doc(db, 'customers', id));
                setNotification({ type: 'success', message: 'Cliente eliminado.' });
            } catch (error) {
                setNotification({ type: 'error', message: 'Error al eliminar.' });
            }
        }
    };

    if (loading) return <Spinner />;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Gestión de Clientes</h1>
                <button onClick={() => { setEditingCustomer(null); setIsModalOpen(true); }} className="bg-blue-500 text-white px-4 py-2 rounded shadow">Añadir Cliente</button>
            </div>

            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCustomer ? "Editar Cliente" : "Añadir Cliente"}>
                <CustomerForm customer={editingCustomer} onSave={handleSaveCustomer} onCancel={() => setIsModalOpen(false)} setNotification={setNotification} />
            </Modal>

            <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                            {role === 'admin' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {customers.map(c => (
                            <tr key={c.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{c.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{c.dni}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{c.email}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{c.phone}</td>
                                {role === 'admin' && (
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button onClick={() => { setEditingCustomer(c); setIsModalOpen(true); }} className="text-indigo-600 hover:text-indigo-900">Editar</button>
                                        <button onClick={() => handleDeleteCustomer(c.id)} className="text-red-600 hover:text-red-900 ml-4">Eliminar</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SalesPage({ role, userClaims, setNotification }) {
    const { data: sales, loading: loadingSales } = useFirestoreCollection('sales');
    const { data: customers, loading: loadingCustomers } = useFirestoreCollection('customers');

    const dealerId = userClaims?.dealerId;
    const vehicleQuery = useMemo(() => {
        if (role === 'dealer' && dealerId) {
            return [where('dealerId', '==', dealerId), where('status', '==', 'enConcesionario')];
        }
        return [where('status', '==', 'enConcesionario')]; // Admin ve todos
    }, [role, dealerId]);
    const { data: availableVehicles, loading: loadingVehicles } = useFirestoreCollection('vehicles', vehicleQuery);

    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [finalPrice, setFinalPrice] = useState('');
    const [isNewCustomer, setIsNewCustomer] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState({ name: '', dni: '', email: '', phone: '' });

    const handleNewCustomerChange = (e) => {
        const { name, value } = e.target;
        setNewCustomerData(prev => ({...prev, [name]: value}));
    };

    const resetForm = () => {
        setSelectedVehicle('');
        setSelectedCustomer('');
        setFinalPrice('');
        setIsNewCustomer(false);
        setNewCustomerData({ name: '', dni: '', email: '', phone: '' });
    };

    const handleRegisterSale = async (e) => {
        e.preventDefault();

        const customerId = isNewCustomer ? 'new' : selectedCustomer;
        if (!selectedVehicle || !customerId || !finalPrice || !dealerId) {
            setNotification({ type: 'error', message: 'Todos los campos son requeridos.' });
            return;
        }

        if (isNewCustomer && (!newCustomerData.name || !newCustomerData.dni)) {
            setNotification({ type: 'error', message: 'Nombre y DNI del nuevo cliente son obligatorios.' });
            return;
        }

        const batch = writeBatch(db);
        try {
            let finalCustomerId = selectedCustomer;

            if (isNewCustomer) {
                const newCustomerRef = doc(collection(db, 'customers'));
                batch.set(newCustomerRef, newCustomerData);
                finalCustomerId = newCustomerRef.id;
            }

            const saleRef = doc(collection(db, 'sales'));
            batch.set(saleRef, {
                vehicleId: selectedVehicle,
                customerId: finalCustomerId,
                dealerId: dealerId,
                saleDate: serverTimestamp(),
                finalPrice: Number(finalPrice)
            });

            const vehicleRef = doc(db, 'vehicles', selectedVehicle);
            batch.update(vehicleRef, { status: 'vendido' });

            await batch.commit();
            setNotification({ type: 'success', message: 'Venta registrada con éxito.' });
            resetForm();
        } catch (error) {
            setNotification({ type: 'error', message: 'Error al registrar la venta.' });
            console.error("Error registrando venta:", error);
        }
    };

    if (loadingSales || loadingCustomers || loadingVehicles) return <Spinner />;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Gestión de Ventas</h1>

            {(role === 'dealer' || role === 'admin') && (
                <div className="bg-white p-6 rounded-lg shadow mb-8">
                    <h2 className="text-xl font-semibold mb-4">Registrar Nueva Venta</h2>
                    <form onSubmit={handleRegisterSale} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Vehículo</label>
                            <select value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                <option value="" disabled>Seleccione un vehículo</option>
                                {availableVehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.vin})</option>)}
                            </select>
                        </div>

                        <div>
                            <div className="flex items-center mb-2">
                                <input type="checkbox" id="newCustomer" checked={isNewCustomer} onChange={(e) => setIsNewCustomer(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded"/>
                                <label htmlFor="newCustomer" className="ml-2 block text-sm text-gray-900">Crear Nuevo Cliente</label>
                            </div>

                            {isNewCustomer ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-md">
                                    <input name="name" value={newCustomerData.name} onChange={handleNewCustomerChange} placeholder="Nombre Completo" className="p-2 border rounded" />
                                    <input name="dni" value={newCustomerData.dni} onChange={handleNewCustomerChange} placeholder="DNI" className="p-2 border rounded" />
                                    <input name="email" type="email" value={newCustomerData.email} onChange={handleNewCustomerChange} placeholder="Email" className="p-2 border rounded" />
                                    <input name="phone" value={newCustomerData.phone} onChange={handleNewCustomerChange} placeholder="Teléfono" className="p-2 border rounded" />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Cliente Existente</label>
                                    <select value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                                        <option value="" disabled>Seleccione un cliente</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.dni})</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Precio Final</label>
                            <input type="number" value={finalPrice} onChange={e => setFinalPrice(e.target.value)} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
                        </div>

                        <button type="submit" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full">
                            Registrar Venta
                        </button>
                    </form>
                </div>
            )}

            <div className="bg-white p-4 rounded-lg shadow overflow-x-auto">
                 <h2 className="text-xl font-semibold mb-4">Historial de Ventas</h2>
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehículo ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente ID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Final</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sales.map(s => (
                            <tr key={s.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{s.saleDate?.toDate().toLocaleDateString() || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{s.vehicleId}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{s.customerId}</td>
                                <td className="px-6 py-4 whitespace-nowrap">${s.finalPrice.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- COMPONENTES DE LAYOUT ---

function Sidebar({ role, setCurrentPage, currentPage }) {
    const handleLogout = async () => { try { await signOut(auth); } catch (error) { console.error("Logout Error:", error); }};
    const navLinks = [
        { name: 'Dashboard', page: 'dashboard', roles: ['admin', 'factory', 'dealer'] },
        { name: 'Vehículos', page: 'vehicles', roles: ['admin', 'factory', 'dealer'] },
        { name: 'Concesionarios', page: 'dealers', roles: ['admin', 'factory'] },
        { name: 'Clientes', page: 'customers', roles: ['admin', 'dealer'] },
        { name: 'Ventas', page: 'sales', roles: ['admin', 'dealer'] },
    ];
    return (
        <div className="w-64 bg-gray-800 text-white flex flex-col min-h-screen">
            <div className="p-4 text-2xl font-bold border-b border-gray-700">Concesionario</div>
            <nav className="flex-1 p-2">
                {navLinks.filter(l => l.roles.includes(role)).map(link => (
                    <a key={link.page} href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(link.page); }}
                       className={`block py-2.5 px-4 rounded ${currentPage === link.page ? 'bg-gray-700' : 'hover:bg-gray-700'}`}>
                        {link.name}
                    </a>
                ))}
            </nav>
            <div className="p-4 border-t border-gray-700"><button onClick={handleLogout} className="w-full bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Cerrar Sesión</button></div>
        </div>
    );
}

function MainLayout({ user, role, userClaims, setNotification }) {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'vehicles': return <VehiclesPage role={role} userClaims={userClaims} setNotification={setNotification} />;
      case 'dealers': return <DealersPage role={role} setNotification={setNotification} />;
      case 'customers': return <CustomersPage role={role} setNotification={setNotification} />;
      case 'sales': return <SalesPage role={role} userClaims={userClaims} setNotification={setNotification} />;
      default: return <DashboardPage />;
    }
  };
  return (
    <div className="flex bg-gray-100">
      <Sidebar role={role} currentPage={currentPage} setCurrentPage={setCurrentPage} />
      <main className="flex-1 p-8 overflow-y-auto h-screen">{renderPage()}</main>
    </div>
  );
}

function App() {
  const { user, role, userClaims, loading } = useAuth();
  const [notification, setNotification] = useState({ message: '', type: '' });
  const handleDismiss = useCallback(() => setNotification({ message: '', type: '' }), []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;

  return (
    <>
      <Notification message={notification.message} type={notification.type} onDismiss={handleDismiss} />
      {user && role ? (
        <MainLayout user={user} role={role} userClaims={userClaims} setNotification={setNotification} />
      ) : (
        <LoginPage setNotification={setNotification} />
      )}
    </>
  );
}

// --- RENDERIZADO DE LA APP ---
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<React.StrictMode><App /></React.StrictMode>);
} else {
    console.error("El elemento 'root' no fue encontrado en el DOM.");
}
