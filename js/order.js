const formatoPrecioPedido = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const generarMensajeWhatsApp = (carrito, total) => {
  if (!carrito || carrito.length === 0) {
    return 'https://wa.me/56976449957';
  }

  const detalle = carrito
    .map(
      (item) =>
        `- ${item.nombre} x${item.cantidad}: ${formatoPrecioPedido.format(
          item.precio_clp * item.cantidad,
        )}`,
    )
    .join('\n');

  const mensaje = `Hola, quiero hacer el siguiente pedido:\n${detalle}\nTotal: ${formatoPrecioPedido.format(
    total,
  )}`;

  return `https://wa.me/56976449957?text=${encodeURIComponent(mensaje)}`;
};

window.generarMensajeWhatsApp = generarMensajeWhatsApp;
