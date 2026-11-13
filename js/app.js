// Catálogo de libros y cassettes — lógica de la página (13-11-2026).
// Estados de un producto: "disponible" (se puede pedir), "reservado" y "vendido" (se ven, no se piden).
// Enlace a productos puntuales: index.html?ver=CSST-001,CSST-002 (lo arma la app Cassettes en cada post).
// Métricas: eventos de Google Analytics 4 (ver medir()). Sin gtag (bloqueador, sin red) la página funciona igual.

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
const totalProductos = document.getElementById('total-productos');
const totalFiltrados = document.getElementById('total-filtrados');
const avisoCatalogo = document.getElementById('aviso-catalogo');

// Mismo corte que css/style.css (@media min-width: 900px).
const CARRITO_FIJO = window.matchMedia('(min-width: 900px)');
const PRODUCTOS_POR_PAGINA = 40;
const CODIGO_VALIDO = /^[A-Z]{3,5}-\d{3,}$/;
const MAX_VER = 40;

const formatoPrecio = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

let productos = [];
let categoriaSeleccionada = 'todas';
let terminoBusqueda = '';
let paginaActual = 1;
let ordenSeleccionado = 'nombre-asc';
// Códigos pedidos por ?ver= (vacío = catálogo completo).
let soloVer = [];

/* ---------- Utilidades ---------- */

const normalizarTexto = (texto) =>
  String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

const normalizarCategoria = (categoria = '') => {
  const categoriaNormalizada = normalizarTexto(categoria);
  if (categoriaNormalizada === 'cassette' || categoriaNormalizada === 'cassettes') {
    return 'cassettes';
  }
  if (categoriaNormalizada === 'libro' || categoriaNormalizada === 'libros') {
    return 'libros';
  }
  return categoriaNormalizada;
};

const normalizarEstado = (estado) => {
  const e = normalizarTexto(estado);
  return e === 'vendido' || e === 'reservado' ? e : 'disponible';
};

const obtenerNombreProducto = (producto) => {
  const autor = producto.artista || producto.autor;
  const nombre = String(producto.nombre ?? '');
  if (!autor || normalizarTexto(autor) === 'varios artistas' || normalizarTexto(autor) === normalizarTexto(nombre)) {
    return nombre;
  }
  return `${autor} — ${nombre}`;
};

const productoEnCarrito = (id) =>
  Boolean(window.carritoManager) &&
  window.carritoManager.obtenerCarrito().items.some((item) => item.id === id);

const leerVer = () => {
  const valor = new URLSearchParams(window.location.search).get('ver') || '';
  return [...new Set(
    valor.split(',').map((c) => c.trim().toUpperCase()).filter((c) => CODIGO_VALIDO.test(c)),
  )].slice(0, MAX_VER);
};

// Avisos arriba del catálogo. Cada tipo ocupa su propia línea ("publicacion", "carrito"); no se pisan.
const mostrarAviso = (tipo, texto, boton) => {
  if (!avisoCatalogo) {
    return;
  }
  let linea = avisoCatalogo.querySelector(`[data-tipo="${tipo}"]`);
  if (!linea) {
    linea = document.createElement('div');
    linea.className = 'aviso-linea';
    linea.dataset.tipo = tipo;
    avisoCatalogo.appendChild(linea);
  }
  linea.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = texto;
  linea.appendChild(span);
  if (boton) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = boton.texto;
    b.addEventListener('click', boton.accion);
    linea.appendChild(b);
  }
  avisoCatalogo.hidden = false;
};

const quitarAviso = (tipo) => {
  if (!avisoCatalogo) {
    return;
  }
  avisoCatalogo.querySelector(`[data-tipo="${tipo}"]`)?.remove();
  avisoCatalogo.hidden = avisoCatalogo.children.length === 0;
};

/* ---------- Métricas (Google Analytics 4) ---------- */

const medir = (evento, datos = {}) => {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', evento, datos);
    }
  } catch (error) {
    // Una métrica nunca debe romper la página.
  }
};

const itemMetrica = (producto, indice) => ({
  item_id: producto.id,
  item_name: obtenerNombreProducto(producto),
  item_category: producto.categoria,
  price: producto.precio_clp ?? 0,
  quantity: 1,
  ...(indice === undefined ? {} : { index: indice }),
});

const nombreLista = () => (soloVer.length ? 'publicacion' : 'catalogo');

// Visibilidad: cada tarjeta que se ve al menos un segundo con la mitad en pantalla se cuenta una vez por visita.
// Se envían en tandas (view_item_list) para no mandar un evento por tarjeta.
const vistos = new Set();
const relojesVista = new Map();
let pendientesVista = [];
let temporizadorVista = null;

const enviarVistas = () => {
  clearTimeout(temporizadorVista);
  temporizadorVista = null;
  if (pendientesVista.length === 0) {
    return;
  }
  const items = pendientesVista;
  pendientesVista = [];
  medir('view_item_list', { item_list_name: nombreLista(), items });
};

const registrarVista = (id) => {
  relojesVista.delete(id);
  const producto = productos.find((p) => p.id === id);
  if (!producto || vistos.has(id)) {
    return;
  }
  vistos.add(id);
  pendientesVista.push(itemMetrica(producto));
  if (pendientesVista.length >= 20) {
    enviarVistas();
  } else if (!temporizadorVista) {
    temporizadorVista = setTimeout(enviarVistas, 4000);
  }
};

const observadorVista = 'IntersectionObserver' in window
  ? new IntersectionObserver((entradas) => {
    entradas.forEach((entrada) => {
      const id = entrada.target.dataset.id;
      if (!id || vistos.has(id)) {
        return;
      }
      if (entrada.isIntersecting && !relojesVista.has(id)) {
        relojesVista.set(id, setTimeout(() => registrarVista(id), 1000));
      } else if (!entrada.isIntersecting && relojesVista.has(id)) {
        clearTimeout(relojesVista.get(id));
        relojesVista.delete(id);
      }
    });
  }, { threshold: 0.5 })
  : null;

const reiniciarObservador = () => {
  if (!observadorVista) {
    return;
  }
  observadorVista.disconnect();
  relojesVista.forEach((reloj) => clearTimeout(reloj));
  relojesVista.clear();
};

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    enviarVistas();
  }
});

/* ---------- Filtros ---------- */

let temporizadorBusqueda = null;

const crearFiltroUI = (categorias) => {
  filtrosSection.innerHTML = '';

  const titulo = document.createElement('h2');
  titulo.textContent = 'Catálogo';

  const buscador = document.createElement('input');
  buscador.type = 'search';
  buscador.id = 'buscador';
  buscador.placeholder = 'Buscar artista, título o código';
  buscador.setAttribute('aria-label', 'Buscar en el catálogo');
  buscador.addEventListener('input', (event) => {
    terminoBusqueda = normalizarTexto(event.target.value);
    paginaActual = 1;
    renderProductos();
    // Se mide la búsqueda cuando la persona deja de escribir.
    clearTimeout(temporizadorBusqueda);
    temporizadorBusqueda = setTimeout(() => {
      const termino = event.target.value.trim();
      if (termino.length >= 2) {
        medir('search', { search_term: termino.slice(0, 100), resultados: filtrarProductos().length });
      }
    }, 1200);
  });

  const controlesContainer = document.createElement('div');
  controlesContainer.className = 'controles-catalogo';

  const ordenLabel = document.createElement('label');
  ordenLabel.textContent = 'Ordenar';
  ordenLabel.htmlFor = 'orden-productos';

  const ordenSelect = document.createElement('select');
  ordenSelect.id = 'orden-productos';
  [
    ['nombre-asc', 'Nombre A-Z'],
    ['precio-asc', 'Precio menor a mayor'],
    ['precio-desc', 'Precio mayor a menor'],
    ['disponibles', 'Disponibles primero'],
  ].forEach(([value, text]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    ordenSelect.appendChild(option);
  });
  ordenSelect.value = ordenSeleccionado;
  ordenSelect.addEventListener('change', (event) => {
    ordenSeleccionado = event.target.value;
    paginaActual = 1;
    renderProductos();
    medir('ordenar', { orden: ordenSeleccionado });
  });

  controlesContainer.append(buscador, ordenLabel, ordenSelect);

  const filtrosContainer = document.createElement('div');
  filtrosContainer.className = 'filtros-categorias';

  const categoriasOrdenadas = [...categorias].sort((a, b) => a.localeCompare(b, 'es'));

  ['todas', ...categoriasOrdenadas].forEach((categoria) => {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = categoria.charAt(0).toUpperCase() + categoria.slice(1);
    boton.dataset.categoria = categoria;
    boton.className = categoria === categoriaSeleccionada ? 'activo' : '';
    boton.addEventListener('click', () => {
      categoriaSeleccionada = categoria;
      paginaActual = 1;
      filtrosContainer.querySelectorAll('button').forEach((btn) => btn.classList.remove('activo'));
      boton.classList.add('activo');
      renderProductos();
      medir('filtrar_categoria', { categoria });
    });
    filtrosContainer.appendChild(boton);
  });

  filtrosSection.append(titulo, controlesContainer);
  // Con una sola categoría el filtro no sirve: aparece solo cuando haya libros.
  if (categoriasOrdenadas.length > 1) {
    filtrosSection.appendChild(filtrosContainer);
  }
};

const PESO_ESTADO = { disponible: 0, reservado: 1, vendido: 2 };

const ordenarProductos = (lista) =>
  [...lista].sort((a, b) => {
    if (ordenSeleccionado === 'precio-asc') {
      return (a.precio_clp ?? 0) - (b.precio_clp ?? 0);
    }
    if (ordenSeleccionado === 'precio-desc') {
      return (b.precio_clp ?? 0) - (a.precio_clp ?? 0);
    }
    if (ordenSeleccionado === 'disponibles') {
      const diferencia = PESO_ESTADO[a.estado] - PESO_ESTADO[b.estado];
      if (diferencia !== 0) {
        return diferencia;
      }
    }
    return obtenerNombreProducto(a).localeCompare(obtenerNombreProducto(b), 'es');
  });

const filtrarProductos = () =>
  ordenarProductos(productos.filter((producto) => {
    if (soloVer.length && !soloVer.includes(producto.id)) {
      return false;
    }
    const coincideCategoria =
      categoriaSeleccionada === 'todas' || producto.categoria === categoriaSeleccionada;
    const textoBusqueda = normalizarTexto(
      [producto.nombre, producto.artista, producto.descripcion, producto.autor,
        producto.editorial, producto.categoria, producto.id].filter(Boolean).join(' '),
    );
    return coincideCategoria && textoBusqueda.includes(terminoBusqueda);
  }));

/* ---------- Carrito ---------- */

const construirDetalleCarrito = () => {
  if (!window.carritoManager) {
    return { detalle: [], total: 0 };
  }

  const detalle = window.carritoManager.obtenerCarrito().items
    .map((item) => {
      const producto = productos.find((entry) => entry.id === item.id);
      return {
        id: item.id,
        nombre: producto ? obtenerNombreProducto(producto) : (item.nombre ?? 'Producto'),
        cantidad: item.cantidad ?? 1,
        precio_clp: producto ? producto.precio_clp : (item.precio ?? 0),
      };
    })
    .filter((item) => item.precio_clp > 0);

  const total = detalle.reduce((acc, item) => acc + item.precio_clp * item.cantidad, 0);
  return { detalle, total };
};

// Si alguien dejó en su pedido algo que ya se vendió o se reservó, se saca y se avisa.
const depurarCarrito = () => {
  if (!window.carritoManager) {
    return;
  }
  const quitados = window.carritoManager.obtenerCarrito().items.filter((item) => {
    const producto = productos.find((p) => p.id === item.id);
    return !producto || producto.estado !== 'disponible';
  });
  if (quitados.length === 0) {
    return;
  }
  quitados.forEach((item) => window.carritoManager.quitarTodo(item.id));
  const nombres = quitados.map((item) => item.nombre || item.id).join(', ');
  mostrarAviso(
    'carrito',
    quitados.length === 1
      ? `Saqué de tu pedido "${nombres}": ya no está disponible.`
      : `Saqué de tu pedido ${quitados.length} productos que ya no están disponibles: ${nombres}.`,
  );
};

const actualizarEstadoEnvio = (detalle, total) => {
  const carritoVacio = detalle.length === 0;
  enviarPedidoBtn.setAttribute('aria-disabled', carritoVacio);
  enviarPedidoBtn.classList.toggle('deshabilitado', carritoVacio);
  enviarPedidoBtn.tabIndex = carritoVacio ? -1 : 0;
  enviarPedidoBtn.href = carritoVacio || !window.generarMensajeWhatsApp
    ? 'https://wa.me/56976449957'
    : window.generarMensajeWhatsApp(detalle, total);
};

const actualizarContadorCarrito = () => {
  if (!carritoCount || !window.carritoManager) {
    return;
  }
  const totalItems = window.carritoManager.obtenerCarrito().items
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
    mensaje.textContent = 'Tu pedido está vacío. Agrega lo que te interese y envíalo por WhatsApp.';
    listaCarrito.appendChild(mensaje);
  } else {
    detalle.forEach((item) => {
      const elemento = document.createElement('li');
      const texto = document.createElement('span');
      texto.textContent = item.cantidad > 1 ? `${item.nombre} x${item.cantidad}` : item.nombre;

      const precio = document.createElement('span');
      precio.textContent = formatoPrecio.format(item.precio_clp * item.cantidad);

      const quitarBtn = document.createElement('button');
      quitarBtn.type = 'button';
      quitarBtn.textContent = 'Quitar';
      quitarBtn.addEventListener('click', () => {
        elemento.classList.add('animar-salida');
        const producto = productos.find((p) => p.id === item.id);
        if (producto) {
          medir('remove_from_cart', { currency: 'CLP', value: producto.precio_clp, items: [itemMetrica(producto)] });
        }
        setTimeout(() => window.carritoManager.removerProducto(item.id), 180);
      });

      elemento.append(texto, precio, quitarBtn);
      elemento.classList.add('item-carrito', 'animar-entrada');
      requestAnimationFrame(() => elemento.classList.remove('animar-entrada'));
      listaCarrito.appendChild(elemento);
    });
  }

  totalCarrito.textContent = `Total: ${formatoPrecio.format(total)}`;
  actualizarEstadoEnvio(detalle, total);
  actualizarContadorCarrito();
};

/* ---------- Productos ---------- */

const verFoto = (producto, src) => {
  const visor = document.createElement('div');
  visor.className = 'visor';
  visor.setAttribute('role', 'dialog');
  visor.setAttribute('aria-label', obtenerNombreProducto(producto));
  const contenido = document.createElement('div');
  const img = document.createElement('img');
  img.src = src;
  img.alt = `Foto de ${obtenerNombreProducto(producto)}`;
  const pie = document.createElement('p');
  pie.textContent = `${producto.id} · ${obtenerNombreProducto(producto)} · ${formatoPrecio.format(producto.precio_clp)}`;
  contenido.append(img, pie);
  visor.appendChild(contenido);
  const alTeclear = (e) => {
    if (e.key === 'Escape') {
      cerrar();
    }
  };
  const cerrar = () => {
    visor.remove();
    document.removeEventListener('keydown', alTeclear);
  };
  visor.addEventListener('click', cerrar);
  document.addEventListener('keydown', alTeclear);
  document.body.appendChild(visor);
  medir('select_item', { item_list_name: nombreLista(), items: [itemMetrica(producto)] });
};

const crearTarjetaProducto = (producto, indice) => {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta';
  tarjeta.dataset.id = producto.id;
  if (producto.estado !== 'disponible') {
    tarjeta.classList.add(producto.estado);
  }

  const foto = document.createElement('div');
  foto.className = 'foto';
  const imagen = document.createElement('img');
  imagen.src = producto.imagen;
  imagen.alt = `Foto de ${obtenerNombreProducto(producto)}`;
  imagen.loading = 'lazy';
  imagen.decoding = 'async';
  imagen.addEventListener('error', () => {
    imagen.src = producto.categoria === 'cassettes' ? 'img/cassette-placeholder.svg' : 'img/libro-placeholder.svg';
  }, { once: true });
  foto.appendChild(imagen);
  foto.addEventListener('click', () => verFoto(producto, imagen.src));

  if (producto.estado !== 'disponible') {
    const etiqueta = document.createElement('span');
    etiqueta.className = `etiqueta-estado ${producto.estado}`;
    etiqueta.textContent = producto.estado === 'vendido' ? 'Vendido' : 'Reservado';
    foto.appendChild(etiqueta);
  }

  const info = document.createElement('div');
  info.className = 'info';
  const codigo = document.createElement('span');
  codigo.className = 'codigo';
  codigo.textContent = producto.id;
  const titulo = document.createElement('h3');
  titulo.textContent = obtenerNombreProducto(producto);

  const pie = document.createElement('div');
  pie.className = 'pie';
  const precio = document.createElement('p');
  precio.className = 'precio';
  precio.textContent = formatoPrecio.format(producto.precio_clp);

  const boton = document.createElement('button');
  boton.type = 'button';
  if (producto.estado === 'vendido') {
    boton.textContent = 'Vendido';
    boton.disabled = true;
  } else if (producto.estado === 'reservado') {
    boton.textContent = 'Reservado';
    boton.disabled = true;
  } else if (productoEnCarrito(producto.id)) {
    boton.textContent = 'En el pedido';
    boton.disabled = true;
  } else {
    boton.textContent = 'Agregar';
  }

  boton.addEventListener('click', () => {
    if (!window.carritoManager || boton.disabled) {
      return;
    }
    window.carritoManager.agregarProducto(producto.id, obtenerNombreProducto(producto), producto.precio_clp);
    medir('add_to_cart', {
      currency: 'CLP',
      value: producto.precio_clp,
      item_list_name: nombreLista(),
      items: [itemMetrica(producto, indice)],
    });
  });

  pie.append(precio, boton);
  info.append(codigo, titulo, pie);
  tarjeta.append(foto, info);
  return tarjeta;
};

const renderPaginacion = (cantidad) => {
  let paginacion = document.getElementById('paginacion');
  if (!paginacion) {
    paginacion = document.createElement('div');
    paginacion.id = 'paginacion';
    productosContainer.parentNode.insertBefore(paginacion, productosContainer.nextSibling);
  }
  paginacion.innerHTML = '';

  const totalPaginas = Math.ceil(cantidad / PRODUCTOS_POR_PAGINA);
  if (totalPaginas <= 1) {
    return;
  }

  for (let i = 1; i <= totalPaginas; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = i;
    btn.className = `pagina-btn${i === paginaActual ? ' activa' : ''}`;
    btn.addEventListener('click', () => {
      paginaActual = i;
      renderProductos();
      filtrosSection.scrollIntoView({ behavior: 'smooth' });
      medir('cambiar_pagina', { pagina: i });
    });
    paginacion.appendChild(btn);
  }
};

const renderResumen = (visibles) => {
  if (totalProductos) {
    const disponibles = productos.filter((p) => p.estado === 'disponible').length;
    totalProductos.textContent = `${disponibles} disponibles`;
  }
  if (totalFiltrados) {
    const filtrando = soloVer.length || terminoBusqueda || categoriaSeleccionada !== 'todas';
    totalFiltrados.textContent = filtrando ? `${visibles} en pantalla` : '';
  }
};

const renderProductos = () => {
  reiniciarObservador();
  productosContainer.innerHTML = '';
  const filtrados = filtrarProductos();
  renderResumen(filtrados.length);

  if (filtrados.length === 0) {
    const mensaje = document.createElement('p');
    mensaje.className = 'sin-resultados';
    mensaje.textContent = 'No hay productos que coincidan con la búsqueda.';
    productosContainer.appendChild(mensaje);
    renderPaginacion(0);
    return;
  }

  const inicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;
  filtrados.slice(inicio, inicio + PRODUCTOS_POR_PAGINA).forEach((producto, i) => {
    const tarjeta = crearTarjetaProducto(producto, inicio + i);
    productosContainer.appendChild(tarjeta);
    if (observadorVista) {
      observadorVista.observe(tarjeta);
    }
  });

  renderPaginacion(filtrados.length);
};

const verTodo = () => {
  soloVer = [];
  paginaActual = 1;
  quitarAviso('publicacion');
  const url = new URL(window.location.href);
  url.searchParams.delete('ver');
  window.history.replaceState(null, '', url);
  renderProductos();
  medir('ver_catalogo_completo');
};

const cargarProductos = async () => {
  try {
    const respuesta = await fetch('data/productos.json', { cache: 'no-cache' });
    if (!respuesta.ok) {
      throw new Error(`No se pudo cargar el catálogo (${respuesta.status}).`);
    }
    const datos = await respuesta.json();
    if (!Array.isArray(datos)) {
      throw new Error('El catálogo no tiene el formato esperado.');
    }
    productos = datos.map((producto) => ({
      ...producto,
      nombre: String(producto.nombre ?? ''),
      categoria: normalizarCategoria(producto.categoria),
      estado: normalizarEstado(producto.estado),
    }));

    soloVer = leerVer().filter((codigo) => productos.some((p) => p.id === codigo));
    if (soloVer.length) {
      const disponibles = productos.filter((p) => soloVer.includes(p.id) && p.estado === 'disponible').length;
      mostrarAviso(
        'publicacion',
        soloVer.length === 1
          ? `Estás viendo el producto de la publicación${disponibles ? '' : ' (ya no está disponible)'}.`
          : `Estás viendo los ${soloVer.length} productos de la publicación (${disponibles} ${disponibles === 1 ? 'disponible' : 'disponibles'}).`,
        { texto: 'Ver todo el catálogo', accion: verTodo },
      );
      medir('abrir_publicacion', { cantidad: soloVer.length, codigos: soloVer.join(',').slice(0, 100) });
    }

    crearFiltroUI(new Set(productos.map((producto) => producto.categoria)));
    depurarCarrito();
    renderProductos();
    renderCarrito();
  } catch (error) {
    productosContainer.innerHTML = '<p class="error">No se pudo cargar el catálogo. Recarga la página en un momento.</p>';
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

const prepararCarrito = () => {
  if (!window.carritoManager) {
    return;
  }

  if (!window.carritoManager.storageDisponible) {
    carritoError.textContent = 'Tu navegador no deja guardar el pedido: si recargas la página, se pierde.';
  }

  vaciarCarritoBtn.addEventListener('click', () => {
    if (window.confirm('¿Seguro que quieres vaciar el pedido?')) {
      window.carritoManager.vaciarCarrito();
    }
  });

  // El clic en "Enviar pedido" es la conversión principal: alguien abre WhatsApp con su pedido.
  enviarPedidoBtn.addEventListener('click', (event) => {
    if (enviarPedidoBtn.getAttribute('aria-disabled') === 'true') {
      event.preventDefault();
      return;
    }
    const { detalle, total } = construirDetalleCarrito();
    const items = detalle.map((item) => {
      const producto = productos.find((p) => p.id === item.id);
      return producto ? itemMetrica(producto) : { item_id: item.id, item_name: item.nombre, price: item.precio_clp };
    });
    medir('begin_checkout', { currency: 'CLP', value: total, items });
    medir('generate_lead', { currency: 'CLP', value: total, lead_source: 'whatsapp', cantidad: detalle.length });
    enviarVistas();
  });

  if (!toggleCarritoBtn || !cerrarCarritoBtn || !carritoOverlay || !carritoAside) {
    return;
  }

  const abrirCarrito = () => {
    document.body.classList.add('carrito-abierto');
    carritoOverlay.hidden = false;
    toggleCarritoBtn.setAttribute('aria-expanded', 'true');
    carritoAside.setAttribute('aria-hidden', 'false');
    medir('view_cart');
  };

  const cerrarCarrito = () => {
    document.body.classList.remove('carrito-abierto');
    carritoOverlay.hidden = true;
    toggleCarritoBtn.setAttribute('aria-expanded', 'false');
    carritoAside.setAttribute('aria-hidden', 'true');
  };

  const sincronizarModoCarrito = () => {
    if (CARRITO_FIJO.matches) {
      // En escritorio el pedido siempre está a la vista (CSS); no hace falta abrirlo.
      document.body.classList.remove('carrito-abierto');
      carritoOverlay.hidden = true;
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
  CARRITO_FIJO.addEventListener('change', sincronizarModoCarrito);
  sincronizarModoCarrito();

  window.carritoManager.suscribir(() => {
    renderCarrito();
    renderProductos();
  });
};

// Clics en enlaces marcados con data-medir (flyer, redes): para saber cuáles se usan.
document.addEventListener('click', (event) => {
  const enlace = event.target.closest('a[data-medir]');
  if (enlace) {
    medir('clic_enlace', { destino: enlace.dataset.medir });
  }
});

prepararCarrito();
cargarProductos();
