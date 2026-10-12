/* =====================================================
   CBTIS 260 · Script común a todas las páginas
   - Menú hamburguesa (móvil)
   - Registro del Service Worker (PWA)
   ===================================================== */
'use strict';

/* ---------- Menú hamburguesa ---------- */
(function () {
  const boton = document.querySelector('.nav-toggle');
  const lista = document.getElementById('lista-menu');
  if (!boton || !lista) return;
  boton.addEventListener('click', () => {
    const abierto = lista.classList.toggle('abierto');
    boton.setAttribute('aria-expanded', abierto);
  });
})();

/* ---------- Service Worker ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .catch(err => console.warn('Service Worker no registrado:', err));
  });
}
