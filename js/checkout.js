const listaCheckout = document.getElementById('checkout-list');
const totalCheckout = document.getElementById('checkout-total');
const vaciarCheckoutBtn = document.getElementById('checkout-clear');
const whatsappCheckoutLink = document.getElementById('checkout-whatsapp');
const carritoCountCheckout = document.getElementById('carrito-count');
const checkoutError = document.getElementById('checkout-error');

const formatoPrecioCheckout = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const actualizarContadorCheckout = (items) => {
  if (!carritoCountCheckout) {
    return;
  }
  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);
  carritoCountCheckout.textContent = totalItems;
  carritoCountCheckout.style.display = totalItems > 0 ? 'inline-flex' : 'none';
};

const renderCheckout = () => {
  if (!window.carritoManager || !listaCheckout || !totalCheckout) {
    return;
  }

  listaCheckout.innerHTML = '';
  const { items, total } = window.carritoManager.obtenerCarrito();

  if (items.length === 0) {
    const mensaje = document.createElement('li');
    mensaje.textContent = 'Tu carrito está vacío.';
    listaCheckout.appendChild(mensaje);
    whatsappCheckoutLink.href = 'https://wa.me/56976449957';
  } else {
    items.forEach((item) => {
      const elemento = document.createElement('li');
      const texto = document.createElement('span');
      const nombre = item.nombre ?? 'Producto';
      const precioUnitario = item.precio ?? 0;
      texto.textContent =
        item.cantidad > 1
          ? `${nombre} x${item.cantidad}`
          : nombre;

      const precio = document.createElement('span');
      precio.textContent = formatoPrecioCheckout.format(
        precioUnitario * item.cantidad,
      );

      const quitarBtn = document.createElement('button');
      quitarBtn.type = 'button';
      quitarBtn.textContent = 'Quitar';
      quitarBtn.addEventListener('click', () => {
        elemento.classList.add('animar-salida');
        setTimeout(() => {
          window.carritoManager.removerProducto(item.id);
        }, 180);
      });

      elemento.append(texto, precio, quitarBtn);
      elemento.classList.add('item-carrito', 'animar-entrada');
      requestAnimationFrame(() => {
        elemento.classList.remove('animar-entrada');
      });
      listaCheckout.appendChild(elemento);
    });
    if (window.generarMensajeWhatsApp) {
      const detalle = items.map((item) => ({
        nombre: item.nombre ?? 'Producto',
        cantidad: item.cantidad,
        precio_clp: item.precio ?? 0,
      }));
      whatsappCheckoutLink.href = window.generarMensajeWhatsApp(detalle, total);
    }
  }

  totalCheckout.textContent = `Total: ${formatoPrecioCheckout.format(total)}`;
  actualizarContadorCheckout(items);
};

const prepararCheckout = () => {
  if (!window.carritoManager) {
    return;
  }

  if (!window.carritoManager.storageDisponible) {
    checkoutError.textContent =
      'El almacenamiento local no está disponible. El carrito podría no guardarse.';
  }

  vaciarCheckoutBtn.addEventListener('click', () => {
    if (window.confirm('¿Seguro que quieres vaciar el carrito?')) {
      window.carritoManager.vaciarCarrito();
    }
  });

  window.addEventListener('carritoActualizado', renderCheckout);
};

prepararCheckout();
renderCheckout();
