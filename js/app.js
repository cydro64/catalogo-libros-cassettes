const productosContainer = document.getElementById('productos');
const filtrosSection = document.getElementById('filtros');
const listaCarrito = document.getElementById('lista-carrito');
const totalCarrito = document.getElementById('total-carrito');
const vaciarCarritoBtn = document.getElementById('vaciar-carrito');
const enviarPedidoBtn = document.getElementById('enviar-pedido');
const carritoError = document.getElementById('carrito-error');
const toggleCarritoBtn = document.getElementById('toggle-carrito');
const cerrarCarritoBtn = document.getElementById('cerrar-carrito');
const carritoOverlay = document.getElementById('carrito-overlay');
const carritoCount = document.getElementById('carrito-count');
const carritoAside = document.getElementById('carrito');
const mediaQueryCarritoFijo = window.matchMedia('(min-width: 1100px)');

const formatoPrecio = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

let productos = [];
let categoriaSeleccionada = 'todas';
let terminoBusqueda = '';

const normalizarCategoria = (categoria = '') => {
  const categoriaNormalizada = normalizarTexto(categoria);
  if (categoriaNormalizada === 'cassette' || categoriaNormalizada === 'cassettes') {
    return 'cassettes';
  }
  return categoriaNormalizada;
};

const normalizarTexto = (texto) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const productoEnCarrito = (id) => {
  if (!window.carritoManager) {
    return false;
  }
  return window.carritoManager
    .obtenerCarrito()
    .items.some((item) => item.id === id);
};

const crearFiltroUI = (categorias) => {
  filtrosSection.innerHTML = '';

  const titulo = document.createElement('h2');
  titulo.textContent = 'Filtros por categoría';

  const buscador = document.createElement('input');
  buscador.type = 'search';
  buscador.id = 'buscador';
  buscador.placeholder = 'Buscar por nombre o descripción';
  buscador.addEventListener('input', (event) => {
    terminoBusqueda = normalizarTexto(event.target.value);
    renderProductos();
  });

  const filtrosContainer = document.createElement('div');
  filtrosContainer.className = 'filtros-categorias';

  const categoriasOrdenadas = [...categorias].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );

  const botones = ['todas', ...categoriasOrdenadas].map((categoria) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
    boton.dataset.categoria = categoria;
    boton.className = categoria === categoriaSeleccionada ? 'activo' : '';
    boton.addEventListener('click', () => {
      categoriaSeleccionada = categoria;
      document
        .querySelectorAll('.filtros-categorias button')
        .forEach((btn) => btn.classList.remove('activo'));
      boton.classList.add('activo');
      renderProductos();
    });
    return boton;
  });

  botones.forEach((boton) => filtrosContainer.appendChild(boton));
  filtrosSection.append(titulo, buscador, filtrosContainer);
};

const filtrarProductos = () =>
  productos.filter((producto) => {
    const coincideCategoria =
      categoriaSeleccionada === 'todas' ||
      normalizarCategoria(producto.categoria) === categoriaSeleccionada;
    const textoBusqueda = normalizarTexto(
      [
        producto.nombre,
        producto.artista,
        producto.descripcion,
        producto.autor,
        producto.editorial,
        producto.categoria,
        producto.id,
      ]
        .filter(Boolean)
        .join(' '),
    );
    const coincideBusqueda = textoBusqueda.includes(terminoBusqueda);
    return coincideCategoria && coincideBusqueda;
  });

const construirDetalleCarrito = () => {
  if (!window.carritoManager) {
    return { detalle: [], total: 0 };
  }

  const items = window.carritoManager.obtenerCarrito().items;

  const detalle = items
    .map((item) => {
      const producto = productos.find((entry) => entry.id === item.id);
      const nombre =
        item.nombre ??
        (producto
          ? `${producto.artista ?? ''}${producto.artista ? ' — ' : ''}${producto.nombre}`
          : 'Producto');
      const precio =
        item.precio ?? (producto ? producto.precio_clp : 0);
      return {
        id: item.id,
        nombre,
        cantidad: item.cantidad ?? 1,
        precio_clp: precio,
      };
    })
    .filter((item) => item.precio_clp > 0);

  const total = detalle.reduce(
    (acc, item) => acc + item.precio_clp * item.cantidad,
    0,
  );

  return { detalle, total };
};

const actualizarEstadoEnvio = (detalle, total) => {
  const carritoVacio = detalle.length === 0;
  enviarPedidoBtn.setAttribute('aria-disabled', carritoVacio);
  enviarPedidoBtn.classList.toggle('deshabilitado', carritoVacio);
  enviarPedidoBtn.tabIndex = carritoVacio ? -1 : 0;

  if (carritoVacio) {
    enviarPedidoBtn.href = 'https://wa.me/';
    return;
  }

  if (window.generarMensajeWhatsApp) {
    enviarPedidoBtn.href = window.generarMensajeWhatsApp(detalle, total);
  }
};

const actualizarContadorCarrito = () => {
  if (!carritoCount || !window.carritoManager) {
    return;
  }

  const totalItems = window.carritoManager
    .obtenerCarrito()
    .items
    .reduce((acc, item) => acc + (item.cantidad ?? 0), 0);
  carritoCount.textContent = totalItems;
  carritoCount.style.display = totalItems > 0 ? 'inline-flex' : 'none';
};

const renderCarrito = () => {
  if (!listaCarrito || !totalCarrito) {
    return;
  }

  listaCarrito.innerHTML = '';
  const { detalle, total } = construirDetalleCarrito();

  if (detalle.length === 0) {
    const mensaje = document.createElement('li');
    mensaje.textContent = 'Tu carrito está vacío.';
    listaCarrito.appendChild(mensaje);
  } else {
    detalle.forEach((item) => {
      const elemento = document.createElement('li');
      const texto = document.createElement('span');
      texto.textContent =
        item.cantidad > 1 ? `${item.nombre} x${item.cantidad}` : item.nombre;

      const precio = document.createElement('span');
      precio.textContent = formatoPrecio.format(
        item.precio_clp * item.cantidad,
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
      listaCarrito.appendChild(elemento);
    });
  }

  totalCarrito.textContent = `Total: ${formatoPrecio.format(total)}`;
  actualizarEstadoEnvio(detalle, total);
  actualizarContadorCarrito();
};

const crearTarjetaProducto = (producto) => {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta';
  tarjeta.dataset.id = producto.id;
  const imagen = document.createElement('img');
  imagen.src = producto.imagen;
  imagen.alt = producto.nombre;

  const titulo = document.createElement('h3');
  titulo.textContent = `${producto.artista} — ${producto.nombre}`;

  const precio = document.createElement('p');
  precio.textContent = formatoPrecio.format(producto.precio_clp);

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Agregar';

  const actualizarEstadoBoton = () => {
    if (producto.estado === 'vendido') {
      boton.textContent = 'Vendido';
      boton.disabled = true;
      return;
    }

    if (productoEnCarrito(producto.id)) {
      boton.textContent = 'En carrito';
      boton.disabled = true;
    } else {
      boton.textContent = 'Agregar';
      boton.disabled = false;
    }
  };

  boton.addEventListener('click', () => {
    if (!window.carritoManager) {
      return;
    }
    window.carritoManager.agregarProducto(
      producto.id,
      `${producto.artista ?? ''}${producto.artista ? ' — ' : ''}${producto.nombre}`,
      producto.precio_clp,
    );
    actualizarEstadoBoton();
  });

  if (producto.estado === 'vendido') {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta-vendido';
    etiqueta.textContent = 'Vendido';
    tarjeta.appendChild(etiqueta);
  }

  actualizarEstadoBoton();
  tarjeta.append(imagen, titulo, precio, boton);
  return tarjeta;
};

const renderProductos = () => {
  productosContainer.innerHTML = '';
  const filtrados = filtrarProductos();

  if (filtrados.length === 0) {
    const mensaje = document.createElement('p');
    mensaje.className = 'sin-resultados';
    mensaje.textContent = 'No hay productos que coincidan con la búsqueda.';
    productosContainer.appendChild(mensaje);
    return;
  }

  filtrados
    .map((producto) => crearTarjetaProducto(producto))
    .forEach((tarjeta) => productosContainer.appendChild(tarjeta));
};

const cargarProductos = async () => {
  try {
    const respuesta = await fetch('data/productos.json');
    if (!respuesta.ok) {
      throw new Error('No se pudo cargar el catálogo.');
    }
    productos = await respuesta.json();
    productos = productos.map((producto) => ({
      ...producto,
      categoria: normalizarCategoria(producto.categoria),
    }));

    const categorias = [
      ...new Set(productos.map((producto) => producto.categoria)),
    ];

    crearFiltroUI(categorias);
    renderProductos();
    renderCarrito();
  } catch (error) {
    productosContainer.innerHTML =
      '<p class="error">Error al cargar los productos.</p>';
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

const prepararCarrito = () => {
  if (!window.carritoManager) {
    return;
  }

  if (!window.carritoManager.storageDisponible) {
    carritoError.textContent =
      'El almacenamiento local no está disponible. El carrito podría no guardarse.';
  }

  vaciarCarritoBtn.addEventListener('click', () => {
    if (window.confirm('¿Seguro que quieres vaciar el carrito?')) {
      window.carritoManager.vaciarCarrito();
    }
  });

  enviarPedidoBtn.addEventListener('click', (event) => {
    if (enviarPedidoBtn.getAttribute('aria-disabled') === 'true') {
      event.preventDefault();
    }
  });

  if (!toggleCarritoBtn || !cerrarCarritoBtn || !carritoOverlay || !carritoAside) {
    return;
  }

  const abrirCarrito = () => {
    document.body.classList.add('carrito-abierto');
    carritoOverlay.hidden = false;
    toggleCarritoBtn.setAttribute('aria-expanded', 'true');
    carritoAside.setAttribute('aria-hidden', 'false');
  };

  const cerrarCarrito = () => {
    document.body.classList.remove('carrito-abierto');
    carritoOverlay.hidden = true;
    toggleCarritoBtn.setAttribute('aria-expanded', 'false');
    carritoAside.setAttribute('aria-hidden', 'true');
  };

  const sincronizarModoCarrito = () => {
    if (mediaQueryCarritoFijo.matches) {
      document.body.classList.add('carrito-abierto');
      carritoOverlay.hidden = true;
      toggleCarritoBtn.setAttribute('aria-expanded', 'true');
      carritoAside.setAttribute('aria-hidden', 'false');
      return;
    }

    cerrarCarrito();
  };

  toggleCarritoBtn.addEventListener('click', () => {
    if (document.body.classList.contains('carrito-abierto')) {
      cerrarCarrito();
    } else {
      abrirCarrito();
    }
  });

  cerrarCarritoBtn.addEventListener('click', cerrarCarrito);
  carritoOverlay.addEventListener('click', cerrarCarrito);
  mediaQueryCarritoFijo.addEventListener('change', sincronizarModoCarrito);
  sincronizarModoCarrito();

  window.carritoManager.suscribir(() => {
    renderCarrito();
    renderProductos();
  });
  window.addEventListener('carritoActualizado', actualizarContadorCarrito);
};

prepararCarrito();
cargarProductos();
