/* =========================================================
   sucursal.js — prototipo BRS · Detalle de sucursal
   sucursal.html?id=N

   Estructura (una sola vista, sin pestañas):
   · Encabezado: regreso, nombre, folio · tipo · formato,
     dirección y etiquetas de pendientes (escritura, contrato,
     coordenadas)
   · Principal: Tenencia del inmueble (escrituras / contratos)
     y Ubicación (mapa + datos de dirección)
   · Lateral: Sucursal y Distribución
   · Pie: quién la creó y quién la editó por última vez
   Solo la ve el perfil de inmuebles; shell.js manda al perfil de
   permisos a su expediente equivalente.
   ========================================================= */

(() => {
  const root = document.getElementById('detalle');
  const { db, esc, money, num, fmtDate, fmtDateTime, daysUntil, dueLabel, dueStatus, plural } = CLETA;
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || 4; // Anzures por defecto
  const s = CLETA.sucursal(id);
  const ORIGEN = { href: 'sucursales.html', label: 'Sucursales' };

  if (!s) {
    root.innerHTML = `<div class="card"><div class="empty-state">
      <span class="icon empty-icon" aria-hidden="true">storefront</span>
      <p class="empty-title">No encontramos esta sucursal</p>
      <p class="empty-text">Puede que se haya dado de baja.</p>
      <a class="btn btn-secondary btn-sm" href="${ORIGEN.href}">Volver a ${ORIGEN.label.toLowerCase()}</a></div></div>`;
    return;
  }
  s.escrituras ||= [];

  const conEscritura = s.tipo !== 'Tercero';
  const conContrato = s.tipo !== 'Propio';

  const isEmpty = (v) => v == null || v === '';
  // Fila etiqueta / valor ("Sin capturar" en gris cuando falta)
  const kv = (label, v, fmt = (x) => esc(x)) => `<div class="kv"><dt>${label}</dt>${isEmpty(v) ? '<dd class="is-missing">Sin capturar</dd>' : `<dd>${fmt(v)}</dd>`}</div>`;
  const m2 = (x) => `${Number(x).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
  const folioCorto = (f) => String(f).split('-')[0];
  const coords = () => {
    const [lat, lng] = String(s.coords || '').split(',').map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  };
  const direccion = () => {
    const calle = [s.calle, s.noExt].filter(Boolean).join(' ');
    return [calle, s.colonia, s.cp].filter(Boolean).join(', ');
  };

  /* ---------- Encabezado ---------- */
  function flags(contratos) {
    const ok = (t) => `<span class="flag" data-tone="ok"><span class="icon" aria-hidden="true">check</span>${t}</span>`;
    const warn = (t) => `<span class="flag" data-tone="warn">${t}</span>`;
    const out = [];
    if (s.tipo === 'Mixto') return flagsMixto(contratos);
    if (conEscritura) out.push(s.escrituras.length ? ok('Escritura capturada') : warn('Escritura pendiente'));
    if (conContrato) out.push(contratos.length ? ok(contratos.length > 1 ? `${contratos.length} contratos de arrendamiento` : 'Contrato de arrendamiento') : warn('Contrato pendiente'));
    if (!coords()) out.push(warn('Coordenadas pendientes'));
    return out.join('');
  }

  function header(contratos) {
    const dir = direccion();
    return `<a class="branch-back" href="${ORIGEN.href}" data-act="back"><span class="icon" aria-hidden="true">chevron_left</span>${ORIGEN.label}</a>
      <div class="branch-header">
        <div class="branch-heading">
          <h1 class="page-title">${esc(s.nombre)}</h1>
          <p class="branch-code" title="Folio ${esc(s.folio)}">${esc(folioCorto(s.folio))} · ${esc(s.tipo)} · ${esc(s.formato)}</p>
          <p class="branch-address"><span class="icon" aria-hidden="true">location_on</span>${dir ? esc(dir) : '<span class="is-missing">Dirección sin capturar</span>'}</p>
          <div class="branch-tags">${flags(contratos)}</div>
        </div>
        <button class="btn btn-primary btn-lg" data-act="edit"><span class="icon" aria-hidden="true">edit</span>Editar</button>
      </div>`;
  }

  function alertBlock(contratos) {
    if (s.tipo === 'Mixto') return ''; // el estado de cada contrato ya se ve en etiquetas y tarjetas
    const c = contratos.filter((x) => daysUntil(x.fin) <= 90).sort((a, b) => daysUntil(a.fin) - daysUntil(b.fin))[0];
    if (!c) return '';
    const n = daysUntil(c.fin);
    const vencido = n < 0;
    return `<div class="alert ${vencido ? 'alert-danger' : 'alert-warning'}" role="alert" data-contract="${c.id}">
      <span class="icon alert-icon" aria-hidden="true">${vencido ? 'warning' : 'schedule'}</span>
      <div class="alert-content">
        <p class="alert-title">${vencido
          ? `El contrato con ${esc(c.arrendador)} venció el ${fmtDate(c.fin)}, hace ${plural(-n, 'día')}.`
          : `El contrato con ${esc(c.arrendador)} vence el ${fmtDate(c.fin)} (${dueLabel(c.fin).toLowerCase()}).`}</p>
        <p class="alert-body">${vencido
          ? 'La tienda opera sin un arrendamiento vigente capturado. Registra la renovación desde el contrato o marca el local como liberado para cerrar la alerta.'
          : 'Decide si se renueva o se libera el local antes de la fecha de término.'}</p>
      </div>
      <div class="btn-group">
        ${vencido ? '<button class="btn btn-secondary btn-sm" data-act="release">Marcar como liberado</button>' : ''}
      </div>
    </div>`;
  }

  /* ---------- Tenencia del inmueble ---------- */
  const abiertos = new Set(); // escrituras con la lista de adjuntos desplegada

  function escrituraRecord(e) {
    const n = e.archivos.length;
    const open = abiertos.has(e.id);
    return `<article class="deed" data-escritura="${e.id}">
      <span class="deed-icon" aria-hidden="true"><span class="icon">description</span></span>
      <div class="deed-body">
        <p class="deed-title">${esc(e.acto)} <span class="mono">· escritura ${esc(e.numero)}</span></p>
        <p class="deed-meta">Celebrada el ${fmtDate(e.fecha)}${e.notaria ? ` · ${esc(e.notaria)}` : ''}</p>
        <div class="deed-links">
          ${n ? `<button class="btn-link" data-act="toggle-files" aria-expanded="${open}"><span class="icon" aria-hidden="true">attach_file</span>${plural(n, 'adjunto')}</button>`
            : '<span class="badge" data-flag="nodoc">Sin documento</span><button class="btn-link" data-act="attach-escritura"><span class="icon" aria-hidden="true">attach_file</span>Adjuntar</button>'}
        </div>
        ${n && open ? `<div class="deed-files">${e.archivos.map((a) => `<div class="record-file">
            <span class="icon" aria-hidden="true">picture_as_pdf</span>
            <span class="record-file-name">${esc(a.nombre)}</span>
            <span class="record-file-meta">${esc(a.por)} · ${fmtDate(a.fecha)}</span>
          </div>`).join('')}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-icon btn-sm" popovertarget="escritura-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Más acciones de la escritura ${esc(e.numero)}"><span class="icon" aria-hidden="true">more_horiz</span></button>
    </article>`;
  }

  function contratoRecord(c) {
    const n = daysUntil(c.fin);
    const st = dueStatus(c.fin);
    const badge = st ? `<span class="badge" data-status="${st}">${n < 0 ? `Vencido hace ${plural(-n, 'día')}` : dueLabel(c.fin)}</span>`
      : n <= 90 ? `<span class="badge">${dueLabel(c.fin)}</span>` : '<span class="badge badge-dot" data-status="active">Vigente</span>';
    return `<article class="deed" data-contract="${c.id}">
      <span class="deed-icon" data-tone="lease" aria-hidden="true"><span class="icon">key</span></span>
      <div class="deed-body">
        <p class="deed-title">${esc(c.arrendador)} <span class="mono">· arrendamiento</span></p>
        <p class="deed-meta">${fmtDate(c.inicio)} → ${fmtDate(c.fin)} · ${money(c.renta)} al mes ${badge}</p>
        ${c.renovacion ? `<p class="deed-meta"><span class="badge badge-accent">Renovación iniciada</span> Nueva vigencia ${fmtDate(c.renovacion.inicio)} → ${fmtDate(c.renovacion.fin)}</p>` : ''}
        <div class="deed-links">
          ${c.doc ? '<button class="btn-link" data-act="view-contract"><span class="icon" aria-hidden="true">attach_file</span>Ver contrato</button>'
            : '<span class="badge" data-flag="nodoc">Sin documento</span><button class="btn-link" data-act="attach-contract"><span class="icon" aria-hidden="true">attach_file</span>Adjuntar contrato firmado</button>'}
          ${n <= 90 ? '<button class="btn-link" data-act="renew"><span class="icon" aria-hidden="true">autorenew</span>Registrar renovación</button>' : ''}
        </div>
      </div>
    </article>`;
  }

  const emptyBox = (icon, title, text, act, label) => `<div class="placeholder placeholder-compact">
    <span class="icon" aria-hidden="true">${icon}</span><strong>${title}</strong><span>${text}</span>
    <button class="btn btn-secondary btn-sm" data-act="${act}"><span class="icon" aria-hidden="true">add</span>${label}</button>
  </div>`;

  function tenenciaSection(contratos) {
    if (s.tipo === 'Mixto') return mixtoSection(contratos);
    const addBtn = (act, label) => `<button class="btn btn-secondary" data-act="${act}"><span class="icon" aria-hidden="true">add</span>${label}</button>`;
    const sub = (title, action, body) => `<div class="branch-sub"><div class="branch-sub-head"><h3 class="branch-sub-title">${title}</h3>${action}</div>${body}</div>`;
    const escrituras = sub(s.tipo === 'Mixto' ? 'Propio · escrituras' : 'Propio',
      s.escrituras.length ? addBtn('add-escritura', 'Agregar escritura') : '',
      s.escrituras.length ? s.escrituras.map(escrituraRecord).join('')
        : emptyBox('description', 'Falta la escritura', 'Captura la escritura con la que HEB adquirió el inmueble.', 'add-escritura', 'Agregar escritura'));
    const arrendamiento = sub(s.tipo === 'Mixto' ? 'Tercero · arrendamiento' : 'Tercero',
      contratos.length ? addBtn('add-contract', 'Agregar contrato') : '',
      contratos.length ? contratos.map(contratoRecord).join('')
        : emptyBox('key', 'Sin contrato capturado', 'Registra el contrato de arrendamiento con el tercero.', 'add-contract', 'Agregar contrato'));
    const desc = {
      Propio: 'El Tipo Propio exige la escritura con la que HEB adquirió el inmueble. No hay arrendamiento que capturar.',
      Tercero: `El Tipo Tercero exige el contrato de arrendamiento vigente con ${s.arrendador ? esc(s.arrendador) : 'el arrendador'}.`,
      Mixto: 'El Tipo Mixto exige la escritura de la parte que es de HEB y el contrato de la parte que se renta.',
    }[s.tipo];
    return `<section class="branch-section">
      <h2 class="branch-section-title">Tenencia del inmueble</h2>
      <p class="branch-section-desc">${desc}</p>
      ${conEscritura ? escrituras : ''}
      ${conContrato ? arrendamiento : ''}
    </section>`;
  }

  /* ---------- Mixto: pestañas Escrituras / Arrendamientos ---------- */
  const VISIBLES = 3; // con más registros aparece "Ver más"
  const vista = { tab: 'escrituras', filtro: 'todos', expandido: { escrituras: false, arrendamientos: false } };
  const ESTADO_CONTRATO = { vigente: ['Vigente', 'active'], porVencer: ['Por vencer', 'expiring'], vencido: ['Vencido', 'expired'] };
  const estadoContrato = (c) => { const n = daysUntil(c.fin); return n < 0 ? 'vencido' : n <= 90 ? 'porVencer' : 'vigente'; };
  const sumaM2 = (arr) => arr.reduce((a, x) => a + (Number(x.superficie) || 0), 0);
  const pesos = (x) => `$${num(Math.round(x))}`;
  const fact = (label, value) => `<span>${label} <strong>${value}</strong></span>`;
  function plazo(c) {
    const n = daysUntil(c.fin), abs = Math.abs(n);
    const t = abs < 60 ? plural(abs, 'día') : abs < 730 ? plural(Math.floor(abs / 30), 'mes', 'meses') : plural(Math.floor(abs / 365), 'año');
    const tono = { vencido: 'danger', porVencer: 'warning' }[estadoContrato(c)] || '';
    return `<span>${n < 0 ? 'Venció hace' : 'Vence en'} <strong class="${tono ? `tone-${tono}` : ''}">${t}</strong></span>`;
  }
  const activos = (contratos) => contratos.filter((c) => estadoContrato(c) !== 'vencido');

  function flagsMixto(contratos) {
    const tag = (tone, t) => `<span class="flag" data-tone="${tone}">${t}</span>`;
    const sinAdjunto = s.escrituras.filter((e) => !e.archivos.length).length;
    const por = contratos.filter((c) => estadoContrato(c) === 'porVencer').length;
    const venc = contratos.filter((c) => estadoContrato(c) === 'vencido').length;
    return [
      s.escrituras.length ? tag('info', plural(s.escrituras.length, 'escritura')) : tag('warn', 'Escritura pendiente'),
      contratos.length ? tag('info', plural(contratos.length, 'arrendamiento')) : tag('warn', 'Arrendamiento pendiente'),
      sinAdjunto ? tag('warn', `${sinAdjunto} ${sinAdjunto === 1 ? 'escritura' : 'escrituras'} sin adjunto`) : '',
      por ? tag('warn', `${por} por vencer`) : '',
      venc ? tag('danger', plural(venc, 'vencido')) : '',
      coords() ? '' : tag('warn', 'Coordenadas pendientes'),
    ].join('');
  }

  function escrituraDetalle(e) {
    const n = e.archivos.length;
    const open = abiertos.has(e.id);
    return `<article class="deed" data-escritura="${e.id}">
      <span class="deed-icon" aria-hidden="true"><span class="icon">description</span></span>
      <div class="deed-body">
        <p class="deed-title">${esc(e.acto)} <span class="mono">· escritura ${esc(e.numero)}</span>
          ${n ? '<span class="badge" data-status="active">Completa</span>' : '<span class="badge" data-status="expiring">Falta adjunto</span>'}</p>
        <p class="deed-meta">${e.fraccion ? `${esc(e.fraccion)} · celebrada` : 'Celebrada'} el ${fmtDate(e.fecha)}</p>
        <div class="deed-facts">
          ${fact('Superficie', e.superficie ? `${num(e.superficie)} m²` : 'Sin capturar')}
          ${n ? `<button class="btn-link" data-act="toggle-files" aria-expanded="${open}"><span class="icon" aria-hidden="true">attach_file</span>${plural(n, 'adjunto')}</button>`
            : '<button class="btn-link" data-act="attach-escritura"><span class="icon" aria-hidden="true">attach_file</span>Adjuntar escritura</button>'}
        </div>
        ${n && open ? `<div class="deed-files">${e.archivos.map((a) => `<div class="record-file">
            <span class="icon" aria-hidden="true">picture_as_pdf</span>
            <span class="record-file-name">${esc(a.nombre)}</span>
            <span class="record-file-meta">${esc(a.por)} · ${fmtDate(a.fecha)}</span>
          </div>`).join('')}</div>` : ''}
      </div>
      <button class="btn btn-ghost btn-icon btn-sm" popovertarget="escritura-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Más acciones de la escritura ${esc(e.numero)}"><span class="icon" aria-hidden="true">more_horiz</span></button>
    </article>`;
  }

  function contratoDetalle(c) {
    const [label, status] = ESTADO_CONTRATO[estadoContrato(c)];
    return `<article class="deed" data-contract="${c.id}">
      <span class="deed-icon" data-tone="lease" aria-hidden="true"><span class="icon">key</span></span>
      <div class="deed-body">
        <p class="deed-title">${esc(c.nombre || c.arrendador)}${c.folio ? ` <span class="mono">· contrato ${esc(c.folio)}</span>` : ''}
          <span class="badge" data-status="${status}">${label}</span></p>
        <p class="deed-meta">${esc(c.arrendador)} · vigencia ${fmtDate(c.inicio)} – ${fmtDate(c.fin)}</p>
        ${c.renovacion ? `<p class="deed-meta"><span class="badge badge-accent">Renovación iniciada</span> Nueva vigencia ${fmtDate(c.renovacion.inicio)} – ${fmtDate(c.renovacion.fin)}</p>` : ''}
        <div class="deed-facts">
          ${fact('Superficie', c.superficie ? `${num(c.superficie)} m²` : 'Sin capturar')}
          ${fact('Renta', `${pesos(c.renta)} / mes`)}
          ${plazo(c)}
          ${c.doc ? '<button class="btn-link" data-act="view-contract"><span class="icon" aria-hidden="true">attach_file</span>1 adjunto</button>'
            : '<button class="btn-link" data-act="attach-contract"><span class="icon" aria-hidden="true">attach_file</span>Adjuntar contrato</button>'}
        </div>
      </div>
      <button class="btn btn-ghost btn-icon btn-sm" popovertarget="contrato-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Más acciones del contrato ${esc(c.folio || c.arrendador)}"><span class="icon" aria-hidden="true">more_horiz</span></button>
    </article>`;
  }

  // Lista con "Ver N más" cuando hay más de VISIBLES registros
  function lista(clave, items, render, nombre) {
    const todos = vista.expandido[clave];
    const ocultos = items.length - VISIBLES;
    return `<div class="stack-sm">${(todos ? items : items.slice(0, VISIBLES)).map(render).join('')}
      ${ocultos > 0 ? `<button class="more-btn" data-act="ver-mas" data-lista="${clave}" aria-expanded="${todos}">${todos ? 'Ver menos' : `Ver ${ocultos} ${ocultos === 1 ? nombre[0] : nombre[1]} más`}</button>` : ''}</div>`;
  }

  function mixtoSection(contratos) {
    const tab = (k, label, n) => `<button class="tab" role="tab" data-tenencia-tab="${k}" aria-selected="${vista.tab === k}">${label} <span class="count">${n}</span></button>`;
    const add = (act, label) => `<button class="btn btn-secondary" data-act="${act}"><span class="icon" aria-hidden="true">add</span>${label}</button>`;
    let panel;
    if (vista.tab === 'escrituras') {
      panel = `<div class="tenure-toolbar">
          <p class="tenure-summary">${plural(s.escrituras.length, 'escritura')} · ${num(sumaM2(s.escrituras))} m² propios</p>
          ${add('add-escritura', 'Agregar escritura')}
        </div>
        ${s.escrituras.length ? lista('escrituras', s.escrituras, escrituraDetalle, ['escritura', 'escrituras'])
          : emptyBox('description', 'Falta la escritura', 'Captura la escritura de la fracción que es de HEB.', 'add-escritura', 'Agregar escritura')}`;
    } else {
      const cuenta = (k) => (k === 'todos' ? contratos.length : contratos.filter((c) => estadoContrato(c) === k).length);
      const FILTROS = [['todos', 'Todos'], ['vigente', 'Vigentes'], ['porVencer', 'Por vencer'], ['vencido', 'Vencidos']];
      const visibles = vista.filtro === 'todos' ? contratos : contratos.filter((c) => estadoContrato(c) === vista.filtro);
      const act = activos(contratos);
      panel = `<div class="tenure-toolbar">
          <div class="chips" role="group" aria-label="Filtrar arrendamientos">
            ${FILTROS.map(([k, l]) => `<button class="chip" data-filtro="${k}" aria-pressed="${vista.filtro === k}">${l} ${cuenta(k)}</button>`).join('')}
          </div>
          ${add('add-contract', 'Agregar arrendamiento')}
        </div>
        <p class="tenure-summary">${plural(act.length, 'contrato activo', 'contratos activos')} · ${num(sumaM2(act))} m² · ${pesos(act.reduce((a, c) => a + c.renta, 0))} de renta mensual</p>
        ${visibles.length ? lista('arrendamientos', visibles, contratoDetalle, ['arrendamiento', 'arrendamientos'])
          : contratos.length ? '<p class="tenure-summary">No hay arrendamientos con este filtro.</p>'
          : emptyBox('key', 'Sin arrendamientos', 'Registra el contrato de la parte que se renta.', 'add-contract', 'Agregar arrendamiento')}`;
    }
    return `<section class="branch-section">
      <h2 class="branch-section-title">Tenencia del inmueble</h2>
      <p class="branch-section-desc">El Tipo Mixto exige escritura y arrendamiento. Puede haber varias escrituras (una por fracción adquirida) y varios contratos de arrendamiento.</p>
      <div class="tabs" role="tablist" aria-label="Tenencia">
        ${tab('escrituras', 'Escrituras', s.escrituras.length)}${tab('arrendamientos', 'Arrendamientos', contratos.length)}
      </div>
      <div class="tenure-panel" role="tabpanel">${panel}</div>
    </section>`;
  }

  /* ---------- Ubicación ---------- */
  function ubicacionSection() {
    const c = coords();
    const destino = c ? c.join(',') : [direccion(), s.ciudad, s.estado, s.pais].filter(Boolean).join(', ');
    const llegar = destino ? `<a class="btn-link" href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}" target="_blank" rel="noopener">Cómo llegar<span class="icon" aria-hidden="true">open_in_new</span></a>` : '';
    const dir = direccion();
    return `<section class="branch-section">
      <div class="branch-section-head"><h2 class="branch-section-title">Ubicación</h2>${llegar}</div>
      <div class="card map-card">
        <div class="map-wrap" data-capa-activa="${capa}">
          <div class="map-canvas" data-map></div>
          <p class="map-status" data-map-status>Cargando mapa…</p>
          <div class="map-label">
            <strong>${esc(s.formato)} ${esc(s.nombre)}</strong>
            <span>${dir ? esc([[s.calle, s.noExt].filter(Boolean).join(' '), s.colonia].filter(Boolean).join(', ')) : esc([s.ciudad, s.estado].filter(Boolean).join(', '))}</span>
            ${c ? '' : '<span class="is-missing">Ubicación aproximada: faltan coordenadas</span>'}
          </div>
          ${s.tipo === 'Mixto' ? '<div class="map-legend"><span><i data-zone="own"></i>Propio</span><span><i data-zone="lease"></i>Arrendado</span></div>' : ''}
          <div class="map-toggle" role="group" aria-label="Tipo de mapa">
            <button type="button" data-capa="mapa" aria-pressed="${capa === 'mapa'}">Mapa</button>
            <button type="button" data-capa="satelite" aria-pressed="${capa === 'satelite'}">Satélite</button>
          </div>
        </div>
        <dl class="branch-rows">
          ${kv('Calle', s.calle)}${kv('No. ext', s.noExt)}
          ${kv('No. int', s.noInt)}${kv('Colonia', s.colonia)}
          ${kv('Código postal', s.cp)}${kv('País', s.pais)}
          ${kv('Estado', s.estado)}${kv('Ciudad', s.ciudad)}
          ${kv('Coordenadas', s.coords, (x) => `<span class="mono">${esc(x)}</span>`)}
        </dl>
      </div>
    </section>`;
  }

  // Mapa con Leaflet: OpenStreetMap atenuado o satélite (Esri). Sin coordenadas, centra en la ciudad/estado.
  let capa = 'mapa';
  let mapa = null;
  const CAPAS = {
    mapa: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png', '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'],
    satelite: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', 'Imágenes &copy; Esri'],
  };
  function iniciarMapa() {
    const el = root.querySelector('[data-map]');
    Forms.cargarLeaflet().then((L) => {
      if (!el.isConnected) return;
      root.querySelector('[data-map-status]')?.remove();
      const c = coords();
      const centro = c || CLETA.GEO[s.pais]?.[s.estado]?.centro || [23.6345, -102.5528];
      mapa?.remove();
      mapa = L.map(el, { zoomControl: false, scrollWheelZoom: false, attributionControl: true }).setView(centro, c ? 17 : 11);
      L.control.zoom({ position: 'bottomright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(mapa);
      const [url, attribution] = CAPAS[capa];
      mapa.capa = L.tileLayer(url, { maxZoom: 19, attribution }).addTo(mapa);
      if (!c) return;
      // Terreno aproximado: cuadrado con la superficie capturada, centrado en el punto
      if (s.m2Terreno) {
        const lado = Math.sqrt(s.m2Terreno) / 2;
        const dLat = lado / 111320, dLng = lado / (111320 * Math.cos((c[0] * Math.PI) / 180));
        L.rectangle([[c[0] - dLat, c[1] - dLng], [c[0] + dLat, c[1] + dLng]], {
          color: getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#007db3',
          weight: 2, dashArray: '6 5', fillOpacity: 0.12, interactive: false,
        }).addTo(mapa);
        // Mixto: franja arrendada proporcional a los m² rentados
        const rentado = s.tipo === 'Mixto' ? sumaM2(activos(CLETA.contratosDe(s.id))) : 0;
        if (rentado) {
          const f = Math.min(0.5, rentado / s.m2Terreno), m = 0.08;
          L.rectangle([[c[0] - dLat * (1 - m), c[1] - dLng * (1 - m)], [c[0] - dLat * (1 - m) + 2 * dLat * f, c[1] + dLng * (1 - m)]], {
            color: getComputedStyle(document.documentElement).getPropertyValue('--status-expiring-solid').trim() || '#f97316',
            weight: 2, dashArray: '5 4', fillOpacity: 0.25, interactive: false,
          }).addTo(mapa);
        }
        L.tooltip({ permanent: true, direction: 'top', className: 'map-area', offset: [0, -2] })
          .setLatLng([c[0] + dLat, c[1]]).setContent(`Terreno ${m2(s.m2Terreno)}`).addTo(mapa);
        mapa.fitBounds([[c[0] - dLat * 2, c[1] - dLng * 2], [c[0] + dLat * 2, c[1] + dLng * 2]]);
      }
      L.marker(c, {
        icon: L.divIcon({ className: 'map-pin', html: '<span class="icon" aria-hidden="true">location_on</span>', iconSize: [44, 44], iconAnchor: [22, 40] }),
        title: s.nombre, keyboard: false,
      }).addTo(mapa);
    }).catch(() => {
      const st = root.querySelector('[data-map-status]');
      if (st) st.textContent = 'No se pudo cargar el mapa.';
    });
  }
  function cambiarCapa(nueva) {
    capa = nueva;
    root.querySelectorAll('[data-capa]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.capa === capa)));
    root.querySelector('.map-wrap').dataset.capaActiva = capa;
    if (!mapa) return;
    mapa.capa.remove();
    const [url, attribution] = CAPAS[capa];
    mapa.capa = window.L.tileLayer(url, { maxZoom: 19, attribution }).addTo(mapa);
  }

  /* ---------- Lateral ---------- */
  const sucursalCard = () => `<section class="card branch-aside">
    <h2 class="branch-aside-title">Sucursal</h2>
    <dl>
      ${kv('N° de tienda', s.num)}
      ${kv('Formato', s.formato)}
      ${kv('Empresa HEB', s.empresa)}
      ${kv('Tipo', s.tipo)}
      ${s.tipo === 'Tercero' ? kv('Arrendador', s.arrendador) : ''}
      ${kv('Folio', s.folio, (f) => `<span class="mono" title="${esc(f)}">${esc(folioCorto(f))}</span> <button class="btn btn-ghost btn-icon btn-sm" data-act="copy-folio" aria-label="Copiar folio completo" title="Copiar folio completo"><span class="icon" aria-hidden="true">content_copy</span></button>`)}
    </dl>
  </section>`;

  const distribucionCard = () => `<section class="card branch-aside">
    <h2 class="branch-aside-title">Distribución</h2>
    <dl>
      ${kv('Terreno', s.m2Terreno, m2)}
      ${s.tipo === 'Mixto' ? `${kv('Propio', sumaM2(s.escrituras) || null, (x) => `${num(x)} m²`)}${kv('Arrendado', sumaM2(activos(CLETA.contratosDe(s.id))) || null, (x) => `${num(x)} m²`)}` : ''}
      ${kv('Construcción', s.m2, m2)}
    </dl>
  </section>`;

  function footer() {
    const ultimo = s.historial[0];
    return `<p class="branch-footer">Creada por ${esc(s.creado.por)} el ${fmtDateTime(s.creado.fecha)}${ultimo ? ` · Última edición por ${esc(ultimo.por)} el ${fmtDateTime(ultimo.fecha)}` : ''}</p>`;
  }

  /* ---------- Render ---------- */
  function render() {
    const contratos = CLETA.contratosDe(s.id);
    document.title = `${s.nombre} · BRS`;
    mapa?.remove();
    mapa = null;
    root.innerHTML = `${header(contratos)}${alertBlock(contratos)}
      <div class="detail-layout">
        <div class="detail-main">
          ${tenenciaSection(contratos)}
          ${ubicacionSection()}
        </div>
        <aside class="detail-aside detail-aside-sticky" aria-label="Resumen de la sucursal">
          ${sucursalCard()}
          ${distribucionCard()}
        </aside>
      </div>
      ${footer()}`;
    iniciarMapa();
    Shell.refresh();
  }

  const commit = (msg) => { CLETA.save(); render(); UI.toast(msg, 'success'); };
  let menuContrato = null;
  const contractFrom = (el) => {
    const idC = Number(el.closest('[data-contract]')?.dataset.contract);
    return CLETA.contratosDe(s.id).find((c) => c.id === idC) || menuContrato;
  };
  const escrituraFrom = (el) => s.escrituras.find((e) => e.id === Number(el.closest('[data-escritura]')?.dataset.escritura));
  const archivoNuevo = (nombre) => ({ nombre, fecha: CLETA.TODAY, por: 'Usuario de desarrollo' });

  function adjuntarEscritura(e) {
    Forms.adjuntar({ titulo: 'Adjuntar escritura', subtitulo: `Escritura ${num(e.numero)} · ${s.nombre}`, tipos: ['Escritura', 'Plano', 'Predial', 'Otro'], tipo: 'Escritura' }, (v) => {
      e.archivos.push(archivoNuevo(v.archivo));
      CLETA.log(s, `Archivo adjunto a la escritura ${num(e.numero)} (${v.archivo})`, 'attach_file');
      commit(`${v.archivo} adjuntado.`);
    });
  }

  /* ---------- Acciones ---------- */
  const ACTIONS = {
    edit: () => Forms.sucursal(s, (v) => { Object.assign(s, v); CLETA.log(s, 'Datos de la sucursal actualizados'); commit('Datos de la sucursal guardados.'); }),
    'add-escritura': () => Forms.escritura(s, null, (v) => {
      const e = { id: db.nextEscrituraId++, acto: v.acto, numero: v.numero, fecha: v.fecha, notaria: v.notaria, archivos: v.archivo ? [archivoNuevo(v.archivo)] : [] };
      s.escrituras.push(e);
      CLETA.log(s, `Escritura ${num(e.numero)} agregada (${e.acto})`, 'gavel');
      commit(`Escritura ${num(e.numero)} agregada.`);
    }),
    'attach-escritura': (el) => adjuntarEscritura(escrituraFrom(el)),
    renew: (el) => {
      const c = contractFrom(el) || CLETA.contratosDe(s.id).sort((a, b) => daysUntil(a.fin) - daysUntil(b.fin))[0];
      Forms.renovar(c, (v) => {
        Object.assign(c, { inicio: v.inicio, fin: v.fin, renta: v.renta, doc: v.doc, gestion: 'sin-iniciar' });
        CLETA.log(s, `Contrato con ${c.arrendador} renovado hasta ${fmtDate(v.fin)}`, 'autorenew');
        commit(`Renovación registrada hasta el ${fmtDate(v.fin)}.`);
      });
    },
    release: (el) => {
      const c = contractFrom(el);
      Forms.liberar(c, (v) => { c.estado = 'liberado'; CLETA.log(s, `Local liberado (${v.motivo})`, 'key_off'); commit('El local quedó marcado como liberado.'); });
    },
    'attach-contract': (el) => {
      const c = contractFrom(el);
      Forms.adjuntar({ titulo: 'Adjuntar contrato firmado', subtitulo: `${c.arrendador} · ${s.nombre}`, tipos: ['Contrato de arrendamiento', 'Convenio modificatorio'], tipo: 'Contrato de arrendamiento' }, (v) => {
        c.doc = true;
        s.documentos.push({ tipo: v.tipo, archivo: v.archivo, fecha: CLETA.TODAY });
        CLETA.log(s, `Contrato firmado adjunto (${v.archivo})`, 'attach_file');
        commit(`${v.archivo} adjuntado.`);
      });
    },
    'view-contract': (el) => {
      const c = contractFrom(el);
      UI.toast(c.doc ? `Prototipo: aquí se abre el PDF del contrato con ${c.arrendador}.` : `El contrato con ${c.arrendador} aún no tiene documento adjunto.`, c.doc ? 'info' : 'warning');
    },
    'add-contract': () => Forms.contrato(s, (v) => {
      db.contratos.push({ id: db.nextContratoId++, sucursalId: s.id, ...v, responsable: null, gestion: 'sin-iniciar', estado: 'activo' });
      if (!s.arrendador) s.arrendador = v.arrendador;
      if (s.tipo === 'Propio') s.tipo = 'Mixto';
      CLETA.log(s, `Contrato agregado con ${v.arrendador}`, 'description');
      commit(`Contrato con ${v.arrendador} agregado.`);
    }),
    'ver-mas': (el) => {
      const k = el.dataset.lista;
      vista.expandido[k] = !vista.expandido[k];
      render();
    },
    'toggle-files': (el) => {
      const e = escrituraFrom(el);
      abiertos.has(e.id) ? abiertos.delete(e.id) : abiertos.add(e.id);
      render();
    },
    'copy-folio': () => {
      navigator.clipboard?.writeText(s.folio).then(() => UI.toast('Folio copiado.', 'success'), () => UI.toast('No se pudo copiar el folio.', 'warning'));
    },
    back: (el, ev) => {
      ev?.preventDefault();
      const vieneDeLaApp = document.referrer && new URL(document.referrer).origin === location.origin;
      vieneDeLaApp && window.history.length > 1 ? window.history.back() : (location.href = ORIGEN.href);
    },
  };

  root.addEventListener('click', (e) => {
    const a = e.target.closest('[data-act]');
    const capa = e.target.closest('[data-capa]');
    if (a) ACTIONS[a.dataset.act]?.(a, e);
    else if (capa) cambiarCapa(capa.dataset.capa);
    const tabT = e.target.closest('[data-tenencia-tab]');
    const filtro = e.target.closest('[data-filtro]');
    if (tabT) { vista.tab = tabT.dataset.tenenciaTab; render(); root.querySelector(`[data-tenencia-tab="${vista.tab}"]`)?.focus(); }
    if (filtro) { vista.filtro = filtro.dataset.filtro; vista.expandido.arrendamientos = false; render(); root.querySelector(`[data-filtro="${vista.filtro}"]`)?.focus(); }
  });

  // Menú "más acciones" de una escritura (compartido)
  document.body.insertAdjacentHTML('beforeend', `<div class="menu" id="escritura-menu" popover role="menu" aria-label="Acciones de la escritura">
    <button class="menu-item" role="menuitem" data-escritura-act="adjuntar"><span class="icon" aria-hidden="true">attach_file</span>Adjuntar archivo</button>
    <button class="menu-item" role="menuitem" data-escritura-act="editar"><span class="icon" aria-hidden="true">edit</span>Editar datos</button>
    <hr class="menu-divider">
    <button class="menu-item menu-item-danger" role="menuitem" data-escritura-act="eliminar"><span class="icon" aria-hidden="true">delete</span>Eliminar escritura</button>
  </div>`);
  const menu = document.getElementById('escritura-menu');
  let menuEscritura = null;
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[popovertarget="escritura-menu"]');
    if (t) menuEscritura = escrituraFrom(t);
  }, true);
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-escritura-act]');
    const escr = menuEscritura;
    if (!b || !escr) return;
    menu.hidePopover();
    const act = b.dataset.escrituraAct;
    if (act === 'adjuntar') adjuntarEscritura(escr);
    else if (act === 'editar') {
      Forms.escritura(s, escr, (v) => {
        Object.assign(escr, { acto: v.acto, numero: v.numero, fecha: v.fecha, notaria: v.notaria });
        CLETA.log(s, `Escritura ${num(escr.numero)} actualizada`, 'gavel');
        commit('Datos de la escritura guardados.');
      });
    } else {
      Forms.confirmar({
        titulo: '¿Eliminar esta escritura?',
        texto: `La escritura ${num(escr.numero)} y ${plural(escr.archivos.length, 'archivo')} se quitarán de ${s.nombre}. Esta acción no se puede deshacer.`,
        accion: 'Eliminar escritura',
      }, () => {
        s.escrituras = s.escrituras.filter((x) => x.id !== escr.id);
        CLETA.log(s, `Escritura ${num(escr.numero)} eliminada`, 'delete');
        commit(`La escritura ${num(escr.numero)} se eliminó.`);
      });
    }
  });


  // Menú "más acciones" de un contrato (Mixto)
  document.body.insertAdjacentHTML('beforeend', `<div class="menu" id="contrato-menu" popover role="menu" aria-label="Acciones del contrato">
    <button class="menu-item" role="menuitem" data-contrato-act="view-contract"><span class="icon" aria-hidden="true">visibility</span>Ver contrato</button>
    <button class="menu-item" role="menuitem" data-contrato-act="attach-contract"><span class="icon" aria-hidden="true">attach_file</span>Adjuntar contrato firmado</button>
    <button class="menu-item" role="menuitem" data-contrato-act="renew"><span class="icon" aria-hidden="true">autorenew</span>Registrar renovación</button>
    <hr class="menu-divider">
    <button class="menu-item menu-item-danger" role="menuitem" data-contrato-act="release"><span class="icon" aria-hidden="true">key_off</span>Marcar como liberado</button>
  </div>`);
  const menuC = document.getElementById('contrato-menu');
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[popovertarget="contrato-menu"]');
    if (t) menuContrato = contractFrom(t);
  }, true);
  menuC.addEventListener('click', (e) => {
    const b = e.target.closest('[data-contrato-act]');
    if (!b || !menuContrato) return;
    menuC.hidePopover();
    ACTIONS[b.dataset.contratoAct](b);
  });

  render();
})();
