class CarritoManager {
  constructor(storageKey = 'carrito') {
    this.storageKey = storageKey;
    this.storageDisponible = this.verificarStorage();
    this.observers = new Set();
    this.items = [];
    this.total = 0;
    this.actualizado = null;
    this.cargarCarrito();
    this.notificarCambios();
  }

  verificarStorage() {
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
  }

  cargarCarrito() {
    if (!this.storageDisponible) {
      return;
    }

    try {
      const data = window.localStorage.getItem(this.storageKey);
      if (!data) {
        return;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        this.items = parsed.map((item) => ({
          id: item.id,
          nombre: item.nombre,
          precio: item.precio,
          cantidad: item.cantidad ?? 1,
        }));
      } else if (Array.isArray(parsed?.items)) {
        this.items = parsed.items.map((item) => ({
          id: item.id,
          nombre: item.nombre,
          precio: item.precio,
          cantidad: item.cantidad ?? 1,
        }));
      }
      this.total = parsed?.total ?? this.calcularTotal();
      this.actualizado = parsed?.actualizado ?? null;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('No se pudo leer el carrito.', error);
      this.storageDisponible = false;
    }
  }

  guardarCarrito() {
    if (!this.storageDisponible) {
      return;
    }

    try {
      window.localStorage.setItem(
        this.storageKey,
        JSON.stringify(this.obtenerCarrito()),
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('No se pudo guardar el carrito.', error);
      this.storageDisponible = false;
    }
  }

  notificarCambios() {
    const data = this.obtenerCarrito();
    this.observers.forEach((observer) => observer(data));
    window.dispatchEvent(
      new CustomEvent('carritoActualizado', { detail: data }),
    );
  }

  suscribir(observer) {
    this.observers.add(observer);
    return () => this.observers.delete(observer);
  }

  obtenerCarrito() {
    return {
      items: this.items.map((item) => ({ ...item })),
      total: this.total,
      actualizado: this.actualizado,
    };
  }

  calcularTotal() {
    return this.items.reduce(
      (acc, item) => acc + item.precio * item.cantidad,
      0,
    );
  }

  actualizarTotales() {
    this.total = this.calcularTotal();
    this.actualizado = new Date().toISOString();
  }

  agregarProducto(id, nombre, precio) {
    const item = this.items.find((producto) => producto.id === id);
    if (item) {
      item.cantidad += 1;
    } else {
      this.items.push({ id, nombre, precio, cantidad: 1 });
    }
    this.actualizarTotales();
    this.guardarCarrito();
    this.notificarCambios();
    return this.obtenerCarrito();
  }

  removerProducto(id) {
    const itemIndex = this.items.findIndex((producto) => producto.id === id);
    if (itemIndex === -1) {
      return this.obtenerCarrito();
    }

    if (this.items[itemIndex].cantidad > 1) {
      this.items[itemIndex].cantidad -= 1;
    } else {
      this.items.splice(itemIndex, 1);
    }

    this.actualizarTotales();
    this.guardarCarrito();
    this.notificarCambios();
    return this.obtenerCarrito();
  }

  vaciarCarrito() {
    this.items = [];
    this.actualizarTotales();
    this.guardarCarrito();
    this.notificarCambios();
    return this.obtenerCarrito();
  }
}

const carritoManager = new CarritoManager();

window.carritoManager = carritoManager;

window.addEventListener('storage', (event) => {
  if (event.key && event.key !== carritoManager.storageKey) {
    return;
  }
  carritoManager.cargarCarrito();
  carritoManager.actualizarTotales();
  carritoManager.notificarCambios();
});
