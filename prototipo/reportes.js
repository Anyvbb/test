/* =========================================================
   reportes.js — prototipo BRS · Reporte de permisos y licencias
   Perfil de permisos. Filtros en cascada (estado → tienda),
   resumen (habilitación, avance de captura, sin documento),
   distribución por estatus (dona; segmentos y leyenda filtran), vencimientos de los próximos 12 meses, avance por
   sucursal, detalle ordenable y exportación a Excel (CSV) de
   exactamente lo que se ve. Solo cuentan sucursales habilitadas.
   ========================================================= */

(() => {
  const root = document.getElementById('reporte');
  const { db, esc, fmtDate, dueLabel, daysUntil, addDays, addMonths, plural, TODAY } = CLETA;

  // Ventana de aviso: el permiso entra a "en proceso" 90 días antes de su vigencia
  const AVISO_DIAS = 90;
  const ESTATUS = {
    vencido:   { label: 'Vencido',       plural: 'Vencidos',      tone: 'danger',  status: 'expired',  color: 'var(--status-expired-solid)' },
    porVencer: { label: 'En proceso',    plural: 'En proceso',    tone: 'warning', status: 'expiring', color: 'var(--status-expiring-solid)' },
    vigente:   { label: 'Vigente',       plural: 'Vigentes',      tone: 'success', status: 'active',   color: 'var(--status-active-solid)' },
    unica:     { label: 'Sin vigencia', plural: 'Sin vigencia', tone: '',        status: '',         color: 'var(--status-draft-solid)' },
  };

  const state = { estado: '', tienda: '', estatus: '', permiso: '', area: '', anio: '', sort: 'vigencia', dir: 'ascending' };

  const $ = (s) => root.querySelector(s);
  const els = {
    filters: Object.fromEntries([...root.querySelectorAll('[data-filter]')].map((el) => [el.dataset.filter, el])),
    total: $('[data-total]'), reset: $('[data-reset]'), donut: $('[data-donut]'),
    tbody: $('[data-detalle]'), resumen: $('[data-resumen]'), meses: $('[data-meses]'), mesesSub: $('[data-meses-sub]'), cobertura: $('[data-cobertura]'), ths: [...root.querySelectorAll('th[data-sort]')], exportBtn: $('[data-export]'),
  };

  /* ---------- Datos ---------- */
  const estatusDe = (p) => {
    if (!p.fin) return 'unica';
    const n = daysUntil(p.fin);
    return n < 0 ? 'vencido' : n <= AVISO_DIAS ? 'porVencer' : 'vigente';
  };
  const ROWS = db.permisos.map((p) => {
    const s = CLETA.sucursal(p.sucursalId);
    return { p, s, estatus: estatusDe(p), aviso: p.fin ? addDays(p.fin, -AVISO_DIAS) : null };
  }).filter((r) => r.s?.habilitada);

  const matches = (r, skip) => (skip === 'estado' || !state.estado || r.s.estado === state.estado)
    && (skip === 'tienda' || !state.tienda || String(r.s.id) === state.tienda)
    && (skip === 'estatus' || !state.estatus || r.estatus === state.estatus)
    && (skip === 'permiso' || !state.permiso || r.p.nombre === state.permiso)
    && (skip === 'area' || !state.area || r.p.area === state.area)
    && (skip === 'anio' || !state.anio || r.p.fin?.startsWith(state.anio));

  function sorted(rows) {
    const m = state.dir === 'ascending' ? 1 : -1;
    const txt = { estado: (r) => r.s.estado, sucursal: (r) => r.s.nombre, permiso: (r) => r.p.nombre };
    const date = { vigencia: (r) => r.p.fin, aviso: (r) => r.aviso };
    const byText = (k) => (a, b) => txt[k](a).localeCompare(txt[k](b), 'es', { sensitivity: 'base' });
    return [...rows].sort((a, b) => {
      if (txt[state.sort]) return byText(state.sort)(a, b) * m || (a.p.fin || '9').localeCompare(b.p.fin || '9');
      const da = date[state.sort](a), dbb = date[state.sort](b);
      if (!da || !dbb) return (da ? -1 : dbb ? 1 : 0) || byText('sucursal')(a, b); // "No vence" siempre al final
      return da.localeCompare(dbb) * m || byText('sucursal')(a, b);
    });
  }

  /* ---------- Filtros (opciones en cascada) ---------- */
  const uniq = (arr) => [...new Set(arr)];
  const byEs = (a, b) => String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
  function fillSelect(el, all, options) {
    const value = el.value;
    el.innerHTML = `<option value="">${all}</option>${options.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}`;
    el.value = options.some(([v]) => String(v) === value) ? value : '';
  }
  function syncFilters() {
    // Cada filtro ofrece solo opciones que dan resultados con los demás filtros aplicados
    const pool = (k) => ROWS.filter((r) => matches(r, k));
    fillSelect(els.filters.estado, 'Todos', uniq(pool('estado').map((r) => r.s.estado).filter(Boolean)).sort(byEs).map((e) => [e, e]));
    fillSelect(els.filters.tienda, 'Todas', uniq(pool('tienda').map((r) => r.s)).sort((a, b) => byEs(a.nombre, b.nombre)).map((s) => [s.id, s.nombre]));
    fillSelect(els.filters.estatus, 'Todos', Object.keys(ESTATUS).filter((k) => pool('estatus').some((r) => r.estatus === k)).map((k) => [k, ESTATUS[k].label]));
    fillSelect(els.filters.permiso, 'Todos', uniq(pool('permiso').map((r) => r.p.nombre)).sort(byEs).map((n) => [n, n]));
    fillSelect(els.filters.area, 'Todas', uniq(pool('area').map((r) => r.p.area)).sort(byEs).map((a) => [a, a]));
    fillSelect(els.filters.anio, 'Todos', uniq(pool('anio').filter((r) => r.p.fin).map((r) => r.p.fin.slice(0, 4))).sort().map((y) => [y, y]));
    Object.entries(els.filters).forEach(([k, el]) => { state[k] = el.value; });
  }

  /* ---------- Distribución por estatus ---------- */
  const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);

  // Dona: un segmento por estatus, con 2 px de separación; el centro da el total
  const R = 70, GROSOR = 22, C = 2 * Math.PI * R;
  function renderDistribution(rows) {
    // La distribución ignora el filtro de estatus para que la dona siga sirviendo de selector
    const base = ROWS.filter((r) => matches(r, 'estatus'));
    const counts = Object.fromEntries(Object.keys(ESTATUS).map((k) => [k, base.filter((r) => r.estatus === k).length]));
    const segs = Object.entries(ESTATUS).filter(([k]) => counts[k]);
    const hueco = segs.length > 1 ? 3 : 0;
    let acum = 0;
    const arcos = segs.map(([k, e]) => {
      const largo = (counts[k] / base.length) * C;
      const arco = `<circle class="donut-seg" data-estatus="${k}" r="${R}" cx="90" cy="90" ${state.estatus && state.estatus !== k ? 'data-dim' : ''}
        style="stroke: ${e.color}" stroke-width="${GROSOR}" stroke-dasharray="${Math.max(largo - hueco, 1)} ${C}" stroke-dashoffset="${-acum}"
        data-tip="${e.label} · ${plural(counts[k], 'permiso')} · ${pct(counts[k], base.length)} %"></circle>`;
      acum += largo;
      return arco;
    }).join('');
    const sel = state.estatus ? ESTATUS[state.estatus] : null;
    els.donut.innerHTML = `
      <div class="donut-figure">
        <svg viewBox="0 0 180 180" role="img" aria-label="${base.length ? `Distribución de ${plural(base.length, 'permiso')}: ${segs.map(([k, e]) => `${e.label} ${counts[k]} (${pct(counts[k], base.length)} %)`).join(', ')}` : 'Sin permisos con estos filtros'}">
          <circle class="donut-track" r="${R}" cx="90" cy="90" stroke-width="${GROSOR}"></circle>
          <g transform="rotate(-90 90 90)">${arcos}</g>
        </svg>
        <div class="donut-center" aria-hidden="true">
          <strong>${sel ? counts[state.estatus] : base.length}</strong>
          <span>${sel ? sel.plural.toLowerCase() : base.length === 1 ? 'permiso' : 'permisos'}</span>
        </div>
        <div class="chart-tooltip" role="presentation" hidden></div>
      </div>
      <ul class="donut-legend" role="group" aria-label="Filtrar por estatus">
        ${Object.entries(ESTATUS).map(([k, e]) => `<li>
          <button type="button" class="donut-item" data-estatus="${k}" aria-pressed="${state.estatus === k}" ${counts[k] || state.estatus === k ? '' : 'disabled'}>
            <span class="swatch" style="--swatch: ${e.color}" aria-hidden="true"></span>
            <span class="donut-item-label">${e.plural}</span>
            <strong>${counts[k]}</strong>
            <span class="donut-item-pct">${pct(counts[k], base.length)} %</span>
          </button></li>`).join('')}
      </ul>`;
    return rows;
  }

  /* ---------- Sucursales del corte (estado y tienda) ---------- */
  const sucursalesCorte = () => CLETA.habilitadas()
    .filter((s) => (!state.estado || s.estado === state.estado) && (!state.tienda || String(s.id) === state.tienda));
  function avance(s) {
    const aplicables = CLETA.tiposAplicables(s).flatMap((g) => g.tipos.map((t) => t.nombre));
    const permisos = CLETA.permisosDe(s.id);
    const capturados = new Set(permisos.map((p) => p.nombre).filter((n) => aplicables.includes(n))).size;
    return {
      aplicables: aplicables.length, capturados, pct: pct(capturados, aplicables.length),
      vencidos: permisos.filter((p) => estatusDe(p) === 'vencido').length,
      porVencer: permisos.filter((p) => estatusDe(p) === 'porVencer').length,
      sinDoc: permisos.filter((p) => !p.doc).length,
    };
  }

  /* ---------- Resumen ---------- */
  function renderResumen() {
    const total = db.sucursales.length, hab = CLETA.habilitadas().length;
    const corte = sucursalesCorte().map(avance);
    const apl = corte.reduce((a, x) => a + x.aplicables, 0), cap = corte.reduce((a, x) => a + x.capturados, 0);
    const sinDoc = ROWS.filter((r) => matches(r) && !r.p.doc).length;
    const p = pct(cap, apl);
    els.resumen.innerHTML = `
      <article class="kpi">
        <p class="kpi-label">Sucursales habilitadas</p>
        <p class="kpi-value">${hab} <span class="kpi-of">de ${total}</span></p>
        <p class="kpi-meta">${total - hab ? `${plural(total - hab, 'registrada sin habilitar', 'registradas sin habilitar')} · <a class="btn-link" href="permisos.html">Habilitar</a>` : 'Todas las registradas están habilitadas'}</p>
      </article>
      <article class="kpi">
        <p class="kpi-label">Avance de captura</p>
        <p class="kpi-value">${p} %</p>
        <div class="progress" role="progressbar" aria-label="Avance de captura" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" style="--value: ${p}%"><span class="progress-bar"></span></div>
        <p class="kpi-meta">${cap} de ${plural(apl, 'permiso aplicable', 'permisos aplicables')}${state.estado || state.tienda ? ' en este corte' : ''}</p>
      </article>
      <article class="kpi" ${sinDoc ? 'data-tone="nodoc"' : ''}>
        <p class="kpi-label">Sin documento</p>
        <p class="kpi-value">${sinDoc}</p>
        <p class="kpi-meta">${sinDoc ? 'Permisos capturados sin archivo adjunto' : 'Todos los permisos tienen archivo'}</p>
      </article>`;
  }

  /* ---------- Vencimientos de los próximos 12 meses ---------- */
  const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function renderMeses() {
    const inicio = `${TODAY.slice(0, 7)}-01`;
    const meses = Array.from({ length: 12 }, (_, i) => addMonths(inicio, i).slice(0, 7));
    const pool = ROWS.filter((r) => matches(r, 'anio') && r.p.fin);
    const datos = meses.map((m) => ({ m, items: pool.filter((r) => r.p.fin.startsWith(m)) }));
    const max = Math.max(1, ...datos.map((d) => d.items.length));
    const paso = Math.max(1, Math.ceil(max / 4));
    const tope = Math.ceil(max / paso) * paso;
    const ticks = Array.from({ length: tope / paso + 1 }, (_, i) => i * paso);
    const finAviso = addDays(TODAY, AVISO_DIAS).slice(0, 7);
    const enAviso = meses.filter((m) => m <= finAviso).length;
    const total = datos.reduce((a, d) => a + d.items.length, 0);
    const etiqueta = (m) => `${MES[Number(m.slice(5)) - 1]} ${m.slice(2, 4)}`;

    els.mesesSub.textContent = total
      ? `${plural(total, 'permiso vence', 'permisos vencen')} entre ${etiqueta(meses[0])} y ${etiqueta(meses[11])}. El área sombreada es la ventana de aviso (${AVISO_DIAS} días): ahí ya hay que gestionar la renovación.`
      : 'Ningún permiso con estos filtros vence en los próximos 12 meses.';
    els.meses.innerHTML = `
      ${enAviso ? `<p class="month-legend"><span class="month-legend-swatch" aria-hidden="true"></span>Ventana de aviso · ${AVISO_DIAS} días</p>` : ''}
      <div class="month-plot" style="--rows: ${tope}">
        <div class="month-axis" aria-hidden="true">${ticks.slice().reverse().map((t) => `<span>${t}</span>`).join('')}</div>
        <div class="month-area">
          <div class="month-grid" aria-hidden="true">${ticks.map(() => '<i></i>').join('')}</div>
          <div class="month-window" style="--cols: ${enAviso}" aria-hidden="true"></div>
          <ol class="month-bars" aria-label="Permisos que vencen por mes">
            ${datos.map((d) => {
              const n = d.items.length;
              const nombres = d.items.slice(0, 3).map((r) => `${r.s.nombre}: ${r.p.nombre}`).join(' · ') + (n > 3 ? ` · y ${n - 3} más` : '');
              return `<li class="month-col" tabindex="0" data-tip="${esc(`${etiqueta(d.m)} · ${plural(n, 'permiso')}${n ? ` — ${nombres}` : ''}`)}" aria-label="${etiqueta(d.m)}: ${plural(n, 'permiso')}">
                <span class="month-bar" style="--n: ${n}"></span>
                <span class="month-label">${etiqueta(d.m)}</span>
              </li>`;
            }).join('')}
          </ol>
          <div class="chart-tooltip month-tip" role="presentation" hidden></div>
        </div>
      </div>`;
  }

  /* ---------- Avance por sucursal ---------- */
  function renderCobertura() {
    const filas = sucursalesCorte().map((s) => ({ s, a: avance(s) })).sort((x, y) => x.a.pct - y.a.pct || x.s.nombre.localeCompare(y.s.nombre, 'es'));
    const perfil = (s) => {
      const p = s.perfilPermisos || {};
      const chips = [
        p.restaurante && 'Restaurante', p.licenciaSanitaria && 'Licencia sanitaria', p.ampliacionHorario && 'Ampliación de horario',
        p.alcohol && p.alcohol !== CLETA.TIPOS_ALCOHOL[0] && p.alcohol, p.proteccionCivil && `PC ${p.proteccionCivil.toLowerCase()}`,
      ].filter(Boolean);
      return chips.length ? `<div class="cell-badges">${chips.map((c) => `<span class="badge">${esc(c)}</span>`).join('')}</div>` : '<span class="subtle">Básico</span>';
    };
    const num = (n, status) => (n ? `<span class="badge" data-status="${status}">${n}</span>` : '<span class="subtle">0</span>');
    els.cobertura.innerHTML = filas.length ? filas.map(({ s, a }) => `<tr>
      <td><div class="cell-stack"><a class="cell-link" href="expediente.html?id=${s.id}">${esc(s.nombre)}</a><span class="cell-secondary">${esc(CLETA.lugar(s))}</span></div></td>
      <td>${perfil(s)}</td>
      <td><div class="coverage">
        <div class="progress" ${a.pct < 25 ? 'data-tone="danger"' : a.pct < 60 ? 'data-tone="warning"' : 'data-tone="success"'} role="progressbar" aria-label="Avance de ${esc(s.nombre)}" aria-valuenow="${a.pct}" aria-valuemin="0" aria-valuemax="100" style="--value: ${a.pct}%"><span class="progress-bar"></span></div>
        <span class="small"><strong>${a.capturados}</strong> de ${a.aplicables} · ${a.pct} %</span>
      </div></td>
      <td>${num(a.vencidos, 'expired')}</td>
      <td>${num(a.porVencer, 'expiring')}</td>
      <td>${a.sinDoc ? `<span class="badge" data-flag="nodoc">${a.sinDoc}</span>` : '<span class="subtle">0</span>'}</td>
    </tr>`).join('') : `<tr class="row-empty"><td colspan="6"><div class="empty-state">
        <span class="icon empty-icon" aria-hidden="true">add_business</span>
        <p class="empty-title">No hay sucursales habilitadas en este corte</p>
        <p class="empty-text">Habilítalas desde Permisos y licencias para darles seguimiento.</p>
      </div></td></tr>`;
  }

  /* ---------- Tabla ---------- */
  function estatusBadge(r) {
    const e = ESTATUS[r.estatus];
    if (r.estatus === 'unica') return `<span class="badge">${e.label}</span>`;
    if (r.estatus === 'vigente') return `<span class="badge badge-dot" data-status="active">${e.label}</span>`;
    return `<span class="badge" data-status="${e.status}">${e.label} · ${dueLabel(r.p.fin)}</span>`;
  }

  const rowHTML = (r) => `<tr>
    <td class="muted">${esc(r.s.estado)}</td>
    <td><div class="cell-stack"><a class="cell-link" href="expediente.html?id=${r.s.id}">${esc(r.s.nombre)}</a><span class="cell-secondary">${esc(r.s.ciudad)}</span></div></td>
    <td><div class="cell-stack"><span class="cell-primary">${esc(r.p.nombre)}</span><span class="cell-secondary">${esc(r.p.area)} · ${esc(r.p.periodo)}</span></div></td>
    <td class="nowrap">${r.p.fin ? fmtDate(r.p.fin) : '<span class="subtle">No vence</span>'}</td>
    <td class="nowrap">${r.aviso ? fmtDate(r.aviso) : '<span class="subtle">—</span>'}</td>
    <td>${estatusBadge(r)}</td>
    <td>${r.p.doc ? '<span class="small muted">Adjunto</span>' : '<span class="badge" data-flag="nodoc">Sin documento</span>'}</td>
  </tr>`;

  let visibles = [];
  function render() {
    syncFilters();
    visibles = sorted(ROWS.filter((r) => matches(r)));
    renderDistribution(visibles);
    renderResumen();
    renderMeses();
    renderCobertura();

    const activos = Object.keys(els.filters).filter((k) => state[k]).length;
    els.total.innerHTML = `<strong>${plural(visibles.length, 'permiso')}</strong>${visibles.length !== ROWS.length ? ` de ${ROWS.length}` : ''} · al ${fmtDate(TODAY)}`;
    els.reset.hidden = !activos;
    els.exportBtn.disabled = !visibles.length;

    els.ths.forEach((th) => th.setAttribute('aria-sort', th.dataset.sort === state.sort ? state.dir : 'none'));
    els.tbody.innerHTML = visibles.length ? visibles.map(rowHTML).join('') : `<tr class="row-empty"><td colspan="7">
      <div class="empty-state">
        <span class="icon empty-icon" aria-hidden="true">search_off</span>
        <p class="empty-title">Ningún permiso coincide con estos filtros</p>
        <p class="empty-text">Quita alguno de los filtros para ver más resultados.</p>
        <button class="btn btn-secondary btn-sm" data-reset>Limpiar filtros</button>
      </div></td></tr>`;
    Shell.refresh();
  }

  /* ---------- Exportar (CSV que abre Excel) ---------- */
  function exportar() {
    const cols = ['Estado', 'Sucursal', 'N° de tienda', 'Permiso', 'Área', 'Periodicidad', 'Vigencia', 'Aviso', 'Estatus', 'Detalle', 'Documento'];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = visibles.map((r) => [
      r.s.estado, r.s.nombre, r.s.num, r.p.nombre, r.p.area, r.p.periodo,
      r.p.fin ? fmtDate(r.p.fin) : 'No vence', r.aviso ? fmtDate(r.aviso) : '',
      ESTATUS[r.estatus].label, r.p.fin && r.estatus !== 'vigente' ? dueLabel(r.p.fin) : '',
      r.p.doc ? 'Adjunto' : 'Sin documento',
    ].map(cell).join(','));
    const blob = new Blob(['﻿', [cols.map(cell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `reporte-permisos-${TODAY}.csv` });
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    UI.toast(`Se exportaron ${plural(visibles.length, 'permiso')}.`, 'success');
  }

  /* ---------- Eventos ---------- */
  root.addEventListener('change', (e) => {
    const k = e.target.dataset.filter;
    if (!k) return;
    state[k] = e.target.value;
    if (k === 'estado') { state.tienda = ''; els.filters.tienda.value = ''; }
    render();
  });

  root.addEventListener('click', (e) => {
    const kpi = e.target.closest('[data-donut] [data-estatus]');
    const sort = e.target.closest('th[data-sort] .th-sort');
    if (kpi) {
      els.filters.estatus.value = state.estatus === kpi.dataset.estatus ? '' : kpi.dataset.estatus;
      state.estatus = els.filters.estatus.value;
      render();
    } else if (sort) {
      const key = sort.closest('th').dataset.sort;
      state.dir = state.sort === key && state.dir === 'ascending' ? 'descending' : 'ascending';
      state.sort = key;
      render();
    } else if (e.target.closest('[data-reset]')) {
      Object.values(els.filters).forEach((el) => { el.value = ''; });
      Object.keys(els.filters).forEach((k) => { state[k] = ''; });
      render();
    } else if (e.target.closest('[data-export]')) exportar();
  });

  // Tooltip de los segmentos de la dona
  els.donut.addEventListener('pointermove', (e) => {
    const tip = els.donut.querySelector('.chart-tooltip');
    const seg = e.target.closest('.donut-seg');
    if (!tip) return;
    if (!seg) { tip.hidden = true; return; }
    tip.textContent = seg.dataset.tip;
    tip.hidden = false;
    const box = els.donut.querySelector('.donut-figure').getBoundingClientRect();
    tip.style.left = `${e.clientX - box.left}px`;
    tip.style.top = `${e.clientY - box.top - 12}px`;
  });
  els.donut.addEventListener('pointerleave', () => { const tip = els.donut.querySelector('.chart-tooltip'); if (tip) tip.hidden = true; });

  // Tooltip de las columnas por mes (puntero y teclado)
  function tipMes(col) {
    const tip = els.meses.querySelector('.month-tip');
    if (!tip) return;
    if (!col) { tip.hidden = true; return; }
    tip.textContent = col.dataset.tip;
    tip.hidden = false;
    const area = els.meses.querySelector('.month-area').getBoundingClientRect();
    const box = col.getBoundingClientRect();
    const x = box.left - area.left + box.width / 2;
    tip.style.left = `${Math.min(Math.max(x, tip.offsetWidth / 2), area.width - tip.offsetWidth / 2)}px`;
  }
  els.meses.addEventListener('pointerover', (e) => tipMes(e.target.closest('.month-col')));
  els.meses.addEventListener('pointerleave', () => tipMes(null));
  els.meses.addEventListener('focusin', (e) => tipMes(e.target.closest('.month-col')));
  els.meses.addEventListener('focusout', () => tipMes(null));


  render();
})();
