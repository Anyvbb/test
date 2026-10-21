/* =========================================================
   demo-table.js — SOLO para la guía de componentes.
   Datos de ejemplo + orden, búsqueda, pestañas, filtro y
   paginación del lado del cliente. En la app real esto lo
   resuelve el backend; el marcado de salida es el mismo.
   ========================================================= */

(() => {
  const root = document.getElementById('contratos');
  if (!root) return;

  /* ---------- Datos de ejemplo (deterministas) ---------- */
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const SUCURSALES = [
    ['Cumbres', 'Monterrey, N.L.'], ['San Jerónimo', 'Monterrey, N.L.'], ['Contry', 'Monterrey, N.L.'],
    ['Valle Oriente', 'San Pedro, N.L.'], ['Linda Vista', 'Guadalupe, N.L.'], ['Anáhuac', 'San Nicolás, N.L.'],
    ['Juriquilla', 'Querétaro, Qro.'], ['Zibatá', 'El Marqués, Qro.'], ['Lomas', 'San Luis Potosí, S.L.P.'],
    ['Carranza', 'Saltillo, Coah.'], ['Nogalar', 'San Nicolás, N.L.'], ['Mitras', 'Monterrey, N.L.'],
    ['Aguascalientes Norte', 'Aguascalientes, Ags.'], ['León Campestre', 'León, Gto.'], ['Reynosa Las Fuentes', 'Reynosa, Tamps.'],
    ['Matamoros Centro', 'Matamoros, Tamps.'], ['Torreón Independencia', 'Torreón, Coah.'], ['Celaya Alameda', 'Celaya, Gto.'],
  ];
  const ARRENDADORES = [
    'Inmobiliaria del Norte, S.A. de C.V.', 'Desarrollos Cumbres, S.A.P.I.', 'Fibra Regia', 'Grupo Terra Bajío',
    'Plazas Comerciales MX', 'Jorge Garza Treviño', 'Patrimonio Lomas, S.C.', 'Fideicomiso F/2231',
    'Promotora Anáhuac', 'María Elena Cantú',
  ];
  const TIPOS = ['Arrendamiento', 'Arrendamiento', 'Arrendamiento', 'Subarrendamiento', 'Comodato', 'Compraventa'];
  const STATUS_LABEL = {
    draft: 'Borrador', signing: 'Pendiente de firma', active: 'Vigente', negotiation: 'En negociación',
    expiring: 'Por vencer', expired: 'Vencido', terminated: 'Dado de baja',
  };
  const STATUS_ORDER = ['expired', 'expiring', 'negotiation', 'signing', 'draft', 'active', 'terminated'];

  const TODAY = new Date(2026, 8, 28);
  const DAY = 86400000;

  const DATA = Array.from({ length: 48 }, (_, i) => {
    const [nombre, ciudad] = SUCURSALES[i % SUCURSALES.length];
    const r = rand();
    // Distribución: mayoría vigentes, algunos por vencer / vencidos / en proceso
    let status, days;
    if (r < 0.46)      { status = 'active';      days = 120 + Math.floor(rand() * 2400); }
    else if (r < 0.60) { status = 'expiring';    days = 5 + Math.floor(rand() * 85); }
    else if (r < 0.68) { status = 'expired';     days = -(3 + Math.floor(rand() * 120)); }
    else if (r < 0.76) { status = 'negotiation'; days = 10 + Math.floor(rand() * 150); }
    else if (r < 0.84) { status = 'signing';     days = 1800 + Math.floor(rand() * 1800); }
    else if (r < 0.93) { status = 'draft';       days = 1800 + Math.floor(rand() * 1800); }
    else               { status = 'terminated';  days = -(30 + Math.floor(rand() * 400)); }
    return {
      id: i + 1,
      folio: `CTR-${String(380 + i * 7).padStart(4, '0')}`,
      num: 2000 + ((i * 37) % 1200),
      sucursal: nombre,
      ciudad,
      arrendador: pick(ARRENDADORES),
      tipo: pick(TIPOS),
      renta: Math.round((60000 + rand() * 340000) / 500) * 500,
      fin: new Date(TODAY.getTime() + days * DAY),
      status,
    };
  });

  /* ---------- Formato ---------- */
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
  const dateFmt = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });

  function relative(d, status) {
    const days = Math.round((d - TODAY) / DAY);
    if (status === 'terminated') return 'Terminado';
    if (days < 0) return `Venció hace ${-days} día${days === -1 ? '' : 's'}`;
    if (days <= 90) return `Vence en ${days} día${days === 1 ? '' : 's'}`;
    const months = Math.round(days / 30);
    return months < 24 ? `${months} meses restantes` : `${Math.round(days / 365)} años restantes`;
  }

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Estado ---------- */
  const state = { tab: 'all', q: '', tipo: '', sort: 'fin', dir: 'ascending', page: 1, size: 10 };

  const TABS = {
    all: () => true,
    active: (r) => r.status === 'active',
    expiring: (r) => r.status === 'expiring',
    expired: (r) => r.status === 'expired',
    process: (r) => ['draft', 'signing', 'negotiation'].includes(r.status),
  };

  const els = {
    tbody: root.querySelector('tbody'),
    table: root.querySelector('table'),
    search: root.querySelector('[data-table-search]'),
    tipo: root.querySelector('[data-table-tipo]'),
    size: root.querySelector('[data-table-size]'),
    info: root.querySelector('.pagination-info'),
    pages: root.querySelector('.pagination-pages'),
    tabs: [...root.querySelectorAll('.tab[data-tab]')],
    ths: [...root.querySelectorAll('th[data-sort]')],
  };

  function baseFiltered() {
    const q = state.q.trim().toLowerCase();
    return DATA.filter((r) =>
      (!state.tipo || r.tipo === state.tipo) &&
      (!q || `${r.folio} ${r.sucursal} ${r.num} ${r.ciudad} ${r.arrendador}`.toLowerCase().includes(q))
    );
  }

  function sorted(rows) {
    const k = state.sort;
    const m = state.dir === 'ascending' ? 1 : -1;
    const val = (r) => (k === 'status' ? STATUS_ORDER.indexOf(r.status) : k === 'fin' ? r.fin.getTime() : r[k]);
    return [...rows].sort((a, b) => {
      const va = val(a), vb = val(b);
      return (typeof va === 'string' ? va.localeCompare(vb, 'es') : va - vb) * m;
    });
  }

  /* ---------- Render ---------- */
  function rowHTML(r) {
    return `<tr data-id="${r.id}" aria-selected="false">
      <td class="col-check"><label class="check"><input type="checkbox" data-select-row aria-label="Seleccionar ${r.folio}"></label></td>
      <td><a class="cell-link" href="#">${r.folio}</a></td>
      <td><div class="cell-stack"><span class="cell-primary">${esc(r.sucursal)}</span><span class="cell-secondary">#${r.num} · ${esc(r.ciudad)}</span></div></td>
      <td><span class="cell-truncate" title="${esc(r.arrendador)}">${esc(r.arrendador)}</span></td>
      <td>${r.tipo}</td>
      <td class="num">${money.format(r.renta)}</td>
      <td><div class="cell-stack"><span>${dateFmt.format(r.fin)}</span><span class="cell-secondary">${relative(r.fin, r.status)}</span></div></td>
      <td><span class="badge badge-dot" data-status="${r.status}">${STATUS_LABEL[r.status]}</span></td>
      <td class="col-actions"><button class="btn btn-ghost btn-icon btn-sm" popovertarget="row-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Acciones de ${r.folio}"><span class="icon" aria-hidden="true">more_vert</span></button></td>
    </tr>`;
  }

  const EMPTY = `<tr class="row-empty"><td colspan="9">
    <div class="empty-state">
      <span class="icon empty-icon" aria-hidden="true">search_off</span>
      <p class="empty-title">Sin contratos que coincidan</p>
      <p class="empty-text">Prueba con otro folio, sucursal o arrendador, o quita los filtros.</p>
      <button class="btn btn-secondary btn-sm" data-table-reset>Limpiar filtros</button>
    </div></td></tr>`;

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

    // Contadores de pestañas (respetan búsqueda y tipo)
    els.tabs.forEach((t) => {
      t.querySelector('.count').textContent = base.filter(TABS[t.dataset.tab]).length;
      t.setAttribute('aria-selected', String(t.dataset.tab === state.tab));
    });

    const rows = sorted(base.filter(TABS[state.tab]));
    const pages = Math.max(1, Math.ceil(rows.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.size;
    const slice = rows.slice(start, start + state.size);

    els.tbody.innerHTML = slice.length ? slice.map(rowHTML).join('') : EMPTY;
    UI.syncSelection(els.table);

    els.ths.forEach((th) => th.setAttribute('aria-sort', th.dataset.sort === state.sort ? state.dir : 'none'));

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

  /* ---------- Eventos ---------- */
  let t;
  els.search.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => { state.q = els.search.value; state.page = 1; render(); }, 150);
  });
  els.tipo.addEventListener('change', () => { state.tipo = els.tipo.value; state.page = 1; render(); });
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
      root.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else if (reset) {
      Object.assign(state, { tab: 'all', q: '', tipo: '', page: 1 });
      els.search.value = '';
      els.tipo.value = '';
      render();
    }
  });

  // Flechas ← → entre pestañas
  root.querySelector('.tabs').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const i = els.tabs.indexOf(document.activeElement);
    const next = els.tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + els.tabs.length) % els.tabs.length];
    next.focus();
    next.click();
  });

  /* ---------- Carga inicial con esqueleto ---------- */
  const skel = (w) => `<td><span class="skeleton" style="width:${w}"></span></td>`;
  els.tbody.innerHTML = Array.from({ length: 5 }, () =>
    `<tr><td class="col-check"></td>${skel('64px')}${skel('120px')}${skel('160px')}${skel('90px')}${skel('80px')}${skel('90px')}${skel('72px')}<td></td></tr>`
  ).join('');
  setTimeout(render, 700);
})();
