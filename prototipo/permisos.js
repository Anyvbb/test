/* =========================================================
   permisos.js — prototipo BRS · Permisos y licencias
   Una fila por sucursal con el semáforo de sus permisos,
   la más urgente primero. El nombre de la sucursal lleva a su
   expediente de permisos (expediente.html).
   ========================================================= */

(() => {
  const root = document.getElementById('permisos');
  const { db, esc, fmtDate, dueLabel, dueStatus, daysUntil, plural } = CLETA;

  const state = { tab: 'all', q: '', estado: '', sort: 'proximo', dir: 'ascending', page: 1, size: 25 };

  const $ = (s) => root.querySelector(s);
  const els = {
    tbody: $('tbody'), ths: [...root.querySelectorAll('th[data-sort]')],
    search: $('[data-table-search]'), estado: $('[data-table-estado]'), size: $('[data-table-size]'),
    total: $('[data-table-total]'), info: $('.pagination-info'), pages: $('.pagination-pages'),
    tabs: [...root.querySelectorAll('.tab[data-tab]')],
  };

  /* ---------- Filas ---------- */
  const estatus = (c) => (!c.total ? 'sinPermisos' : c.vencidos ? 'vencidos' : c.porVencer ? 'porVencer' : 'alDia');

  function rowsData() {
    return CLETA.habilitadas().map((s) => {
      const c = CLETA.semaforo(CLETA.permisosDe(s.id));
      return { s, c, estatus: estatus(c) };
    });
  }

  function sorted(rows) {
    const m = state.dir === 'ascending' ? 1 : -1;
    const byName = (a, b) => a.s.nombre.localeCompare(b.s.nombre, 'es', { sensitivity: 'base' });
    return [...rows].sort((a, b) => {
      if (state.sort === 'nombre') return byName(a, b) * m;
      if (state.sort === 'total') return (a.c.total - b.c.total) * m || byName(a, b);
      // Próximo vencimiento: los que tienen fecha primero; sin permisos siempre al final
      const da = a.c.proximo ? daysUntil(a.c.proximo.fin) : a.c.total ? 1e6 : 1e7;
      const dbb = b.c.proximo ? daysUntil(b.c.proximo.fin) : b.c.total ? 1e6 : 1e7;
      if (da >= 1e7 || dbb >= 1e7) return da - dbb || byName(a, b);
      return (da - dbb) * m || byName(a, b);
    });
  }

  const semaforo = (c) => [
    c.vencidos && `<span class="badge" data-status="expired">${plural(c.vencidos, 'vencido')}</span>`,
    c.porVencer && `<span class="badge" data-status="expiring">${c.porVencer} en proceso</span>`,
    c.vigentes && `<span class="badge" data-status="active">${plural(c.vigentes, 'vigente')}</span>`,
    c.unica && `<span class="badge">${c.unica} sin vigencia</span>`,
  ].filter(Boolean).join('');

  function proximo(c) {
    if (!c.proximo) return c.total ? '<span class="small subtle">Sin vencimientos</span>' : '<span class="subtle">—</span>';
    const p = c.proximo;
    const st = dueStatus(p.fin) || (daysUntil(p.fin) <= 90 ? 'expiring' : 'active');
    return `<div class="cell-stack">
      <span><span class="badge" data-status="${st}">${dueLabel(p.fin)}</span></span>
      <span class="cell-secondary cell-truncate" title="${esc(p.nombre)}">${fmtDate(p.fin)} · ${esc(p.nombre)}</span>
    </div>`;
  }

  let resaltada = null; // recién habilitada
  function rowHTML({ s, c }) {
    return `<tr data-id="${s.id}" ${s.id === resaltada ? 'class="is-new"' : ''}>
      <td><div class="cell-stack"><a class="cell-link" href="expediente.html?id=${s.id}">${esc(s.nombre)}</a>${s.id === resaltada ? ' <span class="badge badge-accent">Recién habilitada</span>' : ''}<span class="cell-secondary cell-truncate" title="${esc(CLETA.lugar(s))}">${esc(CLETA.lugar(s))}</span></div></td>
      <td>${c.total ? plural(c.total, 'capturado') : '<span class="subtle">Sin capturar</span>'}</td>
      <td><div class="cell-badges">${semaforo(c) || '<span class="subtle">—</span>'}</div></td>
      <td>${proximo(c)}</td>
    </tr>`;
  }

  /* ---------- Render ---------- */
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
    const q = state.q.trim().toLowerCase();
    const base = rowsData().filter(({ s }) =>
      (!state.estado || s.estado === state.estado) && (!q || `${s.nombre} ${s.num ?? ''} ${s.ciudad ?? ''}`.toLowerCase().includes(q)));

    els.tabs.forEach((t) => {
      const k = t.dataset.tab;
      t.querySelector('.count').textContent = k === 'all' ? base.length : base.filter((r) => r.estatus === k).length;
      t.setAttribute('aria-selected', String(k === state.tab));
    });

    const rows = sorted(state.tab === 'all' ? base : base.filter((r) => r.estatus === state.tab));
    const pages = Math.max(1, Math.ceil(rows.length / state.size));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * state.size;
    const slice = rows.slice(start, start + state.size);

    els.ths.forEach((th) => th.setAttribute('aria-sort', th.dataset.sort === state.sort ? state.dir : 'none'));
    els.tbody.innerHTML = slice.length ? slice.map(rowHTML).join('') : `<tr class="row-empty"><td colspan="4">
      <div class="empty-state">
        <span class="icon empty-icon" aria-hidden="true">search_off</span>
        <p class="empty-title">No hay sucursales con este filtro</p>
        <p class="empty-text">Prueba con otra sucursal o estado, o quita los filtros.</p>
        <button class="btn btn-secondary btn-sm" data-table-reset>Limpiar filtros</button>
      </div></td></tr>`;

    els.total.textContent = plural(rows.length, 'sucursal', 'sucursales');
    els.info.innerHTML = rows.length
      ? `Mostrando <strong>${start + 1}–${start + slice.length}</strong> de <strong>${rows.length}</strong>`
      : 'Sin resultados';

    const btn = (p) => `<li class="page-num"><button class="page-btn" data-page="${p}" ${p === state.page ? 'aria-current="page"' : ''} aria-label="Página ${p}">${p}</button></li>`;
    els.pages.innerHTML = `
      <li><button class="page-btn" data-page="${state.page - 1}" ${state.page === 1 ? 'disabled' : ''} aria-label="Página anterior"><span class="icon" aria-hidden="true">chevron_left</span></button></li>
      ${pageList(pages, state.page).map((p) => (p === '…' ? '<li class="page-gap"><span class="page-ellipsis" aria-hidden="true">…</span></li>' : btn(p))).join('')}
      <li><span class="page-compact">${state.page} / ${pages}</span></li>
      <li><button class="page-btn" data-page="${state.page + 1}" ${state.page === pages ? 'disabled' : ''} aria-label="Página siguiente"><span class="icon" aria-hidden="true">chevron_right</span></button></li>`;
    Shell.refresh();
  }

  /* ---------- Habilitar sucursal ---------- */
  function fillEstados() {
    const value = els.estado.value;
    els.estado.innerHTML = `<option value="">Todos los estados</option>${[...new Set(CLETA.habilitadas().map((s) => s.estado).filter(Boolean))].sort().map((e) => `<option>${e}</option>`).join('')}`;
    els.estado.value = value;
  }
  function habilitar() {
    Forms.habilitar(({ sucursalId, perfil }) => {
      const s = CLETA.sucursal(sucursalId);
      s.habilitada = true;
      s.perfilPermisos = { ...perfil, fecha: CLETA.TODAY, por: Shell.perfil.nombre };
      // Restaurante también decide qué tipos del catálogo le aplican (tiposAplicables)
      s.perfil = [...new Set([...(s.perfil || []).filter((p) => p !== 'Restaurante'), ...(perfil.restaurante ? ['Restaurante'] : [])])];
      CLETA.log(s, 'Habilitada en Permisos y licencias', 'add_business');
      CLETA.save();
      resaltada = s.id;
      Object.assign(state, { tab: 'all', q: '', estado: '', page: 1 });
      els.search.value = '';
      fillEstados();
      render();
      document.querySelector(`tr[data-id="${s.id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      UI.toast(`${s.nombre} quedó habilitada. Abre su expediente para capturar sus permisos.`, 'success');
    });
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-habilitar]')) habilitar(); });

  /* ---------- Eventos ---------- */
  fillEstados();

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
    } else if (e.target.closest('[data-table-reset]')) {
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

  render();
})();
