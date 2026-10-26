// Connect these values only after creating the Google Form and a separate,
// approved-only public sheet. Never publish the raw form responses.
const CONFIG = { approvedCsvUrl: '', submissionFormUrl: '' };
const el = id => document.getElementById(id);
let records = [];

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
  link.textContent = 'Enviar mi iniciativa ↗';
  link.classList.remove('disabled');
  link.removeAttribute('aria-disabled');
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  const report = el('report-link');
  report.href = CONFIG.submissionFormUrl;
  report.target = '_blank';
  report.rel = 'noopener noreferrer';
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
function makeCard(item) {
  const article = node('article', 'card'), cover = node('div', 'card-cover');
  const image = safeURL(item.imagen, true);
  if (image) {
    const img = node('img');
    img.src = image; img.alt = 'Portada: ' + item.titulo; img.loading = 'lazy';
    img.onerror = () => { img.remove(); cover.prepend(node('span', '', '✳')); };
    cover.append(img);
  } else cover.append(node('span', '', '✳'));
  cover.append(node('span', 'country-badge', item.pais));
  article.append(cover);
  const body = node('div', 'card-body');
  body.append(node('span', 'card-type', item.tipo || 'Iniciativa'));
  body.append(node('h4', '', item.titulo));
  if (item.descripcion) body.append(node('p', '', item.descripcion));
  body.append(node('span', 'card-org', [item.organizacion,item.ciudad].filter(Boolean).join(' · ')));
  const platforms = [
    ['facebook','Facebook'],['instagram','Instagram'],['tiktok','TikTok'],
    ['youtube','YouTube'],['web','Web oficial'],['pdf','PDF']
  ];
  const links = node('div', 'platform-links');
  const knownURLs = new Set();
  platforms.forEach(([key,label]) => {
    const url = safeURL(item[key]);
    if (!url || knownURLs.has(url)) return;
    knownURLs.add(url);
    const link = node('a', 'platform-link', label + ' ↗');
    link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    links.append(link);
  });
  const primary = safeURL(item.enlace);
  if (primary && !knownURLs.has(primary)) {
    const link = node('a', 'platform-link', links.childElementCount ? 'Otra fuente ↗' : 'Ver fuente original ↗');
    link.href = primary; link.target = '_blank'; link.rel = 'noopener noreferrer';
    links.append(link);
  }
  body.append(links); article.append(body); return article;
}
function render() {
  const query = el('q').value.trim().toLocaleLowerCase();
  const country = el('country').value, type = el('type').value;
  const subset = records.filter(r => (!country || r.pais === country) && (!type || r.tipo === type) &&
    (!query || [r.pais,r.ciudad,r.organizacion,r.titulo,r.descripcion,r.tipo].join(' ').toLocaleLowerCase().includes(query)));
  el('cards').replaceChildren(...subset.map(makeCard));
  el('cards').hidden = !subset.length;
  el('empty').hidden = !records.length || !!subset.length;
  if (!subset.length && records.length) {
    el('empty').querySelector('h3').textContent = 'No encontramos coincidencias.';
    el('empty').querySelector('p').textContent = 'Prueba con otro país, tipo de contenido o término de búsqueda.';
  }
  el('result-count').textContent = records.length ? subset.length + (subset.length === 1 ? ' resultado' : ' resultados') : '';
  document.querySelector('.results-head').hidden = !records.length;
}
['q','country','type'].forEach(id => el(id).addEventListener('input', render));
el('clear').addEventListener('click', () => {
  el('q').value = ''; el('country').value = ''; el('type').value = ''; render();
});
el('share').href = 'mailto:?subject=' + encodeURIComponent('Directorio de la Jornada Mundial de los Pobres') +
  '&body=' + encodeURIComponent('Te comparto este directorio de iniciativas: ' + location.href);
async function load() {
  if (!CONFIG.approvedCsvUrl) { render(); return; }
  try {
    const response = await fetch(CONFIG.approvedCsvUrl);
    if (!response.ok) throw new Error('No se pudo consultar la hoja');
    records = parseCSV(await response.text()).filter(r => (safeURL(r.enlace) || ['facebook','instagram','tiktok','youtube','web','pdf'].some(k => safeURL(r[k]))) && r.titulo && r.pais &&
      (!r.estado || r.estado.toLocaleLowerCase() === 'aprobado'));
    records.sort((a,b) => (b.fecha_publicacion || '').localeCompare(a.fecha_publicacion || ''));
    const countries = [...new Set(records.map(r => r.pais))].sort((a,b) => a.localeCompare(b, 'es'));
    countries.forEach(c => { const opt = node('option', '', c); opt.value = c; el('country').append(opt); });
    render();
  } catch {
    el('empty').querySelector('h3').textContent = 'El directorio está temporalmente en actualización.';
    el('empty').querySelector('p').textContent = 'No pudimos cargar las publicaciones. Vuelve a intentarlo más tarde.';
    render();
  }
}
load();
