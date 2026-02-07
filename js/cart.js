const storageKey = 'carrito';
let storageDisponible = true;
let carrito = [];

const verificarStorage = () => {
  try {
    const testKey = '__carrito_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('localStorage no está disponible.', error);
    return false;
  }
};

const cargarCarrito = () => {
  if (!storageDisponible) {
    return [];
  }

  try {
    const data = window.localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('No se pudo leer el carrito.', error);
    storageDisponible = false;
    return [];
  }
};

const guardarCarrito = () => {
  if (!storageDisponible) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(carrito));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('No se pudo guardar el carrito.', error);
    storageDisponible = false;
  }
};

storageDisponible = verificarStorage();
carrito = cargarCarrito();

const obtenerCarrito = () => carrito.map((item) => ({ ...item }));

const agregarProducto = (id) => {
  const item = carrito.find((producto) => producto.id === id);
  if (item) {
    item.cantidad += 1;
  } else {
    carrito.push({ id, cantidad: 1 });
  }
  guardarCarrito();
  return obtenerCarrito();
};

const quitarProducto = (id) => {
  const itemIndex = carrito.findIndex((producto) => producto.id === id);
  if (itemIndex === -1) {
    return obtenerCarrito();
  }

  if (carrito[itemIndex].cantidad > 1) {
    carrito[itemIndex].cantidad -= 1;
  } else {
    carrito.splice(itemIndex, 1);
  }

  guardarCarrito();
  return obtenerCarrito();
};

const vaciarCarrito = () => {
  carrito = [];
  guardarCarrito();
  return obtenerCarrito();
};

window.cart = {
  agregarProducto,
  quitarProducto,
  vaciarCarrito,
  obtenerCarrito,
  storageDisponible,
};
