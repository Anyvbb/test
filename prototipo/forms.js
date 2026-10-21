/* =========================================================
   forms.js — formularios del prototipo (todos en modal)
   Cada modal se inserta en la página la primera vez que se
   usa. Todos pasan por la validación de ui.js y devuelven los
   valores al callback onDone(values, formData).
   ========================================================= */

window.Forms = (() => {
  const { esc, fmtDate, plural, addDays, addMonths, TODAY, ESTADOS, RESPONSABLES, EMPRESA, CATALOGO_PERMISOS } = CLETA;
  const tamano = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round((bytes || 0) / 1024))} KB`);
  const opts = (list, sel) => list.map((o) => `<option ${o === sel ? 'selected' : ''}>${esc(o)}</option>`).join('');
  const closeBtn = '<button type="button" class="modal-close" data-modal-close aria-label="Cerrar"><span class="icon" aria-hidden="true">close</span></button>';
  const req = '<span class="field-required" aria-hidden="true">*</span>';
  const dropzone = (name, hint, required = false, accept = 'application/pdf,image/*') => `
    <label class="dropzone">
      <span class="icon" aria-hidden="true">upload_file</span>
      <span><strong>Sube el archivo</strong> o arrástralo aquí</span>
      <span class="caption">${hint}</span>
      <span data-dropzone-file></span>
      <input type="file" name="${name}" accept="${accept}" class="sr-only" ${required ? 'required' : ''}>
    </label>`;

  // Inserta el <dialog> una sola vez y conecta su submit al callback vigente
  const registry = {};
  function mount(id, html) {
    if (!registry[id]) {
      document.body.insertAdjacentHTML('beforeend', html);
      const dlg = document.getElementById(id);
      registry[id] = { dlg, form: dlg.querySelector('form'), cb: null };
      registry[id].form.addEventListener('modal:submit', (e) => {
        const values = Object.fromEntries(e.detail);
        registry[id].cb?.(values, e.detail);
      });
    }
    return registry[id];
  }
  function open(r, cb) {
    r.cb = cb;
    UI.openModal(r.dlg.id);
  }
  const setText = (r, sel, text) => { r.dlg.querySelector(sel).textContent = text; };

  /* =======================================================
     Sucursal: alta y edición (modal-xl)
     ======================================================= */
  function sucursal(record, onDone) {
    const r = mount('m-sucursal', `
<dialog class="modal modal-xl" id="m-sucursal" aria-labelledby="m-sucursal-title">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-sucursal-title">Nueva sucursal</h2>
        <p class="modal-subtitle" data-subtitle></p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-body">
      <div class="form-section">
        <p class="form-section-title">Identificación</p>
        <div class="form-grid form-grid-3">
          <div class="field">
            <label class="field-label" for="s-nombre">Nombre de la sucursal ${req}</label>
            <input class="input" id="s-nombre" name="nombre" placeholder="Ej. Cumbres" required>
            <p class="field-error">Escribe el nombre de la sucursal.</p>
          </div>
          <div class="field">
            <label class="field-label" for="s-num">N° de tienda</label>
            <input class="input" type="number" id="s-num" name="num" min="1" placeholder="2045">
            <p class="field-error">Debe ser un número mayor a 0.</p>
          </div>
          <div class="field">
            <label class="field-label" for="s-estatus">Estatus</label>
            <div class="select-wrap"><select class="select" id="s-estatus" name="estatus">
              <option value="">Sin capturar</option>${opts(['Operando', 'En construcción', 'Proyecto', 'Cerrada'])}
            </select></div>
          </div>
          <div class="field">
            <label class="field-label" for="s-formato">Formato ${req}</label>
            <div class="select-wrap"><select class="select" id="s-formato" name="formato" required>${opts(['HEB', 'Mi Tienda', 'Express', 'CEDIS'])}</select></div>
          </div>
          <div class="field">
            <label class="field-label" for="s-empresa">Empresa HEB ${req}</label>
            <div class="select-wrap"><select class="select" id="s-empresa" name="empresa" required>${opts([EMPRESA])}</select></div>
          </div>
          <div class="field">
            <label class="field-label" for="s-prop">Propietario interno</label>
            <input class="input" id="s-prop" name="propietario" placeholder="Ej. Inmobiliaria HEB">
          </div>
        </div>
      </div>

      <div class="form-section">
        <p class="form-section-title">Inmueble</p>
        <div class="form-grid form-grid-3">
          <fieldset class="field field-full">
            <legend class="field-label">Tipo ${req}</legend>
            <div class="check-group check-group-inline">
              <label class="check"><input type="radio" name="tipo" value="Propio" checked><span>Propio</span></label>
              <label class="check"><input type="radio" name="tipo" value="Tercero"><span>Tercero</span></label>
              <label class="check"><input type="radio" name="tipo" value="Mixto"><span>Mixto</span></label>
            </div>
          </fieldset>
          <div class="field">
            <label class="field-label" for="s-arr">Arrendador <span class="field-required" data-arr-required hidden aria-hidden="true">*</span></label>
            <input class="input" id="s-arr" name="arrendador" disabled>
            <p class="field-hint">Obligatorio para terceros o mixtos.</p>
            <p class="field-error">Escribe el nombre del arrendador.</p>
          </div>
          <div class="field">
            <label class="field-label" for="s-m2">Total de m² de construcción</label>
            <div class="input-group"><input class="input" type="number" id="s-m2" name="m2" min="1" placeholder="4500"><span class="input-suffix">m²</span></div>
            <p class="field-error">Debe ser mayor a 0.</p>
          </div>
          <div class="field">
            <label class="field-label" for="s-m2t">Total de m² del terreno</label>
            <div class="input-group"><input class="input" type="number" id="s-m2t" name="m2Terreno" min="1" placeholder="9000"><span class="input-suffix">m²</span></div>
            <p class="field-error">Debe ser mayor a 0.</p>
          </div>
          <div class="field">
            <label class="field-label" for="s-predial">Cuenta predial</label>
            <input class="input" id="s-predial" name="cuentaPredial" placeholder="Ej. 3A-45210">
          </div>
          <div class="field">
            <label class="field-label" for="s-catastro">Clave catastral</label>
            <input class="input" id="s-catastro" name="claveCatastral" placeholder="Ej. 070-012-35">
          </div>
        </div>
      </div>

      <div class="form-section">
        <p class="form-section-title">Ubicación</p>
        <div class="form-grid form-grid-3">
          <div class="field">
            <label class="field-label" for="s-pais">País ${req}</label>
            <div class="select-wrap"><select class="select" id="s-pais" name="pais" required>${opts(['México', 'Estados Unidos'])}</select></div>
          </div>
          <div class="field">
            <label class="field-label" for="s-estado">Estado ${req}</label>
            <div class="select-wrap"><select class="select" id="s-estado" name="estado" required><option value="">Selecciona…</option>${opts(ESTADOS)}</select></div>
            <p class="field-error">Elige el estado.</p>
          </div>
          <div class="field">
            <label class="field-label" for="s-ciudad">Ciudad ${req}</label>
            <input class="input" id="s-ciudad" name="ciudad" placeholder="Ej. Monterrey" required>
            <p class="field-error">Escribe la ciudad.</p>
          </div>
          <div class="field field-span-2">
            <label class="field-label" for="s-calle">Calle</label>
            <input class="input" id="s-calle" name="calle" placeholder="Ej. Av. Lázaro Cárdenas">
          </div>
          <div class="field">
            <label class="field-label" for="s-noext">No. ext</label>
            <input class="input" id="s-noext" name="noExt" placeholder="1000">
          </div>
          <div class="field">
            <label class="field-label" for="s-noint">No. int <span class="field-optional">(opcional)</span></label>
            <input class="input" id="s-noint" name="noInt" placeholder="Local 4">
          </div>
          <div class="field">
            <label class="field-label" for="s-cp">Código postal</label>
            <input class="input" id="s-cp" name="cp" inputmode="numeric" pattern="\\d{5}" maxlength="5" placeholder="64610">
            <p class="field-error">Deben ser 5 dígitos.</p>
          </div>
          <div class="field">
            <label class="field-label" for="s-col">Colonia</label>
            <input class="input" id="s-col" name="colonia" placeholder="Ej. Valle Oriente">
          </div>
          <div class="field">
            <label class="field-label" for="s-coords">Coordenadas</label>
            <input class="input" id="s-coords" name="coords" placeholder="25.6866, -100.3161" pattern="-?\\d+(\\.\\d+)?,\\s*-?\\d+(\\.\\d+)?">
            <p class="field-hint">Latitud, longitud.</p>
            <p class="field-error">Usa el formato latitud, longitud.</p>
          </div>
        </div>
      </div>

      <div class="form-section">
        <p class="form-section-title">Condiciones económicas</p>
        <div class="form-grid form-grid-3">
          <div class="field">
            <label class="field-label" for="s-precio">Precio de lista</label>
            <div class="input-group"><span class="icon" aria-hidden="true">attach_money</span><input class="input" type="number" id="s-precio" name="precioLista" min="0" step="0.01" placeholder="45.00"><span class="input-suffix">/ m²</span></div>
          </div>
          <div class="field">
            <label class="field-label" for="s-renta">Renta mensual</label>
            <div class="input-group"><span class="icon" aria-hidden="true">attach_money</span><input class="input" type="number" id="s-renta" name="renta" min="0" step="0.01" placeholder="185000"><span class="input-suffix">MXN</span></div>
          </div>
          <div class="field">
            <label class="field-label" for="s-mant">Mantenimiento mensual</label>
            <div class="input-group"><span class="icon" aria-hidden="true">attach_money</span><input class="input" type="number" id="s-mant" name="mantenimiento" min="0" step="0.01" placeholder="12000"><span class="input-suffix">MXN</span></div>
          </div>
          <div class="field">
            <label class="field-label" for="s-dep">Depósito</label>
            <div class="input-group"><input class="input" type="number" id="s-dep" name="deposito" min="0" max="12" placeholder="2"><span class="input-suffix">meses</span></div>
            <p class="field-error">Entre 0 y 12 meses.</p>
          </div>
        </div>
      </div>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn-primary" data-submit>Dar de alta sucursal</button>
    </footer>
  </form>
</dialog>`);

    const f = r.form.elements;
    if (!r.bound) {
      r.bound = true;
      r.syncTipo = () => {
        const own = f.tipo.value === 'Propio';
        f.arrendador.disabled = own;
        f.arrendador.required = !own;
        f.arrendador.placeholder = own ? 'No aplica para inmuebles propios' : 'Nombre o razón social';
        if (own) { f.arrendador.value = ''; f.arrendador.closest('.field').classList.remove('is-invalid'); }
        r.dlg.querySelector('[data-arr-required]').hidden = own;
      };
      r.form.addEventListener('change', (e) => { if (e.target.name === 'tipo') r.syncTipo(); });
      r.form.addEventListener('reset', () => setTimeout(r.syncTipo));
    }

    r.form.reset();
    setText(r, '.modal-title', record ? 'Editar sucursal' : 'Nueva sucursal');
    setText(r, '[data-subtitle]', record ? `Folio ${record.folio}` : 'El folio se genera automáticamente al guardar. Solo los campos con * son obligatorios.');
    setText(r, '[data-submit]', record ? 'Guardar cambios' : 'Dar de alta sucursal');
    if (record) {
      ['nombre', 'num', 'estatus', 'formato', 'empresa', 'propietario', 'pais', 'estado', 'ciudad', 'calle', 'noExt', 'noInt', 'cp', 'colonia', 'coords',
        'cuentaPredial', 'claveCatastral', 'm2', 'm2Terreno', 'precioLista', 'renta', 'mantenimiento', 'deposito']
        .forEach((k) => { if (f[k]) f[k].value = record[k] ?? ''; });
      f.tipo.value = record.tipo;
    }
    r.syncTipo();
    if (record) f.arrendador.value = record.arrendador || '';

    open(r, (v) => {
      const numOrNull = (x) => (x === '' || x == null ? null : Number(x));
      const strOrNull = (x) => (x ?? '').trim() || null;
      onDone({
        nombre: v.nombre.trim(), num: numOrNull(v.num), estatus: strOrNull(v.estatus), formato: v.formato, empresa: v.empresa,
        propietario: strOrNull(v.propietario), tipo: v.tipo, arrendador: (v.arrendador || '').trim(),
        pais: v.pais, estado: v.estado, ciudad: v.ciudad.trim(), calle: strOrNull(v.calle), noExt: strOrNull(v.noExt), noInt: strOrNull(v.noInt), cp: strOrNull(v.cp),
        colonia: strOrNull(v.colonia), coords: strOrNull(v.coords), cuentaPredial: strOrNull(v.cuentaPredial),
        claveCatastral: strOrNull(v.claveCatastral), m2: numOrNull(v.m2), m2Terreno: numOrNull(v.m2Terreno),
        precioLista: numOrNull(v.precioLista), renta: numOrNull(v.renta), mantenimiento: numOrNull(v.mantenimiento), deposito: numOrNull(v.deposito),
      });
    });
  }

  /* =======================================================
     Nueva sucursal en dos pasos (stepper, modal-xl)
     Paso 1 · Datos generales: sucursal, dirección (con mapa) y distribución
     Paso 2 · Tipo: formato, empresa, tipo de inmueble y su respaldo
       Propio → escritura · Tercero → arrendamiento · Mixto → ambos
     Obligatorios: nombre, formato, empresa, tipo y los datos de escritura/arrendamiento
     ======================================================= */
  const STEPS = [
    ['Datos generales', 'Sucursal, dirección y distribución'],
    ['Tipo', 'Formato, tipo y empresa'],
  ];
  const sectionHead = (titulo, desc) => `<div class="form-section-head"><h3 class="form-section-heading">${titulo}</h3><p class="form-section-desc">${desc}</p></div>`;

  // Leaflet (mapa) se carga solo cuando se abre el formulario
  let leaflet;
  const LEAFLET = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4';
  function cargarLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    return (leaflet ??= new Promise((resolve, reject) => {
      const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: `${LEAFLET}/leaflet.min.css` });
      const js = Object.assign(document.createElement('script'), { src: `${LEAFLET}/leaflet.min.js` });
      js.onload = () => resolve(window.L);
      js.onerror = () => { leaflet = null; reject(new Error('Leaflet')); };
      document.head.append(css, js);
    }));
  }
  const MAPA_INICIO = { centro: [25.6866, -100.3161], zoom: 11 }; // Monterrey

  function nuevaSucursal(onDone) {
    const r = mount('m-sucursal-nueva', `
<dialog class="modal modal-xl" id="m-sucursal-nueva" aria-labelledby="m-nueva-title">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-nueva-title">Nueva sucursal</h2>
        <p class="modal-subtitle">Nombre, Formato, Empresa HEB, Tipo y su escritura o arrendamiento son obligatorios; el resto puede completarse después.</p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-stepper">
      <ol class="stepper" aria-label="Pasos del registro">
        ${STEPS.map(([label, desc], i) => `<li class="stepper-step" data-step-item="${i + 1}">
          <button type="button" class="stepper-trigger" data-step-go="${i + 1}">
            <span class="stepper-index">${i + 1}</span>
            <span class="stepper-text"><span class="stepper-label">${label}</span><span class="stepper-desc">${desc}</span></span>
          </button>
        </li>`).join('')}
      </ol>
    </div>
    <div class="modal-body">

      <!-- Paso 1 · Datos generales -->
      <div class="step-panel stack" data-step-panel="1">
        <div class="form-section">
          ${sectionHead('Sucursal', 'Cómo identifica el negocio a esta tienda.')}
          <div class="form-grid">
            <div class="field">
              <label class="field-label" for="n-nombre">Nombre de sucursal ${req}</label>
              <input class="input" id="n-nombre" name="nombre" placeholder="Ej. Cumbres" required>
              <p class="field-error">Escribe el nombre de la sucursal.</p>
            </div>
            <div class="field">
              <label class="field-label" for="n-num">N° de tienda</label>
              <input class="input" type="number" id="n-num" name="num" min="1" placeholder="2045">
              <p class="field-error">Debe ser un número mayor a 0.</p>
            </div>
          </div>
        </div>

        <div class="form-section">
          ${sectionHead('Dirección', 'Ubicación del inmueble.')}
          <div class="form-grid form-grid-3">
            <div class="field field-span-2">
              <label class="field-label" for="n-calle">Calle</label>
              <input class="input" id="n-calle" name="calle" placeholder="Ej. Av. Lázaro Cárdenas">
            </div>
            <div class="field">
              <label class="field-label" for="n-noext">No. ext</label>
              <input class="input" id="n-noext" name="noExt" placeholder="1000">
            </div>
            <div class="field">
              <label class="field-label" for="n-noint">No. int</label>
              <input class="input" id="n-noint" name="noInt" placeholder="Local 4">
            </div>
            <div class="field">
              <label class="field-label" for="n-col">Colonia</label>
              <input class="input" id="n-col" name="colonia" placeholder="Ej. Valle Oriente">
            </div>
            <div class="field">
              <label class="field-label" for="n-cp">Código postal</label>
              <input class="input" id="n-cp" name="cp" inputmode="numeric" pattern="\\d{5}" maxlength="5" placeholder="64610">
              <p class="field-error">Deben ser 5 dígitos.</p>
            </div>
            <div class="field">
              <label class="field-label" for="n-pais">País</label>
              <div class="select-wrap"><select class="select" id="n-pais" name="pais"></select></div>
            </div>
            <div class="field">
              <label class="field-label" for="n-estado">Estado</label>
              <div class="select-wrap"><select class="select" id="n-estado" name="estado"></select></div>
            </div>
            <div class="field">
              <label class="field-label" for="n-ciudad">Ciudad</label>
              <div class="select-wrap"><select class="select" id="n-ciudad" name="ciudad"></select></div>
            </div>
            <div class="field field-full">
              <span class="field-label" id="n-mapa-label">Ubicación en el mapa</span>
              <div class="map-picker" data-map role="application" aria-labelledby="n-mapa-label" aria-describedby="n-mapa-hint">
                <p class="map-picker-status" data-map-status>Cargando mapa…</p>
              </div>
              <input type="hidden" name="coords">
              <p class="field-hint" id="n-mapa-hint" data-map-hint>Haga clic en el mapa para marcar la ubicación del inmueble.</p>
            </div>
          </div>
        </div>

        <div class="form-section">
          ${sectionHead('Distribución', 'Superficies del inmueble.')}
          <div class="form-grid form-grid-3">
            <div class="field">
              <label class="field-label" for="n-m2t">Total de m² del terreno</label>
              <div class="input-group"><input class="input" type="number" id="n-m2t" name="m2Terreno" min="1" step="0.01" placeholder="9000"><span class="input-suffix">m²</span></div>
              <p class="field-error">Debe ser mayor a 0.</p>
            </div>
            <div class="field">
              <label class="field-label" for="n-m2">Total de m² de construcción</label>
              <div class="input-group"><input class="input" type="number" id="n-m2" name="m2" min="1" step="0.01" placeholder="4500"><span class="input-suffix">m²</span></div>
              <p class="field-error">Debe ser mayor a 0.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Paso 2 · Tipo -->
      <div class="step-panel stack" data-step-panel="2" hidden>
        <div class="form-section">
          ${sectionHead('Tipo', 'Formato de la tienda, tipo de inmueble y empresa que la opera.')}
          <div class="form-grid form-grid-3">
            <div class="field">
              <label class="field-label" for="n-formato">Formato ${req}</label>
              <div class="select-wrap"><select class="select" id="n-formato" name="formato" required><option value="">Selecciona…</option>${opts(['HEB', 'Mi Tienda', 'Express', 'CEDIS'])}</select></div>
              <p class="field-error">Elige el formato.</p>
            </div>
            <div class="field field-span-2">
              <label class="field-label" for="n-empresa">Empresa HEB ${req}</label>
              <div class="select-wrap"><select class="select" id="n-empresa" name="empresa" required>${opts([EMPRESA])}</select></div>
              <p class="field-error">Elige la empresa.</p>
            </div>
            <fieldset class="field field-full">
              <legend class="field-label">Tipo de inmueble ${req}</legend>
              <div class="check-group check-group-inline">
                <label class="check"><input type="radio" name="tipo" value="Propio" checked><span>Propio<span class="check-desc">El inmueble es de HEB</span></span></label>
                <label class="check"><input type="radio" name="tipo" value="Tercero"><span>Tercero<span class="check-desc">Se renta a un arrendador</span></span></label>
                <label class="check"><input type="radio" name="tipo" value="Mixto"><span>Mixto<span class="check-desc">Parte propia y parte rentada</span></span></label>
              </div>
            </fieldset>
          </div>
        </div>

        <!-- Propio y Mixto: escritura -->
        <fieldset class="form-section" data-tenencia="escritura">
          ${sectionHead('Escritura', 'Documento con el que HEB adquirió el inmueble.')}
          <div class="form-grid form-grid-3">
            <div class="field">
              <label class="field-label" for="n-acto">Acto jurídico ${req}</label>
              <div class="select-wrap"><select class="select" id="n-acto" name="acto" required>${opts(ACTOS)}</select></div>
            </div>
            <div class="field">
              <label class="field-label" for="n-esc-num">N° de escritura ${req}</label>
              <input class="input" type="number" id="n-esc-num" name="numeroEscritura" min="1" step="1" placeholder="73118" required>
              <p class="field-error">Indica el número de la escritura.</p>
            </div>
            <div class="field">
              <label class="field-label" for="n-esc-fecha">Fecha de celebración ${req}</label>
              <input class="input" type="date" id="n-esc-fecha" name="fechaEscritura" max="${TODAY}" required>
              <p class="field-error">Indica una fecha que no sea futura.</p>
            </div>
            <div class="field">
              <label class="field-label" for="n-notaria">Notaría</label>
              <input class="input" id="n-notaria" name="notaria" placeholder="Ej. Notaría 62, Monterrey">
            </div>
            <div class="field field-span-2">
              <span class="field-label">Escritura escaneada</span>
              ${dropzone('escrituraArchivo', 'PDF, máximo 20 MB', false, 'application/pdf')}
            </div>
          </div>
        </fieldset>

        <!-- Tercero y Mixto: arrendamiento -->
        <fieldset class="form-section" data-tenencia="arrendamiento" hidden disabled>
          ${sectionHead('Arrendamiento', 'Contrato con el arrendador por el inmueble rentado.')}
          <div class="form-grid form-grid-3">
            <div class="field field-span-2">
              <label class="field-label" for="n-arr">Arrendador ${req}</label>
              <input class="input" id="n-arr" name="arrendador" placeholder="Nombre o razón social" required>
              <p class="field-error">Escribe el nombre del arrendador.</p>
            </div>
            <div class="field">
              <label class="field-label" for="n-renta">Renta mensual ${req}</label>
              <div class="input-group"><span class="icon" aria-hidden="true">attach_money</span><input class="input" type="number" id="n-renta" name="renta" min="1" step="0.01" placeholder="185000" required><span class="input-suffix">MXN</span></div>
              <p class="field-error">Indica la renta mensual.</p>
            </div>
            <div class="field">
              <label class="field-label" for="n-con-ini">Inicio de vigencia ${req}</label>
              <input class="input" type="date" id="n-con-ini" name="inicio" required>
              <p class="field-error">Indica la fecha de inicio.</p>
            </div>
            <div class="field">
              <label class="field-label" for="n-con-fin">Fin de vigencia ${req}</label>
              <input class="input" type="date" id="n-con-fin" name="fin" required>
              <p class="field-error">Debe ser posterior al inicio.</p>
            </div>
            <div class="field field-full">
              <span class="field-label">Contrato firmado</span>
              ${dropzone('contratoArchivo', 'PDF, máximo 20 MB', false, 'application/pdf')}
            </div>
          </div>
        </fieldset>
      </div>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary modal-footer-start" data-step-prev><span class="icon" aria-hidden="true">arrow_back</span>Anterior</button>
      <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button type="button" class="btn btn-primary" data-step-next>Siguiente<span class="icon" aria-hidden="true">arrow_forward</span></button>
      <button type="submit" class="btn btn-primary" data-step-submit>Crear sucursal</button>
    </footer>
  </form>
</dialog>`);

    const f = r.form.elements;
    const $ = (sel) => r.dlg.querySelector(sel);
    const GEO = CLETA.GEO;

    if (!r.bound) {
      r.bound = true;
      // Tipo de inmueble → qué se captura: Propio = escritura · Tercero = arrendamiento · Mixto = ambos.
      // El bloque que no aplica se oculta y se desactiva (no se valida ni se envía).
      r.syncTipo = () => {
        const t = f.tipo.value;
        const mostrar = { escritura: t !== 'Tercero', arrendamiento: t !== 'Propio' };
        r.dlg.querySelectorAll('[data-tenencia]').forEach((fs) => {
          const on = mostrar[fs.dataset.tenencia];
          fs.hidden = !on;
          fs.disabled = !on;
          if (!on) fs.querySelectorAll('.field.is-invalid').forEach((x) => x.classList.remove('is-invalid'));
        });
      };
      // Vigencia propuesta del contrato: hoy y por 5 años
      r.fechasContrato = () => {
        f.inicio.value = TODAY;
        f.fin.min = addDays(TODAY, 1);
        f.fin.value = addMonths(TODAY, 60);
      };
      f.inicio.addEventListener('change', () => { if (f.inicio.value) f.fin.min = addDays(f.inicio.value, 1); });

      /* País → Estado → Ciudad (cada uno se habilita al elegir el anterior) */
      const fill = (sel, items, vacio) => {
        sel.innerHTML = items.length ? `<option value="">Selecciona…</option>${opts(items)}` : `<option value="">${vacio}</option>`;
        sel.disabled = !items.length;
      };
      r.syncGeo = (nivel) => {
        if (nivel === 'pais') {
          fill(f.estado, f.pais.value ? Object.keys(GEO[f.pais.value]) : [], 'Selecciona un país primero');
          fill(f.ciudad, [], 'Selecciona un estado primero');
        }
        if (nivel === 'estado') {
          fill(f.ciudad, f.estado.value ? GEO[f.pais.value][f.estado.value].ciudades : [], 'Selecciona un estado primero');
          const geo = f.estado.value && GEO[f.pais.value][f.estado.value];
          if (geo && r.map) r.map.setView(geo.centro, 9);
        }
        if (nivel === 'ciudad' && f.ciudad.value && r.map) r.map.setZoom(11);
      };
      f.pais.addEventListener('change', () => r.syncGeo('pais'));
      f.estado.addEventListener('change', () => r.syncGeo('estado'));
      f.ciudad.addEventListener('change', () => r.syncGeo('ciudad'));

      /* Mapa: clic para marcar la ubicación (guarda "lat, lng" en coords) */
      r.marcar = (latlng) => {
        const L = window.L;
        const css = getComputedStyle(document.documentElement);
        const token = (n) => css.getPropertyValue(n).trim();
        if (!r.marker) r.marker = L.circleMarker(latlng, { radius: 9, color: token('--map-marker-ring'), weight: 3, fillColor: token('--map-marker'), fillOpacity: 1 }).addTo(r.map);
        r.marker.setLatLng(latlng);
        f.coords.value = `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
        $('[data-map-hint]').innerHTML = `Ubicación marcada: <strong>${f.coords.value}</strong> · <button type="button" class="btn-link" data-map-clear>Quitar</button>`;
      };
      r.limpiarMapa = () => {
        r.marker?.remove();
        r.marker = null;
        f.coords.value = '';
        $('[data-map-hint]').textContent = 'Haga clic en el mapa para marcar la ubicación del inmueble.';
        r.map?.setView(MAPA_INICIO.centro, MAPA_INICIO.zoom);
      };
      r.dlg.addEventListener('click', (e) => { if (e.target.closest('[data-map-clear]')) r.limpiarMapa(); });
      r.iniciarMapa = () => cargarLeaflet().then((L) => {
        if (!r.map) {
          $('[data-map-status]')?.remove();
          r.map = L.map($('[data-map]'), { scrollWheelZoom: false }).setView(MAPA_INICIO.centro, MAPA_INICIO.zoom);
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          }).addTo(r.map);
          r.map.on('click', (e) => r.marcar(e.latlng));
        }
        setTimeout(() => r.map.invalidateSize(), 50); // el diálogo acaba de mostrarse
      }).catch(() => {
        const st = $('[data-map-status]');
        if (st) st.textContent = 'No se pudo cargar el mapa. Puedes capturar la ubicación después.';
      });

      r.goTo = (n) => {
        r.step = n;
        r.dlg.querySelectorAll('[data-step-panel]').forEach((p) => { p.hidden = Number(p.dataset.stepPanel) !== n; });
        r.dlg.querySelectorAll('[data-step-item]').forEach((li) => {
          const i = Number(li.dataset.stepItem);
          li.toggleAttribute('aria-current', i === n);
          if (i === n) li.setAttribute('aria-current', 'step');
          li.classList.toggle('is-done', i < n);
          li.querySelector('.stepper-index').innerHTML = i < n ? '<span class="icon" aria-hidden="true">check</span>' : i;
        });
        const last = n === STEPS.length;
        $('[data-step-prev]').hidden = n === 1;
        $('[data-step-next]').hidden = last;
        $('[data-step-submit]').hidden = !last;
        $('.modal-body').scrollTop = 0;
        if (n === 1 && r.map) setTimeout(() => r.map.invalidateSize(), 50);
        r.dlg.querySelector(`[data-step-panel="${n}"] :is(input:not([type="hidden"]), select):not([disabled])`)?.focus();
      };
      // Avanza solo si el paso actual es válido
      r.next = () => {
        if (UI.validate(r.dlg.querySelector(`[data-step-panel="${r.step}"]`))) r.goTo(r.step + 1);
      };

      r.form.addEventListener('change', (e) => { if (e.target.name === 'tipo') r.syncTipo(); });
      r.form.addEventListener('reset', () => setTimeout(() => { r.syncTipo(); r.syncGeo('pais'); r.limpiarMapa(); r.fechasContrato(); }));
      $('[data-step-next]').addEventListener('click', r.next);
      $('[data-step-prev]').addEventListener('click', () => r.goTo(r.step - 1));
      r.dlg.querySelector('.stepper').addEventListener('click', (e) => {
        const n = Number(e.target.closest('[data-step-go]')?.dataset.stepGo);
        if (!n || n === r.step) return;
        n < r.step ? r.goTo(n) : r.next();
      });
      // Enter en el paso 1 avanza en lugar de enviar el formulario
      r.form.addEventListener('submit', (e) => {
        if (r.step < STEPS.length) { e.preventDefault(); e.stopPropagation(); r.next(); }
      });
    }

    r.form.reset();
    f.pais.innerHTML = `<option value="">Selecciona…</option>${opts(Object.keys(GEO))}`;
    r.syncTipo();
    r.syncGeo('pais');
    r.fechasContrato();
    open(r, (v, fd) => {
      const strOrNull = (x) => (x ?? '').trim() || null;
      const archivo = (name) => fd.get(name)?.name || null;
      // Solo llegan los datos del bloque visible (los desactivados no se envían)
      const escritura = v.numeroEscritura ? {
        acto: v.acto, numero: Number(v.numeroEscritura), fecha: v.fechaEscritura, notaria: strOrNull(v.notaria), archivo: archivo('escrituraArchivo'),
      } : null;
      const contrato = v.inicio ? {
        arrendador: v.arrendador.trim(), inicio: v.inicio, fin: v.fin, renta: Number(v.renta), archivo: archivo('contratoArchivo'),
      } : null;
      onDone({
        nombre: v.nombre.trim(), num: v.num ? Number(v.num) : null,
        calle: strOrNull(v.calle), noExt: strOrNull(v.noExt), noInt: strOrNull(v.noInt), colonia: strOrNull(v.colonia), cp: strOrNull(v.cp),
        pais: strOrNull(v.pais), estado: strOrNull(v.estado), ciudad: strOrNull(v.ciudad), coords: strOrNull(v.coords),
        m2Terreno: v.m2Terreno ? Number(v.m2Terreno) : null, m2: v.m2 ? Number(v.m2) : null,
        formato: v.formato, tipo: v.tipo, arrendador: contrato?.arrendador || '', empresa: v.empresa,
        // Se completan después desde el detalle
        estatus: null, propietario: null, cuentaPredial: null, claveCatastral: null,
        precioLista: null, renta: null, mantenimiento: null, deposito: null,
      }, { escritura, contrato });
    });
    r.goTo(1);
    r.iniciarMapa();
  }

  /* =======================================================
     Registrar renovación de contrato (modal-md)
     ======================================================= */
  function renovar(contrato, onDone) {
    const r = mount('m-renovar', `
<dialog class="modal modal-md" id="m-renovar" aria-labelledby="m-renovar-title">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-renovar-title">Registrar renovación</h2>
        <p class="modal-subtitle" data-subtitle></p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-body">
      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="r-ini">Inicio de la nueva vigencia ${req}</label>
          <input class="input" type="date" id="r-ini" name="inicio" required>
          <p class="field-error">Indica la fecha de inicio.</p>
        </div>
        <div class="field">
          <label class="field-label" for="r-fin">Fin de la nueva vigencia ${req}</label>
          <input class="input" type="date" id="r-fin" name="fin" required>
          <p class="field-error">Debe ser posterior al inicio.</p>
        </div>
        <div class="field">
          <label class="field-label" for="r-renta">Renta mensual ${req}</label>
          <div class="input-group"><span class="icon" aria-hidden="true">attach_money</span><input class="input" type="number" id="r-renta" name="renta" min="1" step="0.01" required><span class="input-suffix">MXN</span></div>
          <p class="field-error">Indica la renta mensual.</p>
        </div>
        <fieldset class="field">
          <legend class="field-label">Incremento anual</legend>
          <div class="check-group">
            <label class="check"><input type="radio" name="incremento" value="INPC" checked><span>Indexado al INPC</span></label>
            <label class="check"><input type="radio" name="incremento" value="Fijo"><span>Porcentaje fijo</span></label>
            <label class="check"><input type="radio" name="incremento" value="Ninguno"><span>Sin incremento</span></label>
          </div>
        </fieldset>
        <div class="field field-full">
          <span class="field-label">Contrato firmado <span class="field-optional">(opcional)</span></span>
          ${dropzone('archivo', 'PDF, máximo 20 MB', false, 'application/pdf')}
          <p class="field-hint">Si aún no está firmado, la renovación queda marcada como “Sin documento”.</p>
        </div>
      </div>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn-primary">Registrar renovación</button>
    </footer>
  </form>
</dialog>`);
    const f = r.form.elements;
    if (!r.bound) {
      r.bound = true;
      f.inicio.addEventListener('change', () => { f.fin.min = addDays(f.inicio.value, 1); });
    }
    r.form.reset();
    const s = CLETA.sucursal(contrato.sucursalId);
    const n = CLETA.daysUntil(contrato.fin);
    setText(r, '[data-subtitle]', `${s.nombre} · Arrendador ${contrato.arrendador} · ${n < 0 ? 'venció' : 'vence'} el ${fmtDate(contrato.fin)}`);
    f.inicio.value = addDays(contrato.fin, 1);
    f.fin.min = addDays(f.inicio.value, 1);
    f.fin.value = addDays(contrato.fin, 365 * 5 + 1);
    f.renta.value = contrato.renta;
    open(r, (v, fd) => onDone({ inicio: v.inicio, fin: v.fin, renta: Number(v.renta), incremento: v.incremento, doc: !!fd.get('archivo')?.name }));
  }

  /* =======================================================
     Iniciar renovación desde la bandeja (modal-sm)
     Nueva vigencia (inicio y fin) y monto de la renta
     ======================================================= */
  function iniciarRenovacion(contrato, onDone) {
    const r = mount('m-iniciar-renovacion', `
<dialog class="modal modal-sm-wide" id="m-iniciar-renovacion" aria-labelledby="m-ir-title">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-ir-title">Iniciar renovación</h2>
        <p class="modal-subtitle is-single-line" data-subtitle></p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-body">
      <div class="form-section">
        <p class="form-section-title">Vigencia nueva</p>
        <div class="form-grid">
          <div class="field">
            <label class="field-label" for="ir-ini">Fecha de inicio ${req}</label>
            <input class="input" type="date" id="ir-ini" name="inicio" required>
            <p class="field-error">Indica la fecha de inicio.</p>
          </div>
          <div class="field">
            <label class="field-label" for="ir-fin">Fecha de fin ${req}</label>
            <input class="input" type="date" id="ir-fin" name="fin" required>
            <p class="field-error">Debe ser posterior a la fecha de inicio.</p>
          </div>
        </div>
      </div>
      <div class="field">
        <label class="field-label" for="ir-renta">Monto de la renta mensual ${req}</label>
        <div class="input-group"><span class="icon" aria-hidden="true">attach_money</span><input class="input" type="number" id="ir-renta" name="renta" min="1" step="0.01" required><span class="input-suffix">MXN</span></div>
        <p class="field-hint" data-renta-actual></p>
        <p class="field-error">Indica el monto de la renta.</p>
      </div>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn-primary" data-submit>Iniciar renovación</button>
    </footer>
  </form>
</dialog>`);
    const f = r.form.elements;
    if (!r.bound) {
      r.bound = true;
      f.inicio.addEventListener('change', () => { if (f.inicio.value) f.fin.min = addDays(f.inicio.value, 1); });
    }
    r.form.reset();
    const s = CLETA.sucursal(contrato.sucursalId);
    const n = CLETA.daysUntil(contrato.fin);
    const previa = contrato.renovacion;
    setText(r, '.modal-title', previa ? 'Editar renovación' : 'Iniciar renovación');
    setText(r, '[data-submit]', previa ? 'Guardar cambios' : 'Iniciar renovación');
    setText(r, '[data-subtitle]', `${s.nombre} · Arrendador ${contrato.arrendador} · ${n < 0 ? 'venció' : 'vence'} el ${fmtDate(contrato.fin)}`);
    r.dlg.querySelector('[data-subtitle]').title = r.dlg.querySelector('[data-subtitle]').textContent;
    setText(r, '[data-renta-actual]', `Renta actual: ${CLETA.money(contrato.renta)} al mes.`);
    // Propuesta: continúa al día siguiente del fin actual, por 5 años, con la misma renta
    f.inicio.value = previa?.inicio || addDays(contrato.fin, 1);
    f.fin.min = addDays(f.inicio.value, 1);
    f.fin.value = previa?.fin || CLETA.addMonths(f.inicio.value, 60);
    f.renta.value = previa?.renta ?? contrato.renta;
    open(r, (v) => onDone({ inicio: v.inicio, fin: v.fin, renta: Number(v.renta) }));
  }

  /* =======================================================
     Iniciar trámite de un permiso (modal-sm)
     Responsable (área) y nota. Al confirmar se "envía" un correo
     al área para que mande el documento del permiso (prototipo:
     no sale ningún correo, solo se registra la solicitud).
     ======================================================= */
  const correoArea = (area) => `${area.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '')}@hebmex.com`;
  function iniciarTramite(item, onDone) {
    const r = mount('m-tramite', `
<dialog class="modal modal-sm" id="m-tramite" aria-labelledby="m-tramite-title">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-tramite-title">Iniciar trámite</h2>
        <p class="modal-subtitle" data-subtitle></p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-body">
      <div class="form-grid form-grid-1">
        <div class="field">
          <label class="field-label" for="t-resp">Responsable ${req}</label>
          <div class="select-wrap"><select class="select" id="t-resp" name="responsable" required><option value="">Selecciona el área…</option>${opts(RESPONSABLES)}</select></div>
          <p class="field-hint" data-para>Se enviará un correo al área para que mande el documento.</p>
          <p class="field-error">Elige el área que debe enviar el documento.</p>
        </div>
        <div class="field">
          <label class="field-label" for="t-nota">Nota <span class="field-optional">(opcional)</span></label>
          <textarea class="textarea" id="t-nota" name="nota" placeholder="Ej. Se necesita antes del 15 de noviembre para la inspección."></textarea>
          <p class="field-hint">Va dentro del correo.</p>
        </div>
      </div>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn-primary"><span class="icon" aria-hidden="true">send</span>Iniciar trámite</button>
    </footer>
  </form>
</dialog>`);
    if (!r.paraListo) {
      const para = r.dlg.querySelector('[data-para]');
      r.form.elements.responsable.addEventListener('change', (e) => {
        para.innerHTML = e.target.value
          ? `Se enviará un correo a <strong>${esc(correoArea(e.target.value))}</strong> para que mande el documento.`
          : 'Se enviará un correo al área para que mande el documento.';
      });
      r.form.addEventListener('reset', () => { para.textContent = 'Se enviará un correo al área para que mande el documento.'; });
      r.paraListo = true;
    }
    r.form.reset();
    setText(r, '[data-subtitle]', `${item.titulo} · ${item.sucursal.nombre}`);
    if (item.responsable) {
      r.form.elements.responsable.value = item.responsable;
      r.form.elements.responsable.dispatchEvent(new Event('change'));
    }
    open(r, (v) => onDone({ responsable: v.responsable, correo: correoArea(v.responsable), nota: (v.nota || '').trim() }));
  }

  /* =======================================================
     Marcar local como liberado (confirmación)
     ======================================================= */
  function liberar(contrato, onDone) {
    const r = mount('m-liberar', `
<dialog class="modal modal-sm modal-confirm" id="m-liberar" aria-labelledby="m-liberar-title" aria-describedby="m-liberar-desc">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <span class="modal-confirm-icon" aria-hidden="true"><span class="icon">key_off</span></span>
      <div class="modal-heading">
        <h2 class="modal-title" id="m-liberar-title">¿Marcar el local como liberado?</h2>
        <p class="modal-subtitle" id="m-liberar-desc" data-subtitle></p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-body">
      <div class="form-grid form-grid-1">
        <div class="field">
          <label class="field-label" for="l-fecha">Fecha de entrega del local ${req}</label>
          <input class="input" type="date" id="l-fecha" name="entrega" required>
          <p class="field-error">Indica la fecha de entrega.</p>
        </div>
        <div class="field">
          <label class="field-label" for="l-motivo">Motivo ${req}</label>
          <div class="select-wrap"><select class="select" id="l-motivo" name="motivo" required>
            <option value="">Selecciona…</option>${opts(['Cierre de la sucursal', 'Reubicación', 'Sin acuerdo con el arrendador', 'Otro'])}
          </select></div>
          <p class="field-error">Elige el motivo.</p>
        </div>
      </div>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close autofocus>Cancelar</button>
      <button type="submit" class="btn btn-danger">Marcar como liberado</button>
    </footer>
  </form>
</dialog>`);
    r.form.reset();
    const s = CLETA.sucursal(contrato.sucursalId);
    setText(r, '[data-subtitle]', `El contrato con ${contrato.arrendador} en ${s.nombre} se cerrará y dejará de generar avisos de vencimiento.`);
    r.form.elements.entrega.value = TODAY;
    open(r, (v) => onDone(v));
  }

  /* =======================================================
     Adjuntar documento (modal-sm)
     ======================================================= */
  function adjuntar({ titulo = 'Adjuntar archivo', subtitulo = '', tipos, tipo, vigenciaRequerida = false, multiple = false }, onDone) {
    const r = mount('m-adjuntar', `
<dialog class="modal modal-sm" id="m-adjuntar" aria-labelledby="m-adjuntar-title">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-adjuntar-title">Adjuntar archivo</h2>
        <p class="modal-subtitle" data-subtitle></p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-body">
      <div class="form-grid form-grid-1">
        <div class="field">
          <label class="field-label" for="a-tipo">Tipo de documento ${req}</label>
          <div class="select-wrap"><select class="select" id="a-tipo" name="tipo" required></select></div>
          <p class="field-error">Elige el tipo de documento.</p>
        </div>
        <div class="field">
          <span class="field-label">Archivo ${req}</span>
          ${dropzone('archivo', 'PDF o imagen, máximo 20 MB', true)}
          <p class="field-error">Selecciona un archivo.</p>
        </div>
        <div class="field">
          <label class="field-label" for="a-vig">Vigente hasta <span class="field-optional" data-vig-opcional>(opcional)</span><span class="field-required" data-vig-requerida hidden aria-hidden="true">*</span></label>
          <input class="input" type="date" id="a-vig" name="vigencia">
          <p class="field-error">Indica hasta cuándo es vigente.</p>
        </div>
      </div>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn-primary">Adjuntar</button>
    </footer>
  </form>
</dialog>`);
    r.form.reset();
    setText(r, '.modal-title', titulo);
    setText(r, '[data-subtitle]', subtitulo);
    r.form.elements.tipo.innerHTML = `<option value="">Selecciona…</option>${opts(tipos, tipo)}`;
    const archivoInput = r.dlg.querySelector('input[type="file"]');
    archivoInput.multiple = multiple;
    r.dlg.querySelector('.dropzone strong').textContent = multiple ? 'Sube uno o varios archivos' : 'Sube el archivo';
    r.form.elements.vigencia.required = vigenciaRequerida;
    r.form.elements.vigencia.min = vigenciaRequerida ? addDays(TODAY, 1) : '';
    r.dlg.querySelector('[data-vig-opcional]').hidden = vigenciaRequerida;
    r.dlg.querySelector('[data-vig-requerida]').hidden = !vigenciaRequerida;
    open(r, (v, fd) => {
      const files = fd.getAll('archivo').filter((x) => x?.name);
      onDone({
        tipo: v.tipo, archivo: files[0]?.name || 'documento.pdf', vigencia: v.vigencia || null,
        archivos: files.map((x) => ({ nombre: x.name, tamano: tamano(x.size) })),
      });
    });
  }

  /* =======================================================
     Agregar permiso al expediente (modal-sm-wide)
     tiposPendientes: [{ area, tipos: [nombre] }] para el selector
     ======================================================= */
  const PERIODOS = CLETA.TIPOS_RENOVACION;
  // Alta y edición. Con `permiso` el modal abre lleno y guarda cambios sobre ese registro.
  function permiso({ sucursal: s, tiposPendientes, tipo, permiso: actual = null }, onDone) {
    const r = mount('m-permiso', `
<dialog class="modal modal-md" id="m-permiso" aria-labelledby="m-permiso-title">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-permiso-title">Agregar permiso</h2>
        <p class="modal-subtitle">El permiso o licencia de esta tienda: qué es, quién lo emite, hasta cuándo vale y cómo se renueva.</p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-body">
      <div class="form-grid">
        <div class="info-box field-full">
          <p class="info-box-label">Dirección de la sucursal</p>
          <p class="info-box-value" data-direccion></p>
          <p class="info-box-hint">Viene de la ficha de la sucursal y se edita allá, no aquí: un solo padrón.</p>
        </div>
        <div class="field field-full">
          <label class="field-label" for="pm-tipo">Tipo de permiso ${req}</label>
          <div class="select-wrap"><select class="select" id="pm-tipo" name="tipo" required></select></div>
          <p class="field-error">Elige el tipo de permiso.</p>
        </div>
        <div class="field field-full">
          <label class="field-label" for="pm-dependencia">Dependencia</label>
          <div class="select-wrap"><select class="select" id="pm-dependencia" name="dependencia"></select></div>
          <p class="field-hint" data-dep-hint></p>
        </div>
        <div class="field field-full" data-dep-otra hidden>
          <label class="field-label" for="pm-dep-otra">Otra dependencia <span class="field-required" aria-hidden="true">*</span></label>
          <input class="input" id="pm-dep-otra" name="dependenciaOtra" maxlength="120" placeholder="Nombre de la dependencia que emite el permiso">
          <p class="field-error">Escribe el nombre de la dependencia.</p>
        </div>
        <div class="field">
          <label class="field-label" for="pm-periodo">Tipo de renovación ${req}</label>
          <div class="select-wrap"><select class="select" id="pm-periodo" name="periodo" required><option value="">Selecciona una opción</option>${opts(PERIODOS)}</select></div>
          <p class="field-error">Elige cómo se renueva.</p>
        </div>
        <div class="field" data-anios hidden>
          <label class="field-label" for="pm-anios">Se renueva cada (años) <span class="field-required" aria-hidden="true">*</span></label>
          <input class="input" type="number" id="pm-anios" name="anios" min="1" max="99" step="1" inputmode="numeric" placeholder="Ej. 5">
          <p class="field-error">Indica cada cuántos años se renueva.</p>
        </div>
        <div class="field">
          <label class="field-label" for="pm-fin">Fecha de vigencia <span class="field-required" data-fin-req aria-hidden="true">*</span></label>
          <input class="input" type="date" id="pm-fin" name="fin" required>
          <p class="field-hint" data-fin-hint hidden></p>
          <p class="field-error">Indica hasta cuándo vale.</p>
        </div>
        <div class="field">
          <label class="field-label" for="pm-derechos">Pago de derechos</label>
          <div class="input-group"><span class="input-prefix" aria-hidden="true">$</span><input class="input" type="number" id="pm-derechos" name="pagoDerechos" min="0" step="0.01" inputmode="decimal"></div>
          <p class="field-error">Escribe un monto válido.</p>
        </div>
        <div class="field">
          <label class="field-label" for="pm-honorarios">Pago de honorarios</label>
          <div class="input-group"><span class="input-prefix" aria-hidden="true">$</span><input class="input" type="number" id="pm-honorarios" name="pagoHonorarios" min="0" step="0.01" inputmode="decimal"></div>
          <p class="field-error">Escribe un monto válido.</p>
        </div>
        <div class="field field-full">
          <span class="field-label">Documentos <span class="field-optional">(opcional)</span></span>
          <label class="dropzone">
            <span class="icon" aria-hidden="true">upload_file</span>
            <span><strong>Sube uno o varios archivos</strong> o arrástralos aquí</span>
            <span class="caption">PDF o imagen, máximo 20 MB cada uno</span>
            <input type="file" data-pm-archivos accept="application/pdf,image/*" multiple class="sr-only">
          </label>
          <ul class="file-picked" data-pm-lista aria-live="polite"></ul>
        </div>
      </div>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn-primary" data-submit>Agregar permiso</button>
    </footer>
  </form>
</dialog>`);
    const f = r.form.elements;
    if (!r.bound) {
      r.bound = true;
      // No aplica y Única ocasión: sin fecha de vigencia. Otra: pide cada cuántos años.
      r.syncPeriodo = () => {
        const sinVig = CLETA.SIN_VIGENCIA.includes(f.periodo.value);
        f.fin.disabled = sinVig;
        f.fin.required = !sinVig;
        if (sinVig) { f.fin.value = ''; f.fin.closest('.field').classList.remove('is-invalid'); }
        r.dlg.querySelector('[data-fin-req]').hidden = sinVig;
        const hint = r.dlg.querySelector('[data-fin-hint]');
        hint.hidden = !sinVig;
        hint.textContent = f.periodo.value === 'No aplica'
          ? 'No aplica para esta tienda: no lleva vigencia ni genera avisos.'
          : 'Se emite una sola vez: no vence ni genera avisos.';
        const otra = f.periodo.value === 'Otra';
        r.dlg.querySelector('[data-anios]').hidden = !otra;
        f.anios.required = otra;
        if (!otra) { f.anios.value = ''; f.anios.closest('.field').classList.remove('is-invalid'); }
      };
      f.periodo.addEventListener('change', r.syncPeriodo);
      // Dependencia "Otra": abre un campo para capturarla
      r.syncDependencia = () => {
        const otra = f.dependencia.value === 'Otra';
        r.dlg.querySelector('[data-dep-otra]').hidden = !otra;
        f.dependenciaOtra.required = otra;
        if (!otra) { f.dependenciaOtra.value = ''; f.dependenciaOtra.closest('.field').classList.remove('is-invalid'); }
        else f.dependenciaOtra.focus();
      };
      f.dependencia.addEventListener('change', r.syncDependencia);
      r.form.addEventListener('reset', () => setTimeout(() => { r.syncPeriodo(); r.syncDependencia(); r.archivos = []; r.pintarArchivos(); }));
      // Documentos: se acumulan entre selecciones; cada uno se puede quitar
      r.archivos = [];
      const input = r.dlg.querySelector('[data-pm-archivos]');
      const lista = r.dlg.querySelector('[data-pm-lista]');
      r.pintarArchivos = () => {
        lista.innerHTML = r.archivos.map((a, i) => `<li>
          <span class="icon" aria-hidden="true">${a.type?.startsWith('image/') ? 'image' : 'picture_as_pdf'}</span>
          <span class="file-picked-name" title="${esc(a.name)}">${esc(a.name)}</span>
          <span class="file-picked-size">${tamano(a.size)}</span>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" data-quitar="${i}" aria-label="Quitar ${esc(a.name)}"><span class="icon" aria-hidden="true">close</span></button>
        </li>`).join('');
        input.closest('.dropzone').classList.toggle('has-file', r.archivos.length > 0);
      };
      input.addEventListener('change', () => {
        const nuevos = [...input.files].filter((x) => !r.archivos.some((a) => a.name === x.name && a.size === x.size));
        r.archivos.push(...nuevos);
        input.value = '';
        r.pintarArchivos();
      });
      lista.addEventListener('click', (e) => {
        const b = e.target.closest('[data-quitar]');
        if (!b) return;
        r.archivos.splice(Number(b.dataset.quitar), 1);
        r.pintarArchivos();
      });
    }
    r.form.reset();
    // Dirección completa desde la ficha de la sucursal (solo lectura)
    const calle = [s.calle, s.noExt, s.noInt ? `int. ${s.noInt}` : ''].filter(Boolean).join(' ');
    const direccion = [calle, s.colonia, s.cp, s.ciudad, s.estado, s.pais].filter(Boolean).join(', ');
    const dir = r.dlg.querySelector('[data-direccion]');
    dir.textContent = s.calle ? direccion : `Sin calle capturada · ${CLETA.lugar(s)}`;
    dir.classList.toggle('is-missing', !s.calle);
    // En edición, el tipo actual se suma a su área para poder conservarlo o cambiarlo por otro pendiente
    const grupos = actual
      ? (tiposPendientes.some((g) => g.area === actual.area) ? tiposPendientes : [...tiposPendientes, { area: actual.area, tipos: [] }])
        .map((g) => (g.area === actual.area ? { area: g.area, tipos: [actual.nombre, ...g.tipos] } : g))
      : tiposPendientes;
    const elegido = actual ? actual.nombre : tipo;
    f.tipo.innerHTML = '<option value="">Selecciona…</option>' + grupos
      .map((g) => `<optgroup label="${esc(g.area)}">${g.tipos.map((t) => `<option ${t === elegido ? 'selected' : ''}>${esc(t)}</option>`).join('')}</optgroup>`).join('');
    setText(r, '.modal-title', actual ? 'Editar permiso' : 'Agregar permiso');
    setText(r, '[data-submit]', actual ? 'Guardar cambios' : 'Agregar permiso');
    // Dependencias (Excel de la HU02) + "Otra" con captura libre
    const deps = CLETA.DEPENDENCIAS;
    f.dependencia.innerHTML = `<option value="">Selecciona la dependencia</option>${opts(deps)}<option value="Otra">Otra</option>`;
    r.dlg.querySelector('[data-dep-hint]').textContent = 'Quién emite el permiso. Si no está en la lista, elige “Otra”.';
    f.fin.min = ''; // se aceptan fechas pasadas: un permiso ya vencido también se captura
    if (actual) {
      const cada = /^Renovación cada (\d+) años?$/.exec(actual.periodo || '');
      f.periodo.value = cada ? 'Otra' : actual.periodo || '';
      if (cada) f.anios.value = cada[1];
      f.fin.value = actual.fin || '';
      if (actual.dependencia) {
        if (deps.includes(actual.dependencia)) f.dependencia.value = actual.dependencia;
        else { f.dependencia.value = 'Otra'; f.dependenciaOtra.value = actual.dependencia; }
      }
      f.pagoDerechos.value = actual.pagoDerechos ?? '';
      f.pagoHonorarios.value = actual.pagoHonorarios ?? '';
    }
    r.syncPeriodo();
    r.dlg.querySelector('[data-dep-otra]').hidden = f.dependencia.value !== 'Otra';
    f.dependenciaOtra.required = f.dependencia.value === 'Otra';
    open(r, (v) => {
      const area = grupos.find((g) => g.tipos.includes(v.tipo))?.area || '';
      const monto = (x) => (x === '' || x == null ? null : Number(x));
      const anios = Number(v.anios);
      const periodo = v.periodo === 'Otra' ? `Renovación cada ${anios} ${anios === 1 ? 'año' : 'años'}` : v.periodo;
      onDone({
        nombre: v.tipo, area, periodo, fin: CLETA.SIN_VIGENCIA.includes(v.periodo) ? null : v.fin,
        dependencia: v.dependencia === 'Otra' ? (v.dependenciaOtra || '').trim() || null : v.dependencia || null, pagoDerechos: monto(v.pagoDerechos), pagoHonorarios: monto(v.pagoHonorarios),
        archivos: r.archivos.map((a) => ({ nombre: a.name, tamano: tamano(a.size) })),
      });
    });
  }

  /* =======================================================
     Confirmación genérica (acciones destructivas)
     ======================================================= */
  function confirmar({ titulo, texto, accion = 'Eliminar', icon = 'delete' }, onDone) {
    const r = mount('m-confirmar', `
<dialog class="modal modal-sm modal-confirm" id="m-confirmar" aria-labelledby="m-confirmar-title" aria-describedby="m-confirmar-desc">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <span class="modal-confirm-icon" aria-hidden="true"><span class="icon" data-icon>delete</span></span>
      <div class="modal-heading">
        <h2 class="modal-title" id="m-confirmar-title"></h2>
        <p class="modal-subtitle" id="m-confirmar-desc" data-subtitle></p>
      </div>
      ${closeBtn}
    </header>
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close autofocus>Cancelar</button>
      <button type="submit" class="btn btn-danger" data-submit>Eliminar</button>
    </footer>
  </form>
</dialog>`);
    setText(r, '.modal-title', titulo);
    setText(r, '[data-subtitle]', texto);
    setText(r, '[data-submit]', accion);
    setText(r, '[data-icon]', icon);
    open(r, () => onDone());
  }

  /* =======================================================
     Habilitar sucursal en Permisos y licencias (modal-md)
     Elige una sucursal registrada en Sucursales que aún no está
     habilitada y captura su perfil de permisos.
     ======================================================= */
  function habilitar(onDone) {
    const r = mount('m-habilitar', `
<dialog class="modal modal-md" id="m-habilitar" aria-labelledby="m-habilitar-title">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-habilitar-title">Habilitar sucursal</h2>
        <p class="modal-subtitle">La sucursal aparece en Permisos y licencias desde que se habilita. Su perfil decide qué permisos le aplican.</p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-body">
      <div class="form-grid">
        <div class="field field-full">
          <label class="field-label" for="h-sucursal">Sucursal ${req}</label>
          <div class="select-wrap"><select class="select" id="h-sucursal" name="sucursal" required></select></div>
          <p class="field-hint" data-sin-sucursales hidden>Todas las sucursales registradas ya están habilitadas. Registra una nueva en Sucursales.</p>
          <p class="field-error">Elige la sucursal que vas a habilitar.</p>
        </div>
        <div class="field">
          <label class="check"><input type="checkbox" name="restaurante"><span>Restaurante<span class="check-desc" data-restaurante-desc></span></span></label>
        </div>
        <div class="field">
          <label class="check"><input type="checkbox" name="licenciaSanitaria"><span>Licencia sanitaria</span></label>
        </div>
        <div class="field">
          <label class="check"><input type="checkbox" name="ampliacionHorario"><span>Ampliación de horario</span></label>
        </div>
        <div class="field">
          <label class="field-label" for="h-alcohol">Tipo de licencia de alcohol</label>
          <div class="select-wrap"><select class="select" id="h-alcohol" name="alcohol">${opts(CLETA.TIPOS_ALCOHOL)}</select></div>
        </div>
        <div class="field">
          <label class="field-label" for="h-pc">Tipo de protección civil</label>
          <div class="select-wrap"><select class="select" id="h-pc" name="proteccionCivil"><option value="">Selecciona el alcance</option>${opts(CLETA.ALCANCES_PC)}</select></div>
        </div>
        <div class="field">
          <label class="field-label" for="h-catastral">Expediente catastral</label>
          <input class="input" id="h-catastral" name="expedienteCatastral">
          <p class="field-hint">Distinto de la clave catastral de la escritura o el arrendamiento, hasta que Legal confirme si son lo mismo.</p>
        </div>
        <div class="field">
          <label class="field-label" for="h-asesor">Asesor externo</label>
          <input class="input" id="h-asesor" name="asesorExterno">
        </div>
        <div class="field">
          <label class="field-label" for="h-presidente">Presidente municipal</label>
          <input class="input" id="h-presidente" name="presidenteMunicipal">
          <p class="field-hint">Es del municipio y cambia cada tres años; aquí se repite por tienda mientras el negocio no diga otra cosa.</p>
        </div>
      </div>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn-primary">Habilitar sucursal</button>
    </footer>
  </form>
</dialog>`);
    r.form.reset();
    const pendientes = CLETA.sinHabilitar().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const sel = r.form.elements.sucursal;
    sel.innerHTML = `<option value="">Selecciona la sucursal</option>${pendientes.map((x) => `<option value="${x.id}">${esc(x.nombre)} · ${esc(CLETA.lugar(x, true))}</option>`).join('')}`;
    sel.disabled = !pendientes.length;
    r.dlg.querySelector('[data-sin-sucursales]').hidden = !!pendientes.length;
    r.dlg.querySelector('button[type="submit"]').disabled = !pendientes.length;
    const extra = CATALOGO_PERMISOS.flatMap((g) => g.tipos).filter((t) => t.restaurante).length;
    const numero = ['cero', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'][extra] || extra;
    r.dlg.querySelector('[data-restaurante-desc]').textContent = `Con restaurante ${extra === 1 ? 'aplica un tipo más' : `aplican ${numero} tipos más`}. Quitarlo no borra los permisos ya capturados.`;
    open(r, (v, fd) => onDone({
      sucursalId: Number(v.sucursal),
      perfil: {
        restaurante: fd.has('restaurante'), licenciaSanitaria: fd.has('licenciaSanitaria'), ampliacionHorario: fd.has('ampliacionHorario'),
        alcohol: v.alcohol, proteccionCivil: v.proteccionCivil,
        expedienteCatastral: v.expedienteCatastral.trim(), asesorExterno: v.asesorExterno.trim(), presidenteMunicipal: v.presidenteMunicipal.trim(),
      },
    }));
  }

  /* =======================================================
     Perfil de la tienda → checklist de permisos (modal-md)
     ======================================================= */
  const PERFIL = [
    ['Restaurante', 'Licencia de funcionamiento y Protección Civil de restaurante'],
    ['Venta de alcohol', 'Licencia de venta de bebidas alcohólicas'],
    ['Farmacia', 'Aviso de funcionamiento y responsable sanitario'],
    ['Horario ampliado', 'Permiso de operación nocturna'],
    ['Gasolinera', 'Permiso de la CRE y dictamen de seguridad'],
    ['Estacionamiento', 'Licencia de estacionamiento público'],
  ];
  function perfil(s, onDone) {
    const r = mount('m-perfil', `
<dialog class="modal modal-md" id="m-perfil" aria-labelledby="m-perfil-title">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-perfil-title">Perfil de permisos</h2>
        <p class="modal-subtitle" data-subtitle></p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-body">
      <fieldset class="field">
        <legend class="field-label">¿Qué opera en esta sucursal?</legend>
        <div class="check-group">
          ${PERFIL.map(([k, d]) => `<label class="check"><input type="checkbox" name="perfil" value="${k}"><span>${k}<span class="check-desc">${d}</span></span></label>`).join('')}
        </div>
      </fieldset>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn-primary">Guardar perfil</button>
    </footer>
  </form>
</dialog>`);
    r.form.reset();
    setText(r, '[data-subtitle]', `${s.nombre}: el perfil define qué tipos de permiso le aplican.`);
    (s.perfil || []).forEach((p) => { const c = r.form.querySelector(`input[name="perfil"][value="${p}"]`); if (c) c.checked = true; });
    open(r, (v, fd) => onDone({ perfil: fd.getAll('perfil') }));
  }

  /* =======================================================
     Configurar avisos de vencimiento (modal-sm)
     ======================================================= */
  function avisos(current, onDone) {
    const r = mount('m-avisos', `
<dialog class="modal modal-sm" id="m-avisos" aria-labelledby="m-avisos-title">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-avisos-title">Configurar avisos</h2>
        <p class="modal-subtitle">Cuándo y a quién avisamos antes de un vencimiento.</p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-body">
      <fieldset class="field">
        <legend class="field-label">Avisar antes del fin de vigencia</legend>
        <div class="check-group check-group-inline">
          ${Object.entries(CLETA.AVISO_LABEL).sort((a, b) => b[0] - a[0]).map(([d, l]) => `<label class="check"><input type="checkbox" name="dias" value="${d}"><span>${l}</span></label>`).join('')}
        </div>
      </fieldset>
      <fieldset class="field">
        <legend class="field-label">Enviar a</legend>
        <div class="check-group">
          ${['Jefatura de Legal', 'Gerencia Legal Corporativa', 'Subdirección de BR'].map((x) => `<label class="check"><input type="checkbox" name="a" value="${x}" checked><span>${x}</span></label>`).join('')}
          <label class="check"><input type="checkbox" name="a" value="responsable"><span>Responsable asignado</span></label>
        </div>
      </fieldset>
      <label class="switch"><input type="checkbox" name="resumen" checked>Resumen semanal por correo los lunes</label>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn-primary">Guardar avisos</button>
    </footer>
  </form>
</dialog>`);
    r.form.reset();
    r.form.querySelectorAll('input[name="dias"]').forEach((c) => { c.checked = current.includes(Number(c.value)); });
    open(r, (v, fd) => onDone(fd.getAll('dias').map(Number).sort((a, b) => b - a)));
  }

  /* =======================================================
     Nuevo contrato de arrendamiento (modal-md)
     ======================================================= */
  function contrato(s, onDone) {
    const r = mount('m-contrato', `
<dialog class="modal modal-md" id="m-contrato" aria-labelledby="m-contrato-title">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-contrato-title">Agregar contrato</h2>
        <p class="modal-subtitle" data-subtitle></p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-body">
      <div class="form-grid">
        <div class="field field-full">
          <label class="field-label" for="c-arr">Arrendador ${req}</label>
          <input class="input" id="c-arr" name="arrendador" placeholder="Nombre o razón social" required>
          <p class="field-error">Escribe el nombre del arrendador.</p>
        </div>
        <div class="field">
          <label class="field-label" for="c-ini">Inicio de vigencia ${req}</label>
          <input class="input" type="date" id="c-ini" name="inicio" required>
          <p class="field-error">Indica la fecha de inicio.</p>
        </div>
        <div class="field">
          <label class="field-label" for="c-fin">Fin de vigencia ${req}</label>
          <input class="input" type="date" id="c-fin" name="fin" required>
          <p class="field-error">Debe ser posterior al inicio.</p>
        </div>
        <div class="field field-full">
          <label class="field-label" for="c-renta">Renta mensual ${req}</label>
          <div class="input-group"><span class="icon" aria-hidden="true">attach_money</span><input class="input" type="number" id="c-renta" name="renta" min="1" step="0.01" required><span class="input-suffix">MXN</span></div>
          <p class="field-error">Indica la renta mensual.</p>
        </div>
        <div class="field field-full">
          <span class="field-label">Contrato firmado <span class="field-optional">(opcional)</span></span>
          ${dropzone('archivo', 'PDF, máximo 20 MB', false, 'application/pdf')}
        </div>
      </div>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn-primary">Agregar contrato</button>
    </footer>
  </form>
</dialog>`);
    const f = r.form.elements;
    if (!r.bound) {
      r.bound = true;
      f.inicio.addEventListener('change', () => { f.fin.min = addDays(f.inicio.value, 1); });
    }
    r.form.reset();
    setText(r, '[data-subtitle]', `${s.nombre} · ${s.ciudad}, ${s.estado}`);
    f.arrendador.value = s.arrendador || '';
    f.inicio.value = TODAY;
    f.fin.min = addDays(TODAY, 1);
    f.fin.value = addDays(TODAY, 365 * 5);
    open(r, (v, fd) => onDone({ arrendador: v.arrendador.trim(), inicio: v.inicio, fin: v.fin, renta: Number(v.renta), doc: !!fd.get('archivo')?.name }));
  }

  /* =======================================================
     Escritura del inmueble propio: alta y edición (modal-md)
     ======================================================= */
  const ACTOS = ['Compraventa', 'Aportación', 'Donación', 'Permuta', 'Fusión de predios', 'Adjudicación'];
  function escritura(s, record, onDone) {
    const r = mount('m-escritura', `
<dialog class="modal modal-md" id="m-escritura" aria-labelledby="m-escritura-title">
  <form class="modal-form" novalidate>
    <header class="modal-header">
      <div class="modal-heading">
        <h2 class="modal-title" id="m-escritura-title">Agregar escritura</h2>
        <p class="modal-subtitle" data-subtitle></p>
      </div>
      ${closeBtn}
    </header>
    <div class="modal-body">
      <div class="form-grid">
        <div class="field">
          <label class="field-label" for="e-acto">Acto jurídico ${req}</label>
          <div class="select-wrap"><select class="select" id="e-acto" name="acto" required>${opts(ACTOS)}</select></div>
        </div>
        <div class="field">
          <label class="field-label" for="e-num">N° de escritura ${req}</label>
          <input class="input" type="number" id="e-num" name="numero" min="1" step="1" placeholder="73118" required>
          <p class="field-error">Indica el número de la escritura.</p>
        </div>
        <div class="field">
          <label class="field-label" for="e-fecha">Fecha de celebración ${req}</label>
          <input class="input" type="date" id="e-fecha" name="fecha" max="${TODAY}" required>
          <p class="field-error">Indica una fecha que no sea futura.</p>
        </div>
        <div class="field">
          <label class="field-label" for="e-notaria">Notaría <span class="field-optional">(opcional)</span></label>
          <input class="input" id="e-notaria" name="notaria" placeholder="Ej. Notaría 62, Monterrey">
        </div>
        <div class="field field-full" data-escritura-archivo>
          <span class="field-label">Escritura escaneada <span class="field-optional">(opcional)</span></span>
          ${dropzone('archivo', 'PDF, máximo 20 MB', false, 'application/pdf')}
        </div>
      </div>
    </div>
    <footer class="modal-footer">
      <button type="button" class="btn btn-secondary" data-modal-close>Cancelar</button>
      <button type="submit" class="btn btn-primary" data-submit>Agregar escritura</button>
    </footer>
  </form>
</dialog>`);
    const f = r.form.elements;
    r.form.reset();
    setText(r, '.modal-title', record ? 'Editar escritura' : 'Agregar escritura');
    setText(r, '[data-submit]', record ? 'Guardar cambios' : 'Agregar escritura');
    setText(r, '[data-subtitle]', `${s.nombre} · ${s.ciudad}, ${s.estado}`);
    r.dlg.querySelector('[data-escritura-archivo]').hidden = !!record; // al editar, los archivos se adjuntan desde la tarjeta
    if (record) ['acto', 'numero', 'fecha', 'notaria'].forEach((k) => { f[k].value = record[k] ?? ''; });
    open(r, (v, fd) => onDone({
      acto: v.acto, numero: Number(v.numero), fecha: v.fecha, notaria: (v.notaria || '').trim() || null,
      archivo: record ? null : fd.get('archivo')?.name || null,
    }));
  }

  return { sucursal, nuevaSucursal, iniciarRenovacion, permiso, confirmar, renovar, iniciarTramite, liberar, adjuntar, perfil, avisos, contrato, escritura, PERFIL, cargarLeaflet, habilitar };
})();
