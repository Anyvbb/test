/* =========================================================
   sucursales.js — prototipo BRS · pantalla Sucursales
   Usa el modelo compartido (data.js) y los formularios en
   modal (forms.js). Los cambios se ven en las demás pantallas.
   ========================================================= */

(() => {
  const root = document.getElementById('sucursales');
  const { db, esc, num: nf, contratosDe } = CLETA;
  const DATA = db.sucursales;

  /* ---------- Columnas ---------- */
  const dash = '<span class="subtle">—</span>';
  const TENURE = { Propio: 'own', Tercero: 'third', Mixto: 'mixed' };
  const detalle = (r, hash = '') => `sucursal.html?id=${r.id}${hash}`;
  const contratos = (r) => contratosDe(r.id).length;

  const COLUMNS = [
    { key: 'nombre', label: 'Sucursal', sort: true, locked: true,
      cell: (r) => `<div class="cell-stack"><a class="cell-link" href="${detalle(r)}">${esc(r.nombre)}</a><span class="cell-secondary">${r.num ? `Tienda #${r.num}` : 'Sin número de tienda'}</span></div>` },
    { key: 'folio', label: 'Folio', sort: true,
      cell: (r) => `<span class="cell-mono cell-truncate" title="${r.folio}">${r.folio}</span>` },
    { key: 'arrendador', label: 'Arrendador', sort: true,
      cell: (r) => r.arrendador
        ? `<span class="cell-truncate" title="${esc(r.arrendador)}">${esc(r.arrendador)}</span>`
        : r.tipo === 'Propio' ? dash : '<span class="warning-text small">Sin capturar</span>' },
    { key: 'tipo', label: 'Tipo', sort: true,
      cell: (r) => `<span class="badge" data-tenure="${TENURE[r.tipo]}">${r.tipo}</span>` },
    { key: 'empresa', label: 'Empresa',
      cell: (r) => `<span class="cell-truncate" title="${esc(r.empresa)}">${esc(r.empresa)}</span>` },
    { key: 'pais', label: 'País', sort: true, cell: (r) => esc(r.pais) || dash },
    { key: 'estado', label: 'Estado', sort: true, cell: (r) => esc(r.estado) || dash },
    { key: 'ciudad', label: 'Ciudad', sort: true, cell: (r) => esc(r.ciudad) || dash },
    { key: 'm2', label: 'M² construcción', sort: true, num: true,
      cell: (r) => (r.m2 ? `${nf(r.m2)} m²` : dash) },
    { key: 'contratos', label: 'Contratos', sort: true, num: true, value: contratos,
      cell: (r) => { const n = contratos(r); return n ? `<a class="cell-link" href="${detalle(r, '#contratos')}">${n}</a>` : '<span class="subtle">0</span>'; } },
  ];

  /* ---------- Estado de la vista ---------- */
  const state = { tab: 'all', q: '', estado: '', sort: 'nombre', dir: 'ascending', page: 1, size: 25, hidden: new Set() };

  const $ = (s) => root.querySelector(s);
  const els = {
    thead: $('thead tr'), tbody: $('tbody'),
    search: $('[data-table-search]'), estado: $('[data-table-estado]'), size: $('[data-table-size]'),
    total: $('[data-table-total]'), info: $('.pagination-info'), pages: $('.pagination-pages'),
    tabs: [...root.querySelectorAll('.tab[data-tab]')],
  };

  const visibleCols = () => COLUMNS.filter((c) => !state.hidden.has(c.key));

  function baseFiltered() {
    const q = state.q.trim().toLowerCase();
    return DATA.filter((r) =>
      (!state.estado || r.estado === state.estado) &&
      (!q || `${r.nombre} ${r.num ?? ''}`.toLowerCase().includes(q))
    );
  }

  function sorted(rows) {
    const col = COLUMNS.find((c) => c.key === state.sort);
    const val = col.value || ((r) => r[col.key]);
    const m = state.dir === 'ascending' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = val(a), vb = val(b);
      if (typeof va === 'number' || typeof vb === 'number') return ((va ?? -1) - (vb ?? -1)) * m;
      if (!va && vb) return 1; // vacíos al final
      if (va && !vb) return -1;
      return String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' }) * m;
    });
  }

  function renderHead() {
    els.thead.innerHTML = visibleCols().map((c) => {
      const cls = c.num ? ' class="num"' : '';
      const sort = c.sort ? ` data-sort="${c.key}" aria-sort="${state.sort === c.key ? state.dir : 'none'}"` : '';
      return `<th${cls}${sort}>${c.sort ? `<button class="th-sort">${c.label}</button>` : c.label}</th>`;
    }).join('');
  }

  function pageList(total, cur) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out = [1];
    const from = Math.max(2, cur - 1), to = Math.min(total - 1, cur + 1);
    if (from > 2) out.push('…');
    for (let i = from; i <= to; i++) out.push(i);
    if (to < total - 1) out.push('…');
    out.push(total);
    return out;
  }

  function render() {
    const base = baseFiltered();
    els.tabs.forEach((t) => {
      const n = t.dataset.tab === 'all' ? base.length : base.filter((r) => r.tipo === t.dataset.tab).length;
      t.querySelector('.count').textContent = n;
      t.setAttribute('aria-selected', String(t.dataset.tab === state.tab));
    });

    const rows = sorted(state.tab === 'all' ? base : base.filter((r) => r.tipo === state.tab));
    const pages = Math.max(1, Math.ceil(rows.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.size;
    const slice = rows.slice(start, start + state.size);
    const cols = visibleCols();

    renderHead();
    els.tbody.innerHTML = slice.length
      ? slice.map((r) => `<tr data-id="${r.id}">
          ${cols.map((c) => `<td${c.num ? ' class="num"' : ''}>${c.cell(r)}</td>`).join('')}
        </tr>`).join('')
      : `<tr class="row-empty"><td colspan="${cols.length}">
          <div class="empty-state">
            <span class="icon empty-icon" aria-hidden="true">search_off</span>
            <p class="empty-title">No encontramos sucursales</p>
            <p class="empty-text">Prueba con otro nombre o número de tienda, o quita los filtros.</p>
            <button class="btn btn-secondary btn-sm" data-table-reset>Limpiar filtros</button>
          </div></td></tr>`;

    els.total.textContent = CLETA.plural(rows.length, 'registro');
    els.info.innerHTML = rows.length
      ? `Mostrando <strong>${start + 1}–${start + slice.length}</strong> de <strong>${rows.length}</strong>`
      : 'Sin resultados';

    const btn = (p) => `<li class="page-num"><button class="page-btn" data-page="${p}" ${p === state.page ? 'aria-current="page"' : ''} aria-label="Página ${p}">${p}</button></li>`;
    els.pages.innerHTML = `
      <li><button class="page-btn" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''} aria-label="Página anterior"><span class="icon" aria-hidden="true">chevron_left</span></button></li>
      ${pageList(pages, state.page).map((p) => (p === '…' ? '<li class="page-gap"><span class="page-ellipsis" aria-hidden="true">…</span></li>' : btn(p))).join('')}
      <li><span class="page-compact">${state.page} / ${pages}</span></li>
      <li><button class="page-btn" data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''} aria-label="Página siguiente"><span class="icon" aria-hidden="true">chevron_right</span></button></li>`;
  }

  /* ---------- Filtros, orden y paginación ---------- */
  els.estado.insertAdjacentHTML('beforeend', [...new Set(DATA.map((r) => r.estado).filter(Boolean))].sort().map((e) => `<option>${e}</option>`).join(''));

  let debounce;
  els.search.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = els.search.value; state.page = 1; render(); }, 150);
  });
  els.estado.addEventListener('change', () => { state.estado = els.estado.value; state.page = 1; render(); });
  els.size.addEventListener('change', () => { state.size = Number(els.size.value); state.page = 1; render(); });

  root.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab[data-tab]');
    const sort = e.target.closest('th[data-sort] .th-sort');
    const page = e.target.closest('.page-btn[data-page]');
    const reset = e.target.closest('[data-table-reset]');

    if (tab) { state.tab = tab.dataset.tab; state.page = 1; render(); }
    else if (sort) {
      const key = sort.closest('th').dataset.sort;
      state.dir = state.sort === key && state.dir === 'ascending' ? 'descending' : 'ascending';
      state.sort = key;
      render();
    } else if (page && !page.disabled) {
      state.page = Number(page.dataset.page);
      render();
      root.scrollIntoView({ block: 'start', behavior: 'smooth' });
    } else if (reset) {
      Object.assign(state, { tab: 'all', q: '', estado: '', page: 1 });
      els.search.value = '';
      els.estado.value = '';
      render();
    }
  });

  root.querySelector('.tabs').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const i = els.tabs.indexOf(document.activeElement);
    const next = els.tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + els.tabs.length) % els.tabs.length];
    next.focus();
    next.click();
  });

  /* ---------- Columnas visibles ---------- */
  const colOptions = document.querySelector('[data-col-options]');
  colOptions.innerHTML = COLUMNS.map((c) => `
    <label class="menu-item"><span class="check"><input type="checkbox" data-col-toggle="${c.key}" checked ${c.locked ? 'disabled' : ''}></span>${c.label}</label>`).join('');
  const colSummary = root.querySelector('[data-col-summary]');
  function syncColSummary() {
    const shown = COLUMNS.length - state.hidden.size;
    colSummary.textContent = shown === COLUMNS.length ? 'Todas las columnas' : `${shown} de ${COLUMNS.length} columnas`;
  }
  colOptions.addEventListener('change', (e) => {
    const key = e.target.dataset.colToggle;
    e.target.checked ? state.hidden.delete(key) : state.hidden.add(key);
    syncColSummary();
    render();
  });
  syncColSummary();

  /* ---------- Alta y edición ---------- */
  function openForm(r = null) {
    (r ? Forms.sucursal.bind(null, r) : Forms.nuevaSucursal)((values, tenencia = {}) => {
      if (r) {
        Object.assign(r, values);
        CLETA.log(r, 'Datos de la sucursal actualizados');
        UI.toast(`Se guardaron los cambios de ${values.nombre}.`, 'success');
      } else {
        // Respaldo de la tenencia capturado en el alta: escritura (propio/mixto) y/o contrato (tercero/mixto)
        const archivo = (nombre) => (nombre ? [{ nombre, fecha: CLETA.TODAY, por: 'Usuario de desarrollo' }] : []);
        const { escritura: e, contrato: c } = tenencia;
        const nueva = {
          id: db.nextSucursalId++, folio: CLETA.uuid(), ...values,
          perfil: null, historial: [], documentos: [],
          escrituras: e ? [{ id: db.nextEscrituraId++, acto: e.acto, numero: e.numero, fecha: e.fecha, notaria: e.notaria, archivos: archivo(e.archivo) }] : [],
          creado: { por: 'Usuario de desarrollo', fecha: `${CLETA.TODAY}T${new Date().toTimeString().slice(0, 5)}` },
        };
        DATA.push(nueva);
        if (c) {
          db.contratos.push({ id: db.nextContratoId++, sucursalId: nueva.id, arrendador: c.arrendador, inicio: c.inicio, fin: c.fin,
            renta: c.renta, doc: !!c.archivo, responsable: null, gestion: 'sin-iniciar', estado: 'activo' });
        }
        Object.assign(state, { tab: 'all', q: '', estado: '', page: 1 });
        els.search.value = '';
        els.estado.value = '';
        UI.toast(`Sucursal ${values.nombre} dada de alta.`, 'success');
      }
      CLETA.save();
      render();
    });
  }
  document.querySelector('[data-new-branch]').addEventListener('click', () => openForm());

  /* ---------- Clic en la fila: abre el detalle ---------- */
  // El nombre sigue siendo un enlace (teclado y lectores de pantalla); el resto de la fila también navega.
  els.tbody.addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-id]');
    if (!tr || e.target.closest('a, button, input')) return;
    if (window.getSelection()?.toString()) return; // no navegar si el usuario está seleccionando texto
    location.href = detalle({ id: tr.dataset.id });
  });

  /* ---------- Carga inicial ---------- */
  renderHead();
  const skel = (w) => `<td><span class="skeleton" style="width:${w}"></span></td>`;
  els.tbody.innerHTML = Array.from({ length: 8 }, () =>
    `<tr>${['140px', '180px', '90px', '64px', '200px', '56px', '90px', '110px', '72px', '32px'].map(skel).join('')}</tr>`
  ).join('');
  setTimeout(render, 400);
})();
