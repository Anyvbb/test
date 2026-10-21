/* =========================================================
   prerrequisitos.js — prototipo BRS · Prerrequisitos
   Catálogo por estado: lista de estados a la izquierda y sus
   permisos en acordeón. Es informativo:
   la única forma de agregar estados o prerrequisitos es
   importar un Excel (Estado · Permiso · Prerrequisito ·
   Descripción). Permiso es el título y los
   prerrequisitos se numeran en el orden del archivo.
   ========================================================= */

(() => {
  const { db, esc, fmtDate, plural, TODAY, prerrequisitosDe, save } = CLETA;
  const root = document.getElementById('prerrequisitos');
  const $ = (s, el = document) => el.querySelector(s);
  const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

  const COLUMNAS = ['Estado', 'Permiso', 'Prerrequisito', 'Descripción'];
  const EJEMPLO = [
    ['Querétaro', 'Licencia de Funcionamiento Tienda y Restaurante', 'Formatos de solicitud', ''],
    ['Querétaro', 'Licencia de Funcionamiento Tienda y Restaurante', 'Constancia de Uso de Suelo', 'Emitida por el municipio'],
    ['Querétaro', 'Calibración Básculas', 'Solicitud', ''],
    ['Querétaro', 'Calibración Básculas', 'Pago de Derechos', ''],
    ['Coahuila', 'Licencia de Alcohol', 'Carta de no antecedentes penales', 'Del representante legal'],
    ['Coahuila', 'Licencia de Alcohol', 'Pago Impuesto Predial', ''],
    ['Aguascalientes', '', 'Pago de derechos municipales', ''],
  ];

  const state = { estado: db.prereqEstados[0], open: new Set(), q: '', nuevos: new Set() };

  /* ---------- Lista de estados ---------- */
  function renderEstados() {
    const q = norm($('[data-estado-buscar]').value);
    $('[data-estados]', root).innerHTML = db.prereqEstados
      .filter((e) => !q || norm(e).includes(q))
      .map((e) => `<li><button class="prq-state ${state.nuevos.has(e) ? 'is-new' : ''}" data-estado="${esc(e)}" aria-current="${e === state.estado}">
        <span>${esc(e)}</span><span class="count">${prerrequisitosDe(e).length}</span></button></li>`).join('')
      || '<li class="small subtle" style="padding: var(--space-2)">Sin coincidencias</li>';
  }

  /* ---------- Detalle del estado ---------- */
  // Permisos del estado en el orden en que se cargaron (título del acordeón)
  const permisosDe = (estado) => [...new Set(prerrequisitosDe(estado).map((r) => r.permiso))];

  function itemHTML(r, i) {
    return `<div class="prq-item">
      <span class="prq-num" aria-hidden="true">${i + 1}</span>
      <div class="stack-xs"><span class="prq-item-name">${esc(r.nombre)}</span>${r.desc ? `<span class="small muted">${esc(r.desc)}</span>` : ''}</div>
    </div>`;
  }

  function permisoHTML(nombre, rows, delPermiso) {
    const open = state.open.has(nombre) || state.q;
    const n = delPermiso.length;
    return `<div class="card prq-acc">
      <button class="prq-acc-head" data-permiso="${esc(nombre)}" aria-expanded="${!!open}">
        <span class="icon" aria-hidden="true" style="color: var(--kind-permit-fg)">verified_user</span>
        <span class="prq-acc-title">${esc(nombre)}</span>
        <span class="badge">${plural(n, 'prerrequisito')}</span>
        <span class="icon chev" aria-hidden="true">expand_more</span>
      </button>
      ${open ? `<div class="prq-acc-body">${rows.map((r) => itemHTML(r, delPermiso.indexOf(r))).join('')}</div>` : ''}
    </div>`;
  }

  function renderDetalle() {
    const e = state.estado;
    const todos = prerrequisitosDe(e);
    const permisos = permisosDe(e);
    const q = norm(state.q);

    // La numeración es la del permiso completo, aunque la búsqueda oculte filas
    const items = permisos.map((p) => {
      const delPermiso = todos.filter((r) => r.permiso === p);
      const rows = !q || norm(p).includes(q) ? delPermiso : delPermiso.filter((r) => norm(`${r.nombre} ${r.desc}`).includes(q));
      return rows.length ? permisoHTML(p, rows, delPermiso) : '';
    }).join('');

    $('[data-detalle]', root).innerHTML = `
      <div class="prq-main-head">
        <div class="stack-xs">
          <h2>${esc(e)}</h2>
          <p class="small muted">${plural(todos.length, 'prerrequisito')} en ${plural(permisos.length, 'permiso')}</p>
        </div>
        <div class="prq-tools">
          <div class="input-group">
            <span class="icon" aria-hidden="true">search</span>
            <input class="input" type="search" data-q placeholder="Buscar permiso o prerrequisito" value="${esc(state.q)}" aria-label="Buscar permiso o prerrequisito">
          </div>
          <button class="btn btn-ghost btn-sm" data-expandir>${state.open.size ? 'Contraer todos' : 'Expandir todos'}</button>
        </div>
      </div>
      ${items || `<div class="card"><div class="empty-state">
        <span class="icon empty-icon" aria-hidden="true">${todos.length ? 'search_off' : 'playlist_add'}</span>
        <p class="empty-title">${todos.length ? 'Sin coincidencias' : `${esc(e)} aún no tiene prerrequisitos`}</p>
        <p class="empty-text">${todos.length ? 'Prueba con otro texto.' : 'Agrégalos con un Excel que use la plantilla.'}</p>
        ${todos.length ? '' : '<button class="btn btn-primary btn-sm" data-importar><span class="icon" aria-hidden="true">upload_file</span>Importar desde Excel</button>'}
      </div></div>`}`;
  }

  function renderUltima() {
    const u = db.prereqImportaciones.at(-1);
    $('#prq-ultima').innerHTML = u ? `<div class="alert alert-success">
      <span class="icon alert-icon" aria-hidden="true">task_alt</span>
      <div class="alert-content"><p class="alert-title">Última importación: ${esc(u.archivo)}</p>
      <p class="alert-body">${fmtDate(u.fecha)} · ${plural(u.agregados, 'prerrequisito agregado', 'prerrequisitos agregados')}${u.estados.length ? ` · ${plural(u.estados.length, 'estado nuevo', 'estados nuevos')}: ${esc(u.estados.join(', '))}` : ''}${u.omitidos ? ` · ${plural(u.omitidos, 'fila omitida', 'filas omitidas')}` : ''}</p></div>
    </div>` : '';
  }

  function render() {
    if (!db.prereqEstados.includes(state.estado)) state.estado = db.prereqEstados[0];
    renderEstados();
    renderDetalle();
    renderUltima();
  }

  /* ---------- Eventos de la página ---------- */
  root.addEventListener('click', (e) => {
    const est = e.target.closest('[data-estado]');
    const per = e.target.closest('[data-permiso]');
    if (est) { state.estado = est.dataset.estado; state.open.clear(); render(); }
    else if (per) {
      const n = per.dataset.permiso;
      state.open.has(n) ? state.open.delete(n) : state.open.add(n);
      renderDetalle();
      root.querySelector(`[data-permiso="${CSS.escape(n)}"]`)?.focus();
    } else if (e.target.closest('[data-expandir]')) {
      state.open = state.open.size ? new Set() : new Set(permisosDe(state.estado));
      renderDetalle();
    }
  });
  let debounce;
  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-estado-buscar]')) renderEstados();
    if (e.target.matches('[data-q]')) {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.q = e.target.value;
        renderDetalle();
        const q = $('[data-q]', root);
        q.focus();
        q.setSelectionRange(q.value.length, q.value.length);
      }, 150);
    }
  });
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-importar]')) abrirImportar();
    if (e.target.closest('[data-plantilla]')) descargarPlantilla();
  });

  /* ---------- SheetJS (se carga solo al usarlo) ---------- */
  let xlsxPromise;
  const cargarXLSX = () => (xlsxPromise ??= window.XLSX ? Promise.resolve(window.XLSX) : new Promise((ok, fail) => {
    const s = Object.assign(document.createElement('script'), { src: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js' });
    s.onload = () => ok(window.XLSX);
    s.onerror = () => { xlsxPromise = null; fail(); };
    document.head.append(s);
  }));

  async function descargarPlantilla() {
    try {
      const X = await cargarXLSX();
      const wb = X.utils.book_new();
      const hoja = X.utils.aoa_to_sheet([COLUMNAS, ...EJEMPLO.slice(0, 3)]);
      hoja['!cols'] = [{ wch: 18 }, { wch: 46 }, { wch: 46 }, { wch: 34 }];
      X.utils.book_append_sheet(wb, hoja, 'Prerrequisitos');
      X.writeFile(wb, 'plantilla-prerrequisitos.xlsx');
    } catch {
      // Sin conexión al CDN: CSV que también abre Excel
      const cell = (v) => `"${String(v).replace(/"/g, '""')}"`;
      const csv = [COLUMNAS, ...EJEMPLO.slice(0, 3)].map((r) => r.map(cell).join(',')).join('\r\n');
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })), download: 'plantilla-prerrequisitos.csv' });
      a.click();
    }
    UI.toast('Plantilla descargada. Llénala y súbela con Importar desde Excel.', 'success');
  }

  /* ---------- Importar desde Excel (modal en 3 pasos) ---------- */
  const PASOS = [['Archivo', 'Sube el Excel'], ['Revisión', 'Qué se agregará'], ['Listo', 'Resultado']];
  const imp = { paso: 1, archivo: '', filas: [] };
  let dlg;

  function montar() {
    document.body.insertAdjacentHTML('beforeend', `
<dialog class="modal modal-xl" id="m-importar" aria-labelledby="m-importar-title">
  <div class="modal-form">
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-importar-title">Importar prerrequisitos desde Excel</h2>
        <p class="modal-subtitle">Una fila por prerrequisito. Si el estado no existe se crea; si ya existe, la fila se suma a sus prerrequisitos.</p>
      </div>
      <button type="button" class="modal-close" data-modal-close aria-label="Cerrar"><span class="icon" aria-hidden="true">close</span></button>
    </header>
    <div class="modal-stepper">
      <ol class="stepper" aria-label="Pasos de la importación">
        ${PASOS.map(([l, d], i) => `<li class="stepper-step" data-step-item="${i + 1}">
          <button type="button" class="stepper-trigger" disabled><span class="stepper-index">${i + 1}</span>
          <span class="stepper-text"><span class="stepper-label">${l}</span><span class="stepper-desc">${d}</span></span></button></li>`).join('')}
      </ol>
    </div>
    <div class="modal-body" data-imp-body></div>
    <footer class="modal-footer" data-imp-foot></footer>
  </div>
</dialog>`);
    dlg = document.getElementById('m-importar');
    dlg.addEventListener('change', (e) => { if (e.target.matches('[data-imp-file]') && e.target.files[0]) leerArchivo(e.target.files[0]); });
    dlg.addEventListener('click', (e) => {
      if (e.target.closest('[data-imp-ejemplo]')) { imp.archivo = 'prerrequisitos-ejemplo.xlsx'; validar([COLUMNAS, ...EJEMPLO]); }
      if (e.target.closest('[data-imp-atras]')) { imp.paso = 1; pintar(); }
      if (e.target.closest('[data-imp-aplicar]')) aplicar();
      if (e.target.closest('[data-imp-ver]')) { UI.closeModal(dlg); }
    });
  }

  function abrirImportar() {
    if (!dlg) montar();
    Object.assign(imp, { paso: 1, archivo: '', filas: [], error: '' });
    pintar();
    dlg.showModal();
    cargarXLSX().catch(() => {});
  }

  function pintar() {
    dlg.querySelectorAll('[data-step-item]').forEach((li) => {
      const i = Number(li.dataset.stepItem);
      li.toggleAttribute('aria-current', i === imp.paso);
      if (i === imp.paso) li.setAttribute('aria-current', 'step');
      li.classList.toggle('is-done', i < imp.paso);
      li.querySelector('.stepper-index').innerHTML = i < imp.paso ? '<span class="icon" aria-hidden="true">check</span>' : i;
    });
    const body = $('[data-imp-body]', dlg), foot = $('[data-imp-foot]', dlg);
    const cancelar = '<button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>';

    if (imp.paso === 1) {
      body.innerHTML = `
        <label class="dropzone">
          <span class="icon" aria-hidden="true">upload_file</span>
          <span><strong>Sube el archivo</strong> o arrástralo aquí</span>
          <span class="caption">Excel (.xlsx, .xls) o .csv · la primera hoja · máximo 2,000 filas</span>
          <span data-dropzone-file></span>
          <input type="file" data-imp-file accept=".xlsx,.xls,.csv" class="sr-only">
        </label>
        ${imp.error ? `<div class="alert alert-danger" role="alert"><span class="icon alert-icon" aria-hidden="true">error</span><div class="alert-content"><p class="alert-title">No se pudo importar</p><p class="alert-body">${esc(imp.error)}</p></div></div>` : ''}
        <div class="stack-sm">
          <p class="small"><strong>Columnas de la primera fila</strong> (Descripción es opcional)</p>
          <div class="prq-cols">${COLUMNAS.map((c) => `<code>${c}</code>`).join('')}</div>
          <ul class="small muted" style="margin:0; padding-left: var(--space-5)">
            <li><strong>Permiso</strong> es el título del grupo. Si ya existe en el estado, el prerrequisito se agrega al final de su lista; si no, se crea un permiso nuevo.</li>
            <li>Los prerrequisitos se numeran en el orden de las filas.</li>
            <li>Las filas que ya existen (mismo estado, permiso y prerrequisito) se omiten; no se duplican ni se reemplazan.</li>
          </ul>
        </div>`;
      foot.innerHTML = `<button type="button" class="btn btn-ghost modal-footer-start" data-plantilla><span class="icon" aria-hidden="true">download</span>Descargar plantilla</button>
        <button type="button" class="btn btn-link" data-imp-ejemplo>Probar con archivo de ejemplo</button>${cancelar}`;
    } else if (imp.paso === 2) {
      const c = (k) => imp.filas.filter((f) => f.res === k).length;
      const estadosNuevos = [...new Set(imp.filas.filter((f) => f.res === 'nuevo' && f.estadoNuevo).map((f) => f.estado))];
      const res = (f) => (f.res === 'nuevo' ? '<span class="badge" data-status="active">Se agrega</span>'
        : f.res === 'dup' ? '<span class="badge" data-status="draft">Ya existe</span>'
        : `<span class="badge" data-status="expired">${esc(f.msg)}</span>`);
      body.innerHTML = `
        <p class="small muted"><span class="icon icon-sm" aria-hidden="true" style="vertical-align: -4px">description</span> ${esc(imp.archivo)} · ${plural(imp.filas.length, 'fila leída', 'filas leídas')}</p>
        <div class="prq-summary">
          <div class="card card-sm"><strong>${c('nuevo')}</strong><span class="small muted">Prerrequisitos nuevos</span></div>
          <div class="card card-sm"><strong>${estadosNuevos.length}</strong><span class="small muted">${estadosNuevos.length ? `Estados nuevos: ${esc(estadosNuevos.join(', '))}` : 'Estados nuevos'}</span></div>
          <div class="card card-sm"><strong>${c('dup')}</strong><span class="small muted">Ya existen (se omiten)</span></div>
          <div class="card card-sm"><strong>${c('err')}</strong><span class="small muted">Con error (se omiten)</span></div>
        </div>
        ${c('err') ? '<div class="alert alert-warning"><span class="icon alert-icon" aria-hidden="true">warning</span><div class="alert-content"><p class="alert-body">Las filas con error no se importan. Corrígelas en tu archivo y vuelve a subirlo, o continúa solo con las filas válidas.</p></div></div>' : ''}
        <div class="table-frame"><div class="table-scroll"><table class="table">
          <thead><tr><th>Fila</th><th>Estado</th><th>Permiso</th><th>Prerrequisito</th><th>Resultado</th></tr></thead>
          <tbody>${imp.filas.map((f) => `<tr>
            <td class="subtle">${f.linea}</td>
            <td>${esc(f.estado) || '<span class="subtle">—</span>'}${f.estadoNuevo && f.res === 'nuevo' ? ' <span class="badge badge-accent">Nuevo</span>' : ''}</td>
            <td>${esc(f.permiso) || '<span class="subtle">—</span>'}</td>
            <td>${esc(f.nombre) || '<span class="subtle">—</span>'}</td>
            <td>${res(f)}</td></tr>`).join('')}</tbody>
        </table></div></div>`;
      const n = c('nuevo');
      foot.innerHTML = `<button type="button" class="btn btn-secondary modal-footer-start" data-imp-atras><span class="icon" aria-hidden="true">arrow_back</span>Cambiar archivo</button>
        ${cancelar}<button type="button" class="btn btn-primary" data-imp-aplicar ${n ? '' : 'disabled'}>${n ? `Agregar ${plural(n, 'prerrequisito')}` : 'Nada que agregar'}</button>`;
    } else {
      const u = db.prereqImportaciones.at(-1);
      body.innerHTML = `<div class="empty-state">
        <span class="icon empty-icon" aria-hidden="true" style="color: var(--status-active-solid)">task_alt</span>
        <p class="empty-title">Importación completa</p>
        <p class="empty-text">Se agregaron ${plural(u.agregados, 'prerrequisito')}${u.estados.length ? ` y ${plural(u.estados.length, 'estado nuevo', 'estados nuevos')} (${esc(u.estados.join(', '))})` : ''}.${u.omitidos ? ` ${plural(u.omitidos, 'fila se omitió', 'filas se omitieron')}.` : ''}</p>
      </div>`;
      foot.innerHTML = '<button type="button" class="btn btn-primary" data-imp-ver>Ver prerrequisitos</button>';
    }
    body.scrollTop = 0;
  }

  async function leerArchivo(file) {
    imp.archivo = file.name;
    try {
      const X = await cargarXLSX();
      const wb = X.read(await file.arrayBuffer(), { type: 'array' });
      const filas = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
      if (filas.length > 2001) throw new Error('El archivo tiene más de 2,000 filas. Divídelo en varios archivos.');
      validar(filas);
    } catch (err) {
      imp.error = err?.message?.startsWith('El archivo') ? err.message : 'No se pudo leer el archivo. Revisa que sea .xlsx, .xls o .csv y que use la plantilla.';
      pintar();
    }
  }

  function validar(aoa) {
    const head = (aoa[0] || []).map(norm);
    const col = (k) => head.indexOf(norm(k));
    const ix = { e: col('Estado'), p: col('Permiso'), n: col('Prerrequisito'), d: col('Descripción') };
    if (ix.e < 0 || ix.p < 0 || ix.n < 0) {
      imp.error = 'Faltan columnas. La primera fila debe tener al menos Estado, Permiso y Prerrequisito.';
      return pintar();
    }
    const vistos = new Set(db.prerrequisitos.map((r) => `${norm(r.estado)}|${norm(r.permiso)}|${norm(r.nombre)}`));
    imp.filas = aoa.slice(1).map((row, i) => {
      const val = (k) => (ix[k] >= 0 ? String(row[ix[k]] ?? '').trim() : '');
      const f = { linea: i + 2, estado: val('e'), permiso: val('p'), nombre: val('n'), desc: val('d') };
      if (!f.estado && !f.permiso && !f.nombre) return null;
      const est = db.prereqEstados.find((x) => norm(x) === norm(f.estado));
      // Mismo título sin importar mayúsculas o acentos: se usa el ya existente
      const per = db.prerrequisitos.find((r) => r.estado === (est || f.estado) && norm(r.permiso) === norm(f.permiso))?.permiso;
      if (est) f.estado = est;
      if (per) f.permiso = per;
      f.estadoNuevo = !est;
      if (!f.estado) return { ...f, res: 'err', msg: 'Falta el estado' };
      if (!f.permiso) return { ...f, res: 'err', msg: 'Falta el permiso' };
      if (!f.nombre) return { ...f, res: 'err', msg: 'Falta el prerrequisito' };
      const k = `${norm(f.estado)}|${norm(f.permiso)}|${norm(f.nombre)}`;
      if (vistos.has(k)) return { ...f, res: 'dup' };
      vistos.add(k);
      return { ...f, res: 'nuevo' };
    }).filter(Boolean);
    if (!imp.filas.length) { imp.error = 'El archivo no tiene filas debajo de los encabezados.'; return pintar(); }
    imp.error = '';
    imp.paso = 2;
    pintar();
  }

  function aplicar() {
    const ok = imp.filas.filter((f) => f.res === 'nuevo');
    const estados = [];
    let id = Math.max(0, ...db.prerrequisitos.map((r) => r.id));
    ok.forEach((f) => {
      if (!db.prereqEstados.includes(f.estado)) { db.prereqEstados.push(f.estado); estados.push(f.estado); }
      db.prerrequisitos.push({ id: ++id, estado: f.estado, permiso: f.permiso, nombre: f.nombre, desc: f.desc, origen: 'excel', fecha: TODAY, archivo: imp.archivo });
    });
    db.prereqEstados.sort((a, b) => a.localeCompare(b, 'es'));
    db.prereqImportaciones.push({ archivo: imp.archivo, fecha: TODAY, agregados: ok.length, estados, omitidos: imp.filas.length - ok.length });
    save();
    estados.forEach((e) => state.nuevos.add(e));
    // Lleva al primer estado afectado y abre sus permisos con cambios
    if (ok.length) {
      state.estado = ok[0].estado;
      state.open = new Set(ok.filter((f) => f.estado === state.estado).map((f) => f.permiso));
      state.q = '';
    }
    imp.paso = 3;
    pintar();
    render();
    UI.toast(`Se agregaron ${plural(ok.length, 'prerrequisito')}${estados.length ? ` y ${plural(estados.length, 'estado nuevo', 'estados nuevos')}` : ''}`, 'success');
  }

  state.open = new Set(prerrequisitosDe(state.estado).map((r) => r.permiso).slice(0, 1));
  render();
  Shell.refresh();
})();
