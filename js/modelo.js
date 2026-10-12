/* CBTIS 260 · Identificador IA de Luis */
'use strict';

const MODELO_URL = 'modelo/model.json';
const METADATA_URL = 'modelo/metadata.json';
const CLASE_LUIS = 'Luis';
const CLASE_NO_LUIS = 'No Luis';
const UMBRAL_LUIS = 0.85;
const MARGEN_MINIMO = 0.15;

const LIBS = [
  { global: 'tf', fuentes: ['https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js', 'https://unpkg.com/@tensorflow/tfjs@1.3.1/dist/tf.min.js'] },
  { global: 'tmImage', fuentes: ['https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js', 'https://unpkg.com/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js'] }
];

const $ = (s, r = document) => r.querySelector(s);
const fmt = n => `${n.toFixed(1)}%`;
let modelo = null, flujo = null, animando = false, ultimo = 0;

function cargarScript(src) {
  return new Promise((ok, fallo) => {
    const script = document.createElement('script'); script.src = src; script.onload = ok;
    script.onerror = () => { script.remove(); fallo(new Error(`No se pudo cargar ${src}`)); };
    document.head.appendChild(script);
  });
}
async function cargarLibreria(lib) {
  if (window[lib.global]) return;
  for (const src of lib.fuentes) { try { await cargarScript(src); if (window[lib.global]) return; } catch (e) { console.warn(e.message); } }
  throw new Error(`LIB:${lib.global}`);
}

const estado = $('#estado-modelo'), estadoTxt = $('#estado-texto');
function setEstado(tipo, texto) { estado.className = `aviso ${tipo}`; estadoTxt.textContent = texto; }
async function iniciarModelo() {
  try {
    for (const lib of LIBS) await cargarLibreria(lib);
    modelo = await tmImage.load(MODELO_URL, METADATA_URL);
    setEstado('listo', 'Modelo listo. Selecciona una imagen para analizarla.');
  } catch (e) {
    console.error(e);
    setEstado('error', String(e.message).startsWith('LIB:') ? 'No se pudieron cargar las librerías. Revisa tu conexión a internet y recarga.' : 'No se pudo cargar el modelo. Verifica la carpeta modelo/.');
  }
}

async function clasificar(fuente) {
  if (!modelo) throw new Error('El modelo aún está cargando. Espera unos segundos.');
  const predicciones = await modelo.predict(fuente);
  const pLuis = (predicciones.find(p => p.className === CLASE_LUIS) || { probability: 0 }).probability;
  const pNoLuis = (predicciones.find(p => p.className === CLASE_NO_LUIS) || { probability: 0 }).probability;
  const confirmado = pLuis >= UMBRAL_LUIS && (pLuis - pNoLuis) >= MARGEN_MINIMO;
  return { esLuis: confirmado, pctLuis: confirmado ? pLuis * 100 : 0, pctNoLuis: pNoLuis * 100, confianza: confirmado ? pLuis * 100 : 0, motivo: confirmado ? '' : 'La imagen no alcanza el nivel necesario para confirmar que eres Luis.' };
}

const resultado = $('#resultado'), img = $('#vista-previa'), video = $('#video'), vacio = $('#visor-vacio'), btnCam = $('#btn-camara'), inputArchivo = $('#archivo');
function pintarResultado(r) {
  resultado.className = `resultado ${r.esLuis ? 'si' : 'no'}`;
  resultado.innerHTML = `<div><strong>${r.esLuis ? '✅ SÍ ES LUIS' : '❌ NO SE PUEDE CONFIRMAR'}</strong><span class="conf">${r.esLuis ? `Confianza: ${fmt(r.confianza)}` : 'Luis: 0%'}</span>${r.motivo ? `<small>${r.motivo}</small>` : ''}</div>`;
  $('#barra-luis').style.width = `${r.pctLuis}%`; $('#pct-luis').textContent = fmt(r.pctLuis);
  $('#barra-no').style.width = `${r.pctNoLuis}%`; $('#pct-no').textContent = fmt(r.pctNoLuis);
}
function pintarError(msg) { resultado.className = 'resultado error'; resultado.innerHTML = `<span>⚠️ ${msg}</span>`; }

inputArchivo.addEventListener('change', () => {
  const archivo = inputArchivo.files[0]; if (!archivo) return;
  if (!archivo.type.startsWith('image/')) { pintarError('El archivo seleccionado no es una imagen.'); return; }
  detenerCamara(); if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  img.onload = async () => { try { pintarResultado(await clasificar(img)); } catch (e) { pintarError(e.message); } };
  img.onerror = () => pintarError('No se pudo leer la imagen. Prueba con JPG o PNG.');
  img.src = URL.createObjectURL(archivo); img.hidden = false; video.hidden = true; vacio.hidden = true;
});

async function activarCamara() {
  if (!navigator.mediaDevices?.getUserMedia) { pintarError('La cámara requiere HTTPS y permisos del navegador.'); return; }
  try { flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }); }
  catch (e) { pintarError(e.name === 'NotAllowedError' ? 'Permiso de cámara denegado.' : 'No se encontró una cámara disponible. Puedes subir una imagen.'); return; }
  video.srcObject = flujo; await video.play().catch(() => {}); video.hidden = false; img.hidden = true; vacio.hidden = true;
  btnCam.textContent = '⏹ Detener cámara'; animando = true; requestAnimationFrame(ciclo);
}
function detenerCamara() {
  animando = false; if (flujo) { flujo.getTracks().forEach(t => t.stop()); flujo = null; }
  video.srcObject = null; video.hidden = true; btnCam.textContent = '🎥 Activar cámara'; if (img.hidden) vacio.hidden = false;
}
async function ciclo(t) {
  if (!animando) return;
  if (t - ultimo > 400 && video.readyState >= 2) { ultimo = t; try { pintarResultado(await clasificar(video)); } catch (e) { pintarError(e.message); detenerCamara(); return; } }
  requestAnimationFrame(ciclo);
}
btnCam.addEventListener('click', () => flujo ? detenerCamara() : activarCamara());
$('#btn-limpiar').addEventListener('click', () => {
  detenerCamara(); if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  img.removeAttribute('src'); img.hidden = true; vacio.hidden = false; inputArchivo.value = '';
  resultado.className = 'resultado'; resultado.innerHTML = '<span class="resultado-vacio">Aún no hay resultado.</span>';
  ['luis', 'no'].forEach(k => { $(`#barra-${k}`).style.width = '0'; $(`#pct-${k}`).textContent = '0%'; });
});
window.addEventListener('pagehide', detenerCamara);
iniciarModelo();
