// This CSV exposes approved content only; raw Google Forms responses stay private.
const CONFIG = { approvedCsvUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQNfZl6CV_g9F4uw7fSeaJ5wuqs3RRQ8rfTk9CV7RBew5duFpZykZJ__dyiBuC6Jy3KVurxOtRJ_P9w/pub?gid=914710604&single=true&output=csv', submissionFormUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSd97Ji6c9tYx5qpkPZhH3ik6w8wsJsKnvWUoT8Gx2JJooeLkA/viewform?usp=pp_url&entry.1178173860=Jornada+Mundial+de+los+Pobres+2026' };
const el = id => document.getElementById(id);
let records = [];
const PAGE_SIZE = 12;
let currentPage = 1;
// País de procedencia del material, no el alcance de la Jornada.
// Se consulta junto con las iniciativas solo cuando hay un filtro activo.
const referenceItems = [
  {
    tipo: 'referencia', pais: 'Ciudad del Vaticano', ciudad: '', organizacion: 'La Santa Sede',
    titulo: 'Mensaje del papa León XIV',
    descripcion: 'Mensaje para la X Jornada Mundial de los Pobres, que se celebra el 15 de noviembre de 2026.',
    enlace1: 'https://www.vatican.va/content/leo-xiv/es/messages/poor/documents/20260613-messaggio-giornata-poveri.html',
    etiquetas: ['Leer el mensaje completo']
  },
  {
    tipo: 'referencia', pais: 'Ciudad del Vaticano', ciudad: '', organizacion: 'Dicasterio para la Evangelización',
    titulo: 'Mensajes del Papa para las jornadas anteriores',
    descripcion: 'Archivo institucional con enlaces a materiales de ediciones anteriores de la Jornada.',
    enlace1: 'https://www.evangelizatio.va/content/pcpne/es/attivita/gmdp.html',
    etiquetas: ['Visitar la página']
  },
  {
    tipo: 'referencia', pais: 'Italia', ciudad: 'Roma', organizacion: 'Frailes Menores Capuchinos',
    titulo: 'Carta a los miembros de las familias franciscanas nacionales de todo el mundo',
    descripcion: 'Una invitación franciscana a realizar acciones durante la semana del 9 al 15 de noviembre de 2026.',
    enlace1: 'https://www.ofmcap.org/es/proposta-per-la-settimana-mondiale-dei-poveri-2026/',
    enlace2: 'https://www.ofmcap.org/wp-content/uploads/2026/05/Lettera_FF_Settimana_Poveri_2026_ES.pdf',
    etiquetas: ['Ver propuesta', 'PDF en español']
  },
  {
    tipo: 'referencia', pais: 'México', ciudad: '', organizacion: 'Cáritas Mexicana',
    titulo: 'Subsidio para la Jornada 2026',
    descripcion: 'Subsidio pastoral en PDF compartido por Cáritas Mexicana para acompañar la preparación de la Jornada.',
    enlace1: 'https://caritasmexicana.org/uploads/732/Subsidio%20para%20la%20JMP%202026.pdf',
    etiquetas: ['Consultar el subsidio PDF']
  },
  {
    tipo: 'referencia', pais: 'Ecuador', ciudad: 'Guayaquil', organizacion: 'Ideas Misioneras',
    titulo: 'El Señor es el refugio del Pobre',
    descripcion: 'Hay momentos en los que la Iglesia necesita volver a mirar lo esencial. No solamente preguntarse qué hace, sino también a quién mira, a quién escucha y a quiénes puede estar dejando al margen.',
    enlace1: 'https://www.youtube.com/watch?v=zqv6dz5ZriE',
    etiquetas: ['Ver video en YouTube']
  }
];

// Carrusel de materiales: conserva el orden editorial y permite desplazarse
// con flechas, gestos táctiles, trackpad o teclado.
const resourceTrack = el('resource-track');
const resourceItems = [...resourceTrack.querySelectorAll('.resource-card')];
const resourcePrev = el('resource-prev');
const resourceNext = el('resource-next');
const resourceCounter = el('resource-counter');
function visibleResourceCount() {
  return Math.max(1, Math.min(resourceItems.length, Math.round((resourceTrack.clientWidth + 20) / (resourceItems[0].getBoundingClientRect().width + 20))));
}
function currentResourceIndex() {
  const step = resourceItems[0].getBoundingClientRect().width + 20;
  return Math.max(0, Math.min(resourceItems.length - visibleResourceCount(), Math.round(resourceTrack.scrollLeft / step)));
}
function updateResourceControls() {
  const index = currentResourceIndex();
  const count = visibleResourceCount();
  const pad = n => String(n).padStart(2, '0');
  resourceCounter.textContent = `${pad(index + 1)}–${pad(Math.min(resourceItems.length, index + count))} / ${pad(resourceItems.length)}`;
  resourcePrev.disabled = index === 0;
  resourceNext.disabled = index >= resourceItems.length - count;
}
function moveResource(step) {
  const target = Math.max(0, Math.min(resourceItems.length - visibleResourceCount(), currentResourceIndex() + step));
  resourceTrack.scrollTo({left: resourceItems[target].offsetLeft - resourceItems[0].offsetLeft, behavior:'smooth'});
}
resourcePrev.addEventListener('click', () => moveResource(-1));
resourceNext.addEventListener('click', () => moveResource(1));
resourceTrack.addEventListener('scroll', updateResourceControls, {passive:true});
window.addEventListener('resize', updateResourceControls);
updateResourceControls();

el('menu').addEventListener('click', () => {
  const open = el('nav').classList.toggle('open');
  el('menu').setAttribute('aria-expanded', String(open));
});
el('nav').querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  el('nav').classList.remove('open');
  el('menu').setAttribute('aria-expanded', 'false');
}));
if (CONFIG.submissionFormUrl) {
  const link = el('form-link');
  link.href = CONFIG.submissionFormUrl;
  link.textContent = 'Enviar iniciativa ↗';
  link.classList.remove('disabled');
  link.removeAttribute('aria-disabled');
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
} else el('form-link').addEventListener('click', e => e.preventDefault());

function parseCSV(csv) {
  let field = '', row = [], rows = [], quoted = false;
  csv = csv.replace(/^\uFEFF/, '');
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (quoted && csv[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === ',' && !quoted) { row.push(field); field = ''; }
    else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && csv[i + 1] === '\n') i++;
      row.push(field);
      if (row.some(x => x.trim())) rows.push(row);
      field = ''; row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(x => x.trim())) rows.push(row);
  if (!rows.length) return [];
  const headers = rows.shift().map(x => x.trim().toLowerCase());
  return rows.map(values => Object.fromEntries(headers.map((h, i) => [h, (values[i] || '').trim()])));
}
function safeURL(raw, image = false) {
  try {
    const url = new URL(raw);
    return ['https:', ...(image ? [] : ['http:'])].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}
function node(tag, cls, value) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (value !== undefined) n.textContent = value;
  return n;
}
function approvedLinks(item) {
  const seen = new Set();
  return ['enlace1','enlace2','enlace3','enlace4','enlace5'].map(key => safeURL(item[key])).filter(url => {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}
function sourceInfo(url) {
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    const id = host === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v');
    return { label:'YouTube', videoId: /^[\w-]{11}$/.test(id || '') ? id : '' };
  }
  if (host === 'instagram.com') return {label:'Instagram'};
  if (host === 'facebook.com' || host === 'fb.watch' || host === 'm.facebook.com') return {label:'Facebook'};
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return {label:'TikTok'};
  if (parsed.pathname.toLowerCase().endsWith('.pdf')) return {label:'PDF'};
  return {label:'Sitio original'};
}
function makeCard(item) {
  const article = node('article', 'card'), cover = node('div', 'card-cover');
  const isReference = item.tipo === 'referencia';
  const sources = approvedLinks(item);
  const video = sources.map(sourceInfo).find(info => info.videoId);
  const mainSource = sources[0];
  const host = new URL(mainSource).hostname.replace(/^www\./, '');
  const info = sourceInfo(mainSource);
  const isDocument = sources.some(url => sourceInfo(url).label === 'PDF');
  cover.classList.add('resource-cover', video ? 'cover-youtube' : isDocument ? 'cover-document' : 'cover-institution');
  if (video) {
    const img = node('img');
    img.src = `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`;
    img.alt = 'Miniatura de ' + item.titulo; img.loading = 'lazy';
    img.onerror = () => { img.remove(); cover.classList.remove('cover-youtube'); cover.classList.add('cover-institution'); appendCoverFallback(); };
    cover.append(img);
    cover.append(node('span', 'play-badge', '▶'));
  } else appendCoverFallback();
  function appendCoverFallback() {
    cover.append(node('span', 'cover-symbol', isDocument ? '▤' : info.label === 'Instagram' || info.label === 'Facebook' || info.label === 'TikTok' ? '◉' : '◎'));
    const copy = node('span', 'cover-info');
    copy.append(node('b', '', isDocument ? 'DOCUMENTO PDF' : info.label === 'Sitio original' ? 'PUBLICACIÓN WEB' : info.label.toUpperCase()));
    copy.append(node('small', '', host));
    cover.append(copy);
  }
  cover.append(node('span', 'country-badge', item.pais));
  article.append(cover);
  const body = node('div', 'card-body');
  body.append(node('span', 'card-type', isReference ? 'Material de referencia' : 'Iniciativa compartida'));
  body.append(node('h4', '', item.titulo));
  if (item.descripcion) body.append(node('p', '', item.descripcion));
  body.append(node('span', 'card-org', [item.organizacion,item.ciudad].filter(Boolean).join(' · ')));
  const links = node('div', 'platform-links');
  sources.forEach((url, index) => {
    const label = isReference ? item.etiquetas[index] : sourceInfo(url).label;
    const link = node('a', 'platform-link', label + ' ↗');
    link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    links.append(link);
  });
  body.append(links); article.append(body); return article;
}
function pageButton(label, page, options = {}) {
  const button = node('button', 'page-button' + (options.current ? ' is-current' : ''), label);
  button.type = 'button';
  button.disabled = Boolean(options.disabled);
  button.setAttribute('aria-label', options.ariaLabel || `Página ${page}`);
  if (options.current) button.setAttribute('aria-current', 'page');
  button.addEventListener('click', () => {
    currentPage = page;
    render();
    el('pagination').scrollIntoView({block:'nearest', behavior:'smooth'});
  });
  return button;
}
function renderPagination(total) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pagination = el('pagination');
  pagination.hidden = totalPages <= 1;
  if (totalPages <= 1) return;
  const first = (currentPage - 1) * PAGE_SIZE + 1;
  const last = Math.min(currentPage * PAGE_SIZE, total);
  el('page-summary').textContent = `Mostrando ${first}–${last} de ${total} resultados`;
  const controls = el('page-controls');
  controls.replaceChildren(pageButton('←', currentPage - 1, {disabled:currentPage === 1, ariaLabel:'Página anterior'}));
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  let previous = 0;
  [...pages].filter(n => n >= 1 && n <= totalPages).sort((a,b) => a-b).forEach(page => {
    if (page - previous > 1) controls.append(node('span', 'page-ellipsis', '…'));
    controls.append(pageButton(String(page), page, {current:page === currentPage}));
    previous = page;
  });
  controls.append(pageButton('→', currentPage + 1, {disabled:currentPage === totalPages, ariaLabel:'Página siguiente'}));
}
function render() {
  const query = el('q').value.trim().toLocaleLowerCase();
  const country = el('country').value;
  const hasFilter = Boolean(query || country);
  const candidates = hasFilter ? [...records, ...referenceItems] : records;
  const subset = candidates.filter(r => (!country || r.pais === country) &&
    (!query || [r.pais,r.ciudad,r.organizacion,r.titulo,r.descripcion].join(' ').toLocaleLowerCase().includes(query)));
  currentPage = Math.min(currentPage, Math.max(1, Math.ceil(subset.length / PAGE_SIZE)));
  const offset = (currentPage - 1) * PAGE_SIZE;
  el('cards').replaceChildren(...subset.slice(offset, offset + PAGE_SIZE).map(makeCard));
  renderPagination(subset.length);
  el('cards').hidden = !subset.length;
  el('empty').hidden = !hasFilter && !records.length || !!subset.length;
  if (!subset.length && (records.length || hasFilter)) {
    el('empty').querySelector('h3').textContent = 'No encontramos coincidencias.';
    el('empty').querySelector('p').textContent = 'Prueba con otro país, ciudad, organización o término de búsqueda.';
  }
  el('result-count').textContent = subset.length + (subset.length === 1 ? ' resultado' : ' resultados');
  document.querySelector('.results-head').hidden = !records.length && !hasFilter;
}
['q','country'].forEach(id => el(id).addEventListener('input', () => {currentPage = 1; render();}));
el('clear').addEventListener('click', () => {
  el('q').value = ''; el('country').value = ''; currentPage = 1; render();
});
el('share').addEventListener('click', async () => {
  const button = el('share');
  const original = 'Copiar enlace del directorio ↗';
  const url = location.origin + location.pathname;
  try {
    await navigator.clipboard.writeText(url);
    button.textContent = '¡Enlace copiado! ✓';
  } catch {
    window.prompt('Copia este enlace para compartir el directorio:', url);
    button.textContent = original;
    return;
  }
  window.setTimeout(() => { button.textContent = original; }, 3000);
});
async function load() {
  if (!CONFIG.approvedCsvUrl) { render(); return; }
  try {
    const response = await fetch(CONFIG.approvedCsvUrl);
    if (!response.ok) throw new Error('No se pudo consultar la hoja');
    records = parseCSV(await response.text()).filter(r => approvedLinks(r).length && r.titulo && r.pais);
    records.sort((a,b) => Number((b.id || '').split('-').pop()) - Number((a.id || '').split('-').pop()));
    const countries = [...new Set([...records, ...referenceItems].map(r => r.pais))].sort((a,b) => a.localeCompare(b, 'es'));
    countries.forEach(c => { const opt = node('option', '', c); opt.value = c; el('country').append(opt); });
    render();
  } catch {
    el('empty').querySelector('h3').textContent = 'El directorio está temporalmente en actualización.';
    el('empty').querySelector('p').textContent = 'No pudimos cargar las publicaciones. Vuelve a intentarlo más tarde.';
    render();
  }
}
load();
