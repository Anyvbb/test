/* =========================================================
   expediente.js — prototipo BRS · Permisos de una sucursal
   Detalle para el módulo Permisos y licencias:
   · izquierda: los tipos que aplican (capturados / pendientes)
   · derecha: el expediente, lo urgente primero, con adjuntos
   expediente.html?id=N
   ========================================================= */

(() => {
  const root = document.getElementById('detalle');
  const { db, esc, fmtDate, dueLabel, daysUntil, plural } = CLETA;
  const s = CLETA.sucursal(new URLSearchParams(location.search).get('id') || 12); // Chipinque por defecto

  if (!s) {
    root.innerHTML = `<div class="card"><div class="empty-state">
      <span class="icon empty-icon" aria-hidden="true">verified_user</span>
      <p class="empty-title">No encontramos esta sucursal</p>
      <p class="empty-text">Puede que se haya dado de baja.</p>
      <a class="btn btn-secondary btn-sm" href="permisos.html">Volver a permisos y licencias</a></div></div>`;
    return;
  }
  // Solo las sucursales habilitadas tienen expediente de permisos
  if (!s.habilitada) {
    root.innerHTML = `<div class="card"><div class="empty-state">
      <span class="icon empty-icon" aria-hidden="true">add_business</span>
      <p class="empty-title">${CLETA.esc(s.nombre)} aún no está habilitada</p>
      <p class="empty-text">Habilítala desde Permisos y licencias con su perfil para capturar sus permisos.</p>
      <a class="btn btn-primary btn-sm" href="permisos.html">Ir a Permisos y licencias</a></div></div>`;
    return;
  }

  const state = { q: '', filtro: 'todos', resaltar: null,
    vista: 'permisos', // permisos · documentos
    docs: { q: '', permiso: '', orden: 'recientes', limite: 25 } };
  const DOCS_PAGINA = 25;
  const permisos = () => CLETA.permisosDe(s.id);

  /* ---------- Estado de un permiso ---------- */
  // expired (vencido) · expiring (en proceso: vence en ≤ 90 días) · active (vigente) · unique (sin vigencia: única ocasión o no aplica)
  const estado = (p) => (!p.fin ? 'unique' : daysUntil(p.fin) < 0 ? 'expired' : daysUntil(p.fin) <= 90 ? 'expiring' : 'active');
  const orden = { expired: 0, expiring: 1, active: 2, unique: 3 };
  const urgentes = () => [...permisos()].sort((a, b) =>
    orden[estado(a)] - orden[estado(b)] || (a.fin && b.fin ? daysUntil(a.fin) - daysUntil(b.fin) : 0));

  function badgeEstado(p) {
    const st = estado(p);
    if (st === 'unique') return `<span class="badge">${esc(p.periodo === 'No aplica' ? 'No aplica' : 'Única ocasión')}</span>`;
    if (st === 'active') return '<span class="badge badge-dot" data-status="active">Vigente</span>';
    return `<span class="badge" data-status="${st}">${st === 'expired' ? 'Vencido' : 'En proceso'} · ${dueLabel(p.fin)}</span>`;
  }

  /* ---------- Encabezado ---------- */
  function header() {
    const c = CLETA.semaforo(permisos());
    const restaurante = (s.perfil || []).includes('Restaurante');
    const aplican = CLETA.tiposAplicables(s).reduce((t, g) => t + g.tipos.length, 0);
    return `<div class="page-heading">
      <nav class="breadcrumb" aria-label="Ruta"><ol>
        <li><a href="permisos.html">Permisos y licencias</a></li>
        <li><span aria-current="page">${esc(s.nombre)}</span></li>
      </ol></nav>
      <div class="page-header">
        <div class="stack-xs">
          <div class="detail-title-row">
            <button class="btn btn-ghost btn-icon" data-act="back" aria-label="Regresar a la pantalla anterior" title="Regresar"><span class="icon" aria-hidden="true">arrow_back</span></button>
            <h1 class="page-title">Permisos · ${esc(s.nombre)}</h1>
          </div>
          <div class="detail-title-row">
            <p class="page-subtitle">${restaurante ? 'Tienda con restaurante' : 'Tienda sin restaurante'} · aplican ${aplican} tipos</p>
            <span class="badge">${plural(c.total, 'capturado')}</span>
            <span class="badge" data-status="expired">${plural(c.vencidos, 'vencido')}</span>
            <span class="badge" data-status="expiring">${c.porVencer} en proceso</span>
            <span class="badge" data-status="active">${plural(c.vigentes, 'vigente')}</span>
          </div>
        </div>
        <div class="btn-group">
          <!-- Oculto por ahora: Perfil de permisos -->
          <button class="btn btn-secondary" data-act="perfil" hidden><span class="icon" aria-hidden="true">shield</span>Perfil de permisos</button>
          <button class="btn btn-primary" data-act="agregar"><span class="icon" aria-hidden="true">add</span>Agregar permiso</button>
        </div>
      </div>
    </div>`;
  }

  /* ---------- Checklist de tipos ---------- */
  function checklist() {
    const capturados = new Map(permisos().map((p) => [p.nombre, p]));
    const grupos = CLETA.tiposAplicables(s);
    const total = grupos.reduce((t, g) => t + g.tipos.length, 0);
    const q = state.q.trim().toLowerCase();
    const visible = (t) => {
      const cap = capturados.has(t.nombre);
      return (!q || t.nombre.toLowerCase().includes(q))
        && (state.filtro === 'todos' || (state.filtro === 'capturados') === cap);
    };

    const html = grupos.map((g) => {
      const items = g.tipos.filter(visible);
      if (!items.length) return '';
      const hechos = g.tipos.filter((t) => capturados.has(t.nombre)).length;
      return `<div class="checklist-group">
        <p class="checklist-group-head"><span>${esc(g.area)}</span><span>${hechos} de ${g.tipos.length}</span></p>
        <ul class="checklist">${items.map((t) => {
          const p = capturados.get(t.nombre);
          return p
            ? `<li class="checklist-item is-done" data-status="${estado(p)}"><span class="checklist-dot" aria-hidden="true"></span>
                 <button class="checklist-name" data-goto="${p.id}" title="${esc(t.nombre)}">${esc(t.nombre)}</button></li>`
            : `<li class="checklist-item"><span class="checklist-dot" aria-hidden="true"></span>
                 <span class="checklist-name" title="${esc(t.nombre)}">${esc(t.nombre)}</span>
                 <button class="btn btn-ghost btn-icon btn-sm" data-add="${esc(t.nombre)}" aria-label="Agregar ${esc(t.nombre)}" title="Agregar"><span class="icon" aria-hidden="true">add</span></button></li>`;
        }).join('')}</ul>
      </div>`;
    }).join('');

    const pill = (id, label) => `<button class="segmented-item" data-filtro="${id}" aria-pressed="${state.filtro === id}">${label}</button>`;
    return `<section class="card card-sm expediente-aside" aria-label="Tipos de permiso">
      <h2 class="card-title">Los ${total} tipos</h2>
      <div class="input-group">
        <span class="icon" aria-hidden="true">search</span>
        <input class="input" type="search" data-search placeholder="Buscar un tipo" aria-label="Buscar un tipo" value="${esc(state.q)}">
      </div>
      <div class="segmented" role="group" aria-label="Mostrar">${pill('todos', 'Todos')}${pill('capturados', 'Capturados')}${pill('pendientes', 'Pendientes')}</div>
      <div class="checklist-scroll" data-checklist>${html || '<p class="small subtle">Ningún tipo coincide con la búsqueda.</p>'}</div>
    </section>`;
  }

  /* ---------- Expediente ---------- */
  function recordHTML(p) {
    const n = p.archivos.length;
    return `<article class="record ${state.resaltar === p.id ? 'is-highlighted' : ''}" id="permiso-${p.id}" data-permiso="${p.id}">
      <header class="record-head">
        <div class="record-heading">
          <p class="record-title">${esc(p.nombre)} <span class="record-area">· ${esc(p.area)}</span></p>
          <p class="record-meta">
            ${badgeEstado(p)}
            <span>${p.fin ? `Vence el ${fmtDate(p.fin)}` : 'No vence'}</span>
            ${p.fin ? `<span>${esc(p.periodo)}</span>` : ''}
            ${n ? `<button class="btn-link" data-act="ver-docs"><span class="icon" aria-hidden="true">attach_file</span>${plural(n, 'documento')}</button>`
              : '<span class="badge" data-flag="nodoc">Sin documento</span>'}
            ${p.responsable ? `<span><span class="icon" aria-hidden="true">person</span>${esc(p.responsable)}</span>` : ''}
            ${p.dependencia ? `<span><span class="icon" aria-hidden="true">account_balance</span>${esc(p.dependencia)}</span>` : ''}
            ${p.pagoDerechos != null ? `<span>Derechos ${CLETA.money(p.pagoDerechos)}</span>` : ''}
            ${p.pagoHonorarios != null ? `<span>Honorarios ${CLETA.money(p.pagoHonorarios)}</span>` : ''}
          </p>
        </div>
        <div class="record-actions">
          <button class="btn btn-secondary btn-sm" data-act="adjuntar"><span class="icon" aria-hidden="true">attach_file</span>Adjuntar</button>
          <button class="btn btn-ghost btn-icon btn-sm" popovertarget="record-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Más acciones de ${esc(p.nombre)}"><span class="icon" aria-hidden="true">more_horiz</span></button>
        </div>
      </header>
    </article>`;
  }

  function main() {
    const lista = urgentes();
    const docs = lista.reduce((t, p) => t + p.archivos.length, 0);
    const tab = (k, label, n) => `<button class="tab" role="tab" data-vista="${k}" aria-selected="${state.vista === k}">${label} <span class="count">${n}</span></button>`;
    return `<div class="expediente-main">
      <div class="tabs" role="tablist" aria-label="Expediente">
        ${tab('permisos', 'Permisos', lista.length)}${tab('documentos', 'Documentos', docs)}
      </div>
      ${state.vista === 'documentos' ? documentosHTML(lista) : permisosHTML(lista)}
    </div>`;
  }

  function permisosHTML(lista) {
    return `<p class="small subtle">Lo urgente primero</p>
      ${lista.length ? lista.map(recordHTML).join('') : `<div class="card"><div class="empty-state">
        <span class="icon empty-icon" aria-hidden="true">folder_open</span>
        <p class="empty-title">Aún no hay permisos capturados</p>
        <p class="empty-text">Agrega el primero desde la lista de tipos o con “Agregar permiso”.</p>
        <button class="btn btn-primary btn-sm" data-act="agregar"><span class="icon" aria-hidden="true">add</span>Agregar permiso</button>
      </div></div>`}`;
  }

  /* ---------- Documentos: todos los archivos del expediente en una tabla ---------- */
  const todosLosDocs = (lista) => lista.flatMap((p) => p.archivos.map((a, i) => ({ p, a, i })));
  function documentosFiltrados(lista) {
    const { q, permiso, orden } = state.docs;
    const t = q.trim().toLowerCase();
    const rows = todosLosDocs(lista).filter(({ p, a }) => (!permiso || String(p.id) === permiso)
      && (!t || `${a.nombre} ${p.nombre} ${a.por}`.toLowerCase().includes(t)));
    const porNombre = (x, y) => x.a.nombre.localeCompare(y.a.nombre, 'es', { sensitivity: 'base' });
    return rows.sort(orden === 'nombre' ? porNombre
      : orden === 'permiso' ? (x, y) => x.p.nombre.localeCompare(y.p.nombre, 'es') || porNombre(x, y)
      : (x, y) => (y.a.fecha || '').localeCompare(x.a.fecha || '') || porNombre(x, y));
  }
  function documentosHTML(lista) {
    const total = todosLosDocs(lista).length;
    if (!total) return `<div class="card"><div class="empty-state">
      <span class="icon empty-icon" aria-hidden="true">folder_open</span>
      <p class="empty-title">Aún no hay documentos adjuntos</p>
      <p class="empty-text">Adjúntalos desde cada permiso con “Adjuntar” o al agregar un permiso nuevo.</p>
      <button class="btn btn-secondary btn-sm" data-vista="permisos">Ir a permisos</button>
    </div></div>`;
    const conDocs = lista.filter((p) => p.archivos.length);
    const filas = documentosFiltrados(lista);
    const visibles = filas.slice(0, state.docs.limite);
    const filtrado = state.docs.q || state.docs.permiso;
    const icono = (n) => (/\.(jpe?g|png|gif|webp|heic)$/i.test(n) ? 'image' : 'picture_as_pdf');
    return `<section class="table-view docs-view">
      <div class="table-toolbar">
        <div class="input-group table-search">
          <span class="icon" aria-hidden="true">search</span>
          <input class="input" type="search" data-docs-q value="${esc(state.docs.q)}" placeholder="Buscar archivo o quién lo subió" aria-label="Buscar documento">
        </div>
        <div class="select-wrap"><select class="select" data-docs-permiso aria-label="Filtrar por permiso">
          <option value="">Todos los permisos</option>
          ${conDocs.map((p) => `<option value="${p.id}" ${String(p.id) === state.docs.permiso ? 'selected' : ''}>${esc(p.nombre)} (${p.archivos.length})</option>`).join('')}
        </select></div>
        <div class="select-wrap"><select class="select" data-docs-orden aria-label="Ordenar documentos">
          ${[['recientes', 'Más recientes'], ['nombre', 'Nombre del archivo'], ['permiso', 'Permiso']].map(([v, l]) => `<option value="${v}" ${state.docs.orden === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select></div>
        <div class="table-toolbar-end"><span class="small subtle">${filtrado ? `${filas.length} de ${plural(total, 'documento')}` : plural(total, 'documento')}</span></div>
      </div>
      <div class="table-frame"><div class="table-scroll">
        <table class="table">
          <thead><tr><th>Archivo</th><th>Permiso</th><th>Subido</th><th>Tamaño</th><th><span class="sr-only">Acciones</span></th></tr></thead>
          <tbody>${visibles.length ? visibles.map(({ p, a, i }) => `<tr data-permiso="${p.id}">
            <td><div class="doc-name"><span class="icon" aria-hidden="true">${icono(a.nombre)}</span><span class="cell-truncate" title="${esc(a.nombre)}">${esc(a.nombre)}</span></div></td>
            <td><button class="btn-link" data-goto="${p.id}">${esc(p.nombre)}</button></td>
            <td><div class="cell-stack"><span>${fmtDate(a.fecha)}</span><span class="cell-secondary cell-truncate" title="${esc(a.por)}">${esc(a.por)}</span></div></td>
            <td class="nowrap subtle">${esc(a.tamano || '—')}</td>
            <td class="nowrap"><button class="btn btn-ghost btn-icon btn-sm" data-act="descargar" data-file="${i}" aria-label="Descargar ${esc(a.nombre)}" title="Descargar"><span class="icon" aria-hidden="true">download</span></button></td>
          </tr>`).join('') : `<tr class="row-empty"><td colspan="5"><div class="empty-state">
            <span class="icon empty-icon" aria-hidden="true">search_off</span>
            <p class="empty-title">Ningún documento coincide</p>
            <p class="empty-text">Prueba con otro nombre o quita el filtro de permiso.</p>
            <button class="btn btn-secondary btn-sm" data-docs-limpiar>Limpiar filtros</button>
          </div></td></tr>`}</tbody>
        </table>
      </div></div>
      ${filas.length > visibles.length ? `<button class="more-btn" data-docs-mas>Ver ${Math.min(DOCS_PAGINA, filas.length - visibles.length)} más · quedan ${filas.length - visibles.length}</button>` : ''}
    </section>`;
  }

  /* ---------- Render ---------- */
  function render() {
    document.title = `Permisos · ${s.nombre} · BRS`;
    const foco = ['[data-search]', '[data-docs-q]'].find((sel) => document.activeElement?.matches?.(sel));
    root.innerHTML = `${header()}<div class="expediente">${checklist()}${main()}</div>`;
    if (foco) { const i = root.querySelector(foco); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }
    Shell.refresh();
  }
  // Solo la lista de tipos (al buscar o filtrar, sin perder el foco del buscador)
  function renderChecklist() {
    const nuevo = document.createElement('div');
    nuevo.innerHTML = checklist();
    root.querySelector('[data-checklist]').replaceWith(nuevo.querySelector('[data-checklist]'));
    root.querySelectorAll('[data-filtro]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filtro === state.filtro)));
  }

  const commit = (msg) => { CLETA.save(); render(); UI.toast(msg, 'success'); };
  const permisoDe = (el) => permisos().find((p) => p.id === Number(el.closest('[data-permiso]')?.dataset.permiso));
  const archivoNuevo = (nombre) => ({ nombre, tamano: `${120 + Math.floor(Math.random() * 900)} KB`, fecha: CLETA.TODAY, por: Shell.perfil.email || Shell.perfil.nombre });

  function pendientes() {
    const cap = new Set(permisos().map((p) => p.nombre));
    return CLETA.tiposAplicables(s)
      .map((g) => ({ area: g.area, tipos: g.tipos.map((t) => t.nombre).filter((n) => !cap.has(n)) }))
      .filter((g) => g.tipos.length);
  }

  function agregar(tipo) {
    Forms.permiso({ sucursal: s, tiposPendientes: pendientes(), tipo }, (v) => {
      const id = db.permisos.reduce((m, p) => Math.max(m, p.id), 0) + 1;
      db.permisos.push({ id, sucursalId: s.id, nombre: v.nombre, area: v.area, periodo: v.periodo, fin: v.fin,
        dependencia: v.dependencia, pagoDerechos: v.pagoDerechos, pagoHonorarios: v.pagoHonorarios,
        responsable: null, gestion: 'sin-iniciar',
        archivos: v.archivos.map((a) => ({ ...archivoNuevo(a.nombre), tamano: a.tamano })), doc: v.archivos.length > 0 });
      state.resaltar = id;
      CLETA.log(s, `Permiso agregado: ${v.nombre}${v.archivos.length ? ` con ${plural(v.archivos.length, 'documento')}` : ''}`, 'add');
      commit(`${v.nombre} agregado al expediente${v.archivos.length ? ` con ${plural(v.archivos.length, 'documento')}` : ''}.`);
      document.getElementById(`permiso-${id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }

  /* ---------- Acciones ---------- */
  const ACTIONS = {
    back: () => {
      const vieneDeLaApp = document.referrer && new URL(document.referrer).origin === location.origin;
      vieneDeLaApp && window.history.length > 1 ? window.history.back() : (location.href = 'permisos.html');
    },
    perfil: () => Forms.perfil(s, (v) => {
      s.perfil = v.perfil;
      CLETA.log(s, 'Perfil de permisos actualizado', 'shield');
      commit('Perfil de permisos guardado.');
    }),
    agregar: () => agregar(),
    adjuntar: (el) => {
      const p = permisoDe(el);
      Forms.adjuntar({ titulo: 'Adjuntar documentos', subtitulo: `${p.nombre} · ${s.nombre}`, tipos: [p.nombre, 'Comprobante de pago', 'Acuse de trámite'], tipo: p.nombre, multiple: true }, (v) => {
        v.archivos.forEach((a) => p.archivos.push({ ...archivoNuevo(a.nombre), tamano: a.tamano }));
        p.doc = true;
        if (v.vigencia && p.fin) p.fin = v.vigencia;
        const n = v.archivos.length;
        CLETA.log(s, `${n === 1 ? 'Documento adjunto' : `${n} documentos adjuntos`} a ${p.nombre}: ${v.archivos.map((a) => a.nombre).join(', ')}`, 'attach_file');
        commit(n === 1 ? `${v.archivos[0].nombre} adjuntado a ${p.nombre}.` : `${n} documentos adjuntados a ${p.nombre}.`);
      });
    },
    'ver-docs': (el) => {
      Object.assign(state.docs, { permiso: String(permisoDe(el).id), q: '', limite: DOCS_PAGINA });
      state.vista = 'documentos';
      render();
      root.querySelector('[data-vista="documentos"]')?.focus();
    },
    descargar: (el) => {
      const a = permisoDe(el).archivos[Number(el.dataset.file)];
      UI.toast(`Prototipo: aquí se descarga “${a.nombre}”.`, 'info');
    },
  };

  root.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    const goto = e.target.closest('[data-goto]');
    const filtro = e.target.closest('[data-filtro]');
    const act = e.target.closest('[data-act]');
    if (add) agregar(add.dataset.add);
    else if (goto) {
      if (state.vista !== 'permisos') { state.vista = 'permisos'; render(); }
      const card = document.getElementById(`permiso-${goto.dataset.goto}`);
      card?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      card?.classList.add('is-highlighted');
      setTimeout(() => card?.classList.remove('is-highlighted'), 1600);
    } else if (filtro) { state.filtro = filtro.dataset.filtro; renderChecklist(); }
    else if (act) ACTIONS[act.dataset.act]?.(act);
    else if (e.target.closest('[data-vista]')) {
      state.vista = e.target.closest('[data-vista]').dataset.vista;
      render();
      root.querySelector(`.tab[data-vista="${state.vista}"]`)?.focus();
    } else if (e.target.closest('[data-docs-mas]')) { state.docs.limite += DOCS_PAGINA; render(); }
    else if (e.target.closest('[data-docs-limpiar]')) { Object.assign(state.docs, { q: '', permiso: '', limite: DOCS_PAGINA }); render(); }
  });
  let debounceDocs;
  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-docs-q]')) {
      clearTimeout(debounceDocs);
      debounceDocs = setTimeout(() => { state.docs.q = e.target.value; state.docs.limite = DOCS_PAGINA; render(); }, 150);
      return;
    }
    if (!e.target.matches('[data-search]')) return;
    state.q = e.target.value;
    renderChecklist();
  });
  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-docs-permiso]')) { state.docs.permiso = e.target.value; state.docs.limite = DOCS_PAGINA; render(); }
    if (e.target.matches('[data-docs-orden]')) { state.docs.orden = e.target.value; render(); }
  });

  // Menú "más acciones" de un registro (compartido)
  document.body.insertAdjacentHTML('beforeend', `<div class="menu" id="record-menu" popover role="menu" aria-label="Acciones del permiso">
    <button class="menu-item" role="menuitem" data-record-act="editar"><span class="icon" aria-hidden="true">edit</span>Editar permiso</button>
    <hr class="menu-divider">
    <button class="menu-item menu-item-danger" role="menuitem" data-record-act="eliminar"><span class="icon" aria-hidden="true">delete</span>Eliminar permiso</button>
  </div>`);
  const menu = document.getElementById('record-menu');
  let menuPermiso = null;
  root.addEventListener('click', (e) => {
    const t = e.target.closest('[popovertarget="record-menu"]');
    if (!t) return;
    menuPermiso = permisoDe(t);
  }, true);
  menu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-record-act]');
    if (!b || !menuPermiso) return;
    menu.hidePopover();
    const p = menuPermiso;
    if (b.dataset.recordAct === 'editar') {
      Forms.permiso({ sucursal: s, tiposPendientes: pendientes(), permiso: p }, (v) => {
        Object.assign(p, {
          nombre: v.nombre, area: v.area, periodo: v.periodo, fin: v.fin,
          dependencia: v.dependencia, pagoDerechos: v.pagoDerechos, pagoHonorarios: v.pagoHonorarios,
        });
        v.archivos.forEach((a) => p.archivos.push({ ...archivoNuevo(a.nombre), tamano: a.tamano }));
        p.doc = p.archivos.length > 0;
        state.resaltar = p.id;
        CLETA.log(s, `Permiso editado: ${p.nombre}${v.archivos.length ? ` (+${plural(v.archivos.length, 'documento')})` : ''}`, 'edit');
        commit(`Cambios guardados en ${p.nombre}.`);
      });
    } else {
      Forms.confirmar({
        titulo: '¿Eliminar este permiso?',
        texto: `${p.nombre} y ${plural(p.archivos.length, 'documento')} se quitarán del expediente de ${s.nombre}. Esta acción no se puede deshacer.`,
        accion: 'Eliminar permiso',
      }, () => {
        db.permisos = db.permisos.filter((x) => x.id !== p.id);
        CLETA.log(s, `Permiso eliminado: ${p.nombre}`, 'delete');
        commit(`${p.nombre} se eliminó del expediente.`);
      });
    }
  });

  render();
})();
