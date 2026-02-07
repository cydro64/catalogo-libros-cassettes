const productosContainer = document.getElementById('productos');
const filtrosSection = document.getElementById('filtros');

const formatoPrecio = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

let productos = [];
let categoriaSeleccionada = 'todas';
let terminoBusqueda = '';

const normalizarTexto = (texto) => texto.toLowerCase().trim();

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

  const botones = ['todas', ...categorias].map((categoria) => {
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
      producto.categoria === categoriaSeleccionada;
    const textoBusqueda = normalizarTexto(
      `${producto.nombre} ${producto.descripcion}`,
    );
    const coincideBusqueda = textoBusqueda.includes(terminoBusqueda);
    return coincideCategoria && coincideBusqueda;
  });

const crearTarjetaProducto = (producto) => {
  const tarjeta = document.createElement('article');
  tarjeta.className = 'tarjeta';

  const imagen = document.createElement('img');
  imagen.src = producto.imagen;
  imagen.alt = producto.nombre;

  const titulo = document.createElement('h3');
  titulo.textContent = producto.nombre;

  const precio = document.createElement('p');
  precio.textContent = formatoPrecio.format(producto.precio_clp);

  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = 'Agregar';

  if (producto.estado === 'vendido') {
    const etiqueta = document.createElement('span');
    etiqueta.className = 'etiqueta-vendido';
    etiqueta.textContent = 'Vendido';
    tarjeta.appendChild(etiqueta);
    boton.disabled = true;
  }

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

    const categorias = [
      ...new Set(productos.map((producto) => producto.categoria)),
    ];

    crearFiltroUI(categorias);
    renderProductos();
  } catch (error) {
    productosContainer.innerHTML =
      '<p class="error">Error al cargar los productos.</p>';
    // eslint-disable-next-line no-console
    console.error(error);
  }
};

cargarProductos();
