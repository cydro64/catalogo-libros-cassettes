// Arma el enlace de WhatsApp con el pedido.
// Cada línea lleva el código entre corchetes ([CSST-001]): la app Cassettes lo lee con "Pegar pedido".
// Si se cambia este formato, revisar leerPedido() en app\pagina\index.html.
const TELEFONO_PEDIDOS = '56976449957';

const formatoPrecioPedido = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const generarMensajeWhatsApp = (carrito, total) => {
  if (!carrito || carrito.length === 0) {
    return `https://wa.me/${TELEFONO_PEDIDOS}`;
  }

  const detalle = carrito
    .map((item) => {
      const codigo = item.id ? `[${item.id}] ` : '';
      const cantidad = item.cantidad > 1 ? ` x${item.cantidad}` : '';
      return `- ${codigo}${item.nombre}${cantidad}: ${formatoPrecioPedido.format(item.precio_clp * item.cantidad)}`;
    })
    .join('\n');

  const mensaje = `Hola, quiero hacer el siguiente pedido desde el catálogo:\n${detalle}\nTotal: ${formatoPrecioPedido.format(total)}`;

  return `https://wa.me/${TELEFONO_PEDIDOS}?text=${encodeURIComponent(mensaje)}`;
};

window.generarMensajeWhatsApp = generarMensajeWhatsApp;
