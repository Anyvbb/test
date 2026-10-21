/* =========================================================
   vencimientos.js — prototipo BRS · Bandeja de vencimientos
   Sirve a las dos bandejas según el módulo de la página:
   · inmuebles (vencimientos.html): contratos de sucursales
   · permisos (bandeja-permisos.html): permisos y licencias
   Vencimientos dentro del horizonte (6 a 12 meses), en tarjetas
   ordenadas por urgencia. Los indicadores filtran la lista.
   Cada tarjeta abre el detalle (sucursal o expediente).
   ========================================================= */

(() => {
  const root = document.getElementById('bandeja');
  const { db, esc, money, fmtDate, dueLabelLong, estadoAbrev, avisosDe, plural, listaHumana } = CLETA;

  db.avisosEnviados ??= [];
  const PERMISOS = document.body.dataset.module === 'permisos';
  const UNIDAD = PERMISOS ? 'permiso' : 'contrato';
  const lista = (meses) => (PERMISOS ? CLETA.bandejaPermisos(meses) : CLETA.bandejaContratos(meses));
  const detalle = (s) => (PERMISOS ? `expediente.html?id=${s.id}` : `sucursal.html?id=${s.id}`);
  const state = { horizonte: CLETA.HORIZONTE_DEFAULT, filtro: null }; // horizonte en meses

  const $ = (s) => root.querySelector(s);
  const els = {
    kpis: $('[data-kpis]'), inbox: $('[data-inbox]'),
    horizonte: $('[data-filter-horizonte]'),
  };

  /* ---------- Indicadores (también son filtros) ---------- */
  const seisMeses = () => CLETA.daysUntil(CLETA.addMonths(CLETA.TODAY, 6));
  const FILTROS = {
    vencidos: { label: 'Vencidos', tone: 'danger', test: (i) => i.days < 0 },
    '30d':    { label: 'Vencen en 30 días', tone: 'warning', test: (i) => i.days >= 0 && i.days <= 30 },
    '6m':     { label: 'Vencen en 6 meses', tone: '', test: (i) => i.days >= 0 && i.days <= seisMeses() },
  };

  function renderKpis(all) {
    els.kpis.innerHTML = Object.entries(FILTROS).map(([id, f]) => {
      const arr = all.filter(f.test);
      const renta = arr.reduce((t, i) => t + (i.monto || 0), 0);
      const sucursales = new Set(arr.map((i) => i.sucursal.id)).size;
      const meta = !arr.length ? `Sin ${UNIDAD}s en este rango`
        : PERMISOS ? `En ${plural(sucursales, 'sucursal', 'sucursales')}` : `${money(renta)} de renta mensual`;
      return `<button type="button" class="kpi" ${f.tone ? `data-tone="${f.tone}"` : ''} data-filtro="${id}" aria-pressed="${state.filtro === id}">
        <span class="kpi-label">${f.label}</span>
        <span class="kpi-value">${arr.length}</span>
        <span class="kpi-meta">${meta}</span>
      </button>`;
    }).join('');
  }

  /* ---------- Tarjeta ---------- */
  // "Avisos de 1 año y 6 meses enviados" · "Aviso de 6 meses enviado" · "Sin avisos enviados"
  function avisosTexto(contratoId) {
    const tipos = avisosDe(contratoId).map((a) => a.tipo);
    if (!tipos.length) return 'Sin avisos enviados';
    return tipos.length === 1 ? `Aviso de ${tipos[0]} enviado` : `Avisos de ${listaHumana(tipos)} enviados`;
  }

  // Tarjeta de permiso: nombre del permiso · área; sucursal y periodicidad en la segunda línea
  function permitCardHTML(i) {
    const s = i.sucursal;
    const p = i.ref;
    const vencido = i.days < 0;
    const enTramite = p.gestion === 'en-proceso';
    return `<article class="due-card" data-key="${i.key}" data-href="${detalle(s)}">
      <div class="due-card-main">
        <p class="due-card-title"><a class="due-card-link" href="${detalle(s)}">${esc(p.nombre)}</a><span class="due-card-area">· ${esc(p.area)}</span>
          ${enTramite ? '<span class="badge badge-accent">Trámite iniciado</span>' : ''}</p>
        <p class="due-card-meta">${[`${esc(s.nombre)}${s.num ? ` #${s.num}` : ''}`, esc(CLETA.lugar(s, true)), esc(p.periodo), p.responsable ? `Responsable: ${esc(p.responsable)}` : ''].filter(Boolean).join(' · ')}</p>
        ${enTramite && p.solicitud ? `<p class="due-card-meta"><span class="icon icon-sm" aria-hidden="true" style="vertical-align: -4px">mark_email_read</span> Solicitud del documento enviada a ${esc(p.solicitud.correo)} el ${fmtDate(p.solicitud.fecha)}</p>` : ''}
      </div>
      <div class="due-card-date"><span>Fin de vigencia</span><strong>${fmtDate(i.fin)}</strong></div>
      <div class="due-card-status">
        <span class="badge badge-dot" data-status="${vencido ? 'expired' : i.days <= 90 ? 'expiring' : 'active'}">${vencido ? 'Vencido' : i.days <= 90 ? 'En proceso' : 'Vigente'}</span>
        <span>${dueLabelLong(i.fin)}</span>
      </div>
      <div class="due-card-action">
        ${enTramite ? '' : '<button class="btn btn-secondary btn-sm" data-act="tramite">Iniciar trámite</button>'}
      </div>
    </article>`;
  }

  function cardHTML(i) {
    if (PERMISOS) return permitCardHTML(i);
    const s = i.sucursal;
    const c = i.ref;
    const lugar = esc(CLETA.lugar(s, true));
    const vencido = i.days < 0;
    const reno = c.renovacion;
    // La tarjeta completa abre el detalle (ver clic abajo); el nombre es el enlace accesible
    return `<article class="due-card" data-key="${i.key}" data-href="sucursal.html?id=${s.id}">
      <div class="due-card-main">
        <p class="due-card-title"><a class="due-card-link" href="sucursal.html?id=${s.id}">${esc(s.nombre)}</a>${s.num ? ` <span class="due-card-num">#${s.num}</span>` : ''}
          ${reno ? '<span class="badge badge-accent">Renovación iniciada</span>' : ''}</p>
        <p class="due-card-meta">${[esc(c.arrendador), lugar, avisosTexto(c.id)].join(' · ')}</p>
        ${reno ? `<p class="due-card-meta">Nueva vigencia ${fmtDate(reno.inicio)} → ${fmtDate(reno.fin)} · ${money(reno.renta)} al mes</p>` : ''}
      </div>
      <div class="due-card-date"><span>Fin de vigencia</span><strong>${fmtDate(i.fin)}</strong></div>
      <div class="due-card-status">
        <span class="badge badge-dot" data-status="${vencido ? 'expired' : 'expiring'}">${vencido ? 'Vencido' : 'Por vencer'}</span>
        <span>${dueLabelLong(i.fin)}</span>
      </div>
      <div class="due-card-action">
        <button class="btn btn-secondary btn-sm" data-act="renovar">${reno ? 'Editar renovación' : 'Iniciar renovación'}</button>
      </div>
    </article>`;
  }

  /* ---------- Render ---------- */
  function render() {
    const all = lista(state.horizonte); // ya vienen por urgencia
    renderKpis(all);
    const f = FILTROS[state.filtro];
    items = f ? all.filter(f.test) : all;

    const barra = f ? `<div class="due-list-filter">
        <span>Mostrando <strong>${f.label.toLowerCase()}</strong> · ${plural(items.length, UNIDAD)}</span>
        <button class="btn-link" data-clear-filter>Quitar filtro</button>
      </div>` : '';
    els.inbox.innerHTML = barra + (items.length
      ? items.map(cardHTML).join('')
      : `<div class="card"><div class="empty-state">
          <span class="icon empty-icon" aria-hidden="true">task_alt</span>
          <p class="empty-title">Nada pendiente</p>
          <p class="empty-text">No hay ${UNIDAD}s ${f ? `en “${f.label.toLowerCase()}”` : `que venzan en los próximos ${state.horizonte} meses`}.</p>
        </div></div>`);
    Shell.refresh();
  }

  /* ---------- Eventos ---------- */
  let items = [];
  root.addEventListener('click', (e) => {
    // Indicador: filtra la lista; un segundo clic quita el filtro
    const kpi = e.target.closest('[data-filtro]');
    if (kpi) { state.filtro = state.filtro === kpi.dataset.filtro ? null : kpi.dataset.filtro; render(); return; }
    if (e.target.closest('[data-clear-filter]')) { state.filtro = null; render(); return; }

    const card = e.target.closest('.due-card');
    if (!card) return;
    const item = items.find((x) => x.key === card.dataset.key);

    if (e.target.closest('[data-act="renovar"]')) {
      const c = item.ref;
      const editar = !!c.renovacion;
      Forms.iniciarRenovacion(c, (v) => {
        c.renovacion = { ...v, fecha: CLETA.TODAY };
        c.gestion = 'en-proceso';
        CLETA.log(item.sucursal, `Renovación ${editar ? 'actualizada' : 'iniciada'}: ${fmtDate(v.inicio)} → ${fmtDate(v.fin)}, ${money(v.renta)} al mes`, 'autorenew');
        CLETA.save();
        render();
        UI.toast(`Renovación de ${item.sucursal.nombre} ${editar ? 'actualizada' : 'iniciada'}.`, 'success');
      });
      return;
    }
    if (e.target.closest('[data-act="tramite"]')) {
      // Prototipo: "envía" un correo al área responsable pidiendo el documento del permiso
      Forms.iniciarTramite(item, (v) => {
        Object.assign(item.ref, {
          responsable: v.responsable, gestion: 'en-proceso',
          solicitud: { correo: v.correo, nota: v.nota, fecha: CLETA.TODAY, por: Shell.perfil.email },
        });
        CLETA.log(item.sucursal, `Trámite iniciado: ${item.titulo}. Se pidió el documento a ${v.responsable} (${v.correo})`, 'send');
        CLETA.save();
        render();
        UI.toast(`Se envió un correo a ${v.correo} para que mande el documento de ${item.titulo}.`, 'success');
      });
      return;
    }
    // Clic en cualquier otra parte de la tarjeta: abre el detalle
    if (!e.target.closest('a, button') && !window.getSelection()?.toString()) location.href = card.dataset.href;
  });
  els.horizonte.addEventListener('change', () => { state.horizonte = Number(els.horizonte.value); render(); });

  render();
})();
