/* =========================================================
   data.js — modelo de datos del prototipo BRS
   Sucursales, contratos y permisos de ejemplo + utilidades
   de formato. Los cambios se guardan en sessionStorage para
   que se vean entre pantallas; se pierden al cerrar la pestaña.
   Reiniciar: CLETA.reset() en la consola.
   ========================================================= */

window.CLETA = (() => {
  const TODAY = '2026-10-06';
  const EMPRESA = 'SUPERMERCADOS INTERNACIONALES HEB';
  const STORE_KEY = 'cleta-prototipo-v6';

  const ESTADOS = ['Aguascalientes', 'Coahuila', 'Estado de México', 'Guanajuato', 'Nuevo León', 'Querétaro', 'San Luis Potosí', 'Tamaulipas'];

  // Catálogo de ubicaciones: país → estado → { centro del mapa, ciudades }
  const GEO = {
    'México': {
      'Aguascalientes':   { centro: [21.8853, -102.2916], ciudades: ['Aguascalientes', 'Jesús María'] },
      'Coahuila':         { centro: [25.4232, -101.0053], ciudades: ['Saltillo', 'Torreón', 'Ramos Arizpe', 'Monclova'] },
      'Estado de México': { centro: [19.2826, -99.6557], ciudades: ['Tultepec', 'Toluca', 'Naucalpan', 'Tlalnepantla'] },
      'Guanajuato':       { centro: [21.1250, -101.6860], ciudades: ['León', 'Celaya', 'Irapuato'] },
      'Nuevo León':       { centro: [25.6866, -100.3161], ciudades: ['Monterrey', 'San Pedro Garza García', 'San Nicolás de los Garza', 'Guadalupe', 'Apodaca', 'General Escobedo', 'Santa Catarina', 'Ciudad Benito Juárez'] },
      'Querétaro':        { centro: [20.5888, -100.3899], ciudades: ['Querétaro', 'El Marqués', 'Corregidora'] },
      'San Luis Potosí':  { centro: [22.1565, -100.9855], ciudades: ['San Luis Potosí', 'Soledad de Graciano Sánchez'] },
      'Tamaulipas':       { centro: [25.8690, -97.5027], ciudades: ['Reynosa', 'Matamoros', 'Nuevo Laredo'] },
    },
    'Estados Unidos': {
      'Texas': { centro: [29.4241, -98.4936], ciudades: ['San Antonio', 'Houston', 'Austin', 'Laredo'] },
    },
  };
  const RESPONSABLES = ['Legal', 'Inmobiliaria', 'Jurídico', 'Prevención y Pérdidas', 'Mantenimiento'];
  const GESTION = { 'sin-iniciar': 'Gestión sin iniciar', 'en-proceso': 'Gestión en proceso', 'renovado': 'Renovado' };

  /* ---------- Generación determinista ---------- */
  function build() {
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const hex = (n) => Array.from({ length: n }, () => Math.floor(rand() * 16).toString(16)).join('');
    const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[Math.floor(rand() * 4)]}${hex(3)}-${hex(12)}`;

    // [nombre, estado, ciudad, tipo, arrendador]
    const SEED = [
      ['Aguascalientes I', 'Aguascalientes', 'Aguascalientes', 'Propio'],
      ['Aguascalientes II Maestros', 'Aguascalientes', 'Aguascalientes', 'Propio'],
      ['Antonio Narro', 'Coahuila', 'Saltillo', 'Propio'],
      ['Anzures', 'Nuevo León', 'Ciudad Benito Juárez', 'Tercero', 'Kalos'],
      ['Aztlán', 'Nuevo León', 'Monterrey', 'Tercero', 'M. Zapata'],
      ['Bernardo Quintana', 'Querétaro', 'Querétaro', 'Propio'],
      ['Cabezada', 'Nuevo León', 'Monterrey', 'Tercero', 'C. Ibarra'],
      ['CAT MTY', 'Nuevo León', 'Apodaca', 'Propio'],
      ['CAT TULTEPEC', 'Estado de México', 'Tultepec', 'Tercero'],
      ['Cerradas de Anáhuac', 'Nuevo León', 'General Escobedo', 'Tercero'],
      ['Chapultepec', 'Nuevo León', 'Monterrey', 'Propio'],
      ['Chipinque', 'Nuevo León', 'San Pedro Garza García', 'Tercero', 'Santa María'],
      ['Ciudadela', 'Nuevo León', 'Guadalupe', 'Tercero', 'J. Treviño'],
      ['Colosio', 'Coahuila', 'Saltillo', 'Tercero'],
      ['Concordia', 'Nuevo León', 'Apodaca', 'Tercero', 'U-CALLI'],
      ['Contry', 'Nuevo León', 'Monterrey', 'Mixto', 'R. Menchaca'],
      ['Corporativo Obispado', 'Nuevo León', 'Monterrey', 'Tercero'],
      ['Cumbres', 'Nuevo León', 'Monterrey', 'Tercero', 'Viber'],
      ['Cumbres II (Puerta de Hierro)', 'Nuevo León', 'Monterrey', 'Propio'],
      ['Cumbres III (Bosques de las Lomas)', 'Nuevo León', 'Monterrey', 'Tercero'],
      ['Diego Díaz', 'Nuevo León', 'San Nicolás de los Garza', 'Tercero'],
      ['EFC Aarón Sáenz', 'Nuevo León', 'Monterrey', 'Propio'],
      ['Gonzalitos', 'Nuevo León', 'Monterrey', 'Propio'],
      ['Guadalupe Centro', 'Nuevo León', 'Guadalupe', 'Tercero', 'L. Garza'],
      ['Juriquilla', 'Querétaro', 'Querétaro', 'Tercero', 'Grupo Terra Bajío'],
      ['La Fe', 'Nuevo León', 'San Nicolás de los Garza', 'Propio'],
      ['Las Puentes', 'Nuevo León', 'San Nicolás de los Garza', 'Mixto', 'Plazas del Norte'],
      ['Leones', 'Nuevo León', 'Monterrey', 'Propio'],
      ['Linda Vista', 'Nuevo León', 'Guadalupe', 'Tercero', 'Kalos'],
      ['Lincoln', 'Nuevo León', 'Monterrey', 'Propio'],
      ['Mitras', 'Nuevo León', 'Monterrey', 'Tercero', 'A. Villarreal'],
      ['Nogalar', 'Nuevo León', 'San Nicolás de los Garza', 'Propio'],
      ['Paseo San Pedro', 'Nuevo León', 'San Pedro Garza García', 'Tercero', 'Inmobiliaria Regia'],
      ['Revolución', 'Nuevo León', 'Monterrey', 'Propio'],
      ['Saltillo V. Carranza', 'Coahuila', 'Saltillo', 'Tercero', 'M. Zapata'],
      ['San Francisco', 'Nuevo León', 'Monterrey', 'Tercero'],
      ['San Jerónimo', 'Nuevo León', 'Monterrey', 'Propio'],
      ['San Luis Carranza', 'San Luis Potosí', 'San Luis Potosí', 'Tercero', 'Patrimonio Lomas'],
      ['Santa Catarina', 'Nuevo León', 'Santa Catarina', 'Propio'],
      ['Sendero', 'Nuevo León', 'San Nicolás de los Garza', 'Mixto', 'Sendero Plazas'],
      ['Torreón Independencia', 'Coahuila', 'Torreón', 'Tercero', 'R. Menchaca'],
      ['Universidad', 'Nuevo León', 'San Nicolás de los Garza', 'Propio'],
      ['Valle Oriente', 'Nuevo León', 'San Pedro Garza García', 'Tercero', 'Inmobiliaria Regia'],
      ['Vasconcelos', 'Nuevo León', 'San Pedro Garza García', 'Propio'],
      ['Zaragoza', 'Nuevo León', 'Monterrey', 'Tercero', 'U-CALLI'],
      ['León Campestre', 'Guanajuato', 'León', 'Tercero', 'Grupo Terra Bajío'],
    ];
    // Sucursales sin número de tienda capturado (fichas incompletas)
    const SIN_NUMERO = ['Anzures', 'Cerradas de Anáhuac', 'Colosio', 'Corporativo Obispado', 'San Francisco', 'Diego Díaz'];

    const sucursales = SEED.map(([nombre, estado, ciudad, tipo, arrendador], i) => {
      const cedis = nombre.startsWith('CAT');
      const completa = tipo === 'Propio' && i % 3 === 0; // algunas fichas completas
      return {
        id: i + 1,
        folio: uuid(),
        num: SIN_NUMERO.includes(nombre) ? null : 2000 + Math.floor(rand() * 900),
        nombre,
        formato: cedis ? 'CEDIS' : nombre.startsWith('EFC') ? 'Express' : 'HEB',
        estatus: completa ? 'Operando' : null,
        empresa: EMPRESA,
        propietario: completa ? 'Inmobiliaria HEB' : null,
        tipo,
        arrendador: arrendador || '',
        pais: 'México',
        estado,
        ciudad,
        cp: completa ? String(64000 + Math.floor(rand() * 900)) : null,
        calle: completa ? 'Av. Principal' : null,
        noExt: completa ? String(100 + Math.floor(rand() * 900)) : null,
        noInt: null,
        colonia: completa ? 'Centro' : null,
        coords: completa ? '25.6866, -100.3161' : null,
        cuentaPredial: completa ? `${hex(2).toUpperCase()}-${Math.floor(rand() * 90000 + 10000)}` : null,
        claveCatastral: completa ? `${Math.floor(rand() * 900 + 100)}-${Math.floor(rand() * 900 + 100)}-${Math.floor(rand() * 90 + 10)}` : null,
        m2: nombre === 'Anzures' ? null : cedis ? 35000 + Math.round(rand() * 12000 / 50) * 50 : nombre.startsWith('EFC') ? 1200 : 1800 + Math.round(rand() * 6000 / 50) * 50,
        m2Terreno: completa ? 9000 + Math.round(rand() * 6000 / 50) * 50 : null,
        precioLista: completa ? 38 + Math.round(rand() * 20) : null,
        renta: null,
        mantenimiento: null,
        deposito: null,
        perfil: null,
        creado: { por: 'seed@hebmex.com', fecha: '2026-09-17T15:13' },
        historial: [],
        documentos: [],
        escrituras: [],
      };
    });
    const byName = (n) => sucursales.find((s) => s.nombre === n);

    /* ---------- Escrituras (inmuebles propios y mixtos) ---------- */
    // Cada cuarto inmueble propio aún no tiene su escritura capturada
    const ACTOS = ['Compraventa', 'Compraventa', 'Aportación', 'Donación'];
    let eid = 1;
    sucursales.filter((s) => s.tipo !== 'Tercero').forEach((s, i) => {
      if (i % 4 === 3) return;
      s.escrituras.push({
        id: eid++, acto: ACTOS[i % ACTOS.length], numero: 40000 + ((s.id * 7919) % 50000),
        fecha: `${2004 + (i % 15)}-${String(1 + (i % 12)).padStart(2, '0')}-${String(3 + (i % 25)).padStart(2, '0')}`,
        notaria: null, archivos: [],
      });
    });
    // Como en el diseño de referencia
    Object.assign(byName('Aguascalientes I').escrituras[0], { acto: 'Compraventa', numero: 73118, fecha: '2012-02-14' });

    /* ---------- Contratos ---------- */
    // Los que aparecen en la bandeja (fechas y montos fijos)
    const KEY = {
      'Aztlán':      { inicio: '2016-08-04', fin: '2026-08-03', renta: 184500, doc: true },
      'Anzures':     { inicio: '2011-09-13', fin: '2026-09-09', renta: 96300.5, doc: false },
      'Contry':      { inicio: '2019-09-30', fin: '2026-09-29', renta: 327375.54, doc: true },
      'Cumbres':     { inicio: '2021-10-17', fin: '2026-10-16', renta: 262940.18, doc: true },
      'Chipinque':   { inicio: '2016-11-01', fin: '2026-10-31', renta: 415000, doc: true, responsable: 'Inmobiliaria', gestion: 'en-proceso' },
      'Ciudadela':   { inicio: '2018-11-13', fin: '2026-11-12', renta: 128760.4, doc: true },
      'Linda Vista': { inicio: '2020-11-21', fin: '2026-11-20', renta: 201450, doc: true },
      'Mitras':      { inicio: '2014-12-16', fin: '2026-12-15', renta: 156800, doc: false },
      'Valle Oriente': { inicio: '2017-09-02', fin: '2027-09-01', renta: 238500, doc: true },
      'Juriquilla':  { inicio: '2019-05-15', fin: '2027-05-14', renta: 176900, doc: true },
    };
    const contratos = [];
    let cid = 1;
    sucursales.forEach((s) => {
      if (s.tipo === 'Propio' || !s.arrendador) return;
      const k = KEY[s.nombre];
      const lejos = () => `${2028 + Math.floor(rand() * 6)}-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-15`;
      contratos.push({
        id: cid++,
        sucursalId: s.id,
        arrendador: s.arrendador,
        inicio: k?.inicio || `${2016 + Math.floor(rand() * 6)}-03-01`,
        fin: k?.fin || lejos(),
        renta: k?.renta || Math.round((70000 + rand() * 300000) * 100) / 100,
        doc: k ? k.doc : rand() > 0.15,
        responsable: k?.responsable || null,
        gestion: k?.gestion || 'sin-iniciar',
        estado: 'activo', // activo · liberado
      });
      // Los mixtos tienen un segundo contrato (local adicional)
      if (s.tipo === 'Mixto') {
        contratos.push({
          id: cid++, sucursalId: s.id, arrendador: s.arrendador, inicio: '2022-01-01', fin: lejos(),
          renta: Math.round((40000 + rand() * 90000) * 100) / 100, doc: true, responsable: null, gestion: 'sin-iniciar', estado: 'activo',
        });
      }
    });

    /* ---------- Permisos y licencias ---------- */
    // Los nombres y áreas corresponden al catálogo CATALOGO_PERMISOS (abajo)
    const archivo = (nombre, kb, fecha) => ({ nombre, tamano: `${kb} KB`, fecha, por: 'dev@hebmex.com' });
    const slug = (t) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const P = (suc, nombre, area, periodo, fin, doc) => ({
      sucursalId: byName(suc).id, nombre, area, periodo, fin, responsable: null, gestion: 'sin-iniciar',
      archivos: doc ? [archivo(`${slug(nombre)}.pdf`, 120 + Math.floor(rand() * 900), '2026-09-15')] : [],
    });
    const permisos = [
      P('Contry', 'Licencia de funcionamiento de restaurante', 'Jurídico', 'Renovación año documento', '2026-09-05', false),
      P('Contry', 'Calibración de básculas', 'Jurídico', 'Renovación mensual', '2026-09-26', false),
      P('Contry', 'Protección Civil TIENDA', 'Prevención y Pérdidas', 'Renovación año calendario', '2026-10-27', false),
      P('Contry', 'Protección Civil RESTAURANTE', 'Prevención y Pérdidas', 'Renovación año calendario', '2026-10-27', false),
      P('Cumbres', 'Licencia sanitaria', 'Jurídico', 'Renovación año documento', '2026-11-05', true),
      P('Valle Oriente', 'Uso de Suelo', 'Bienes raíces', 'Renovación trianual', '2026-11-28', true),
      P('San Jerónimo', 'Dictamen de instalaciones eléctricas', 'Mantenimiento', 'Renovación año calendario', '2026-12-10', true),
      P('Contry', 'Licencia de Anuncio Adosado', 'Jurídico', 'Renovación año calendario', '2027-03-01', true),
      P('Cumbres', 'Protección Civil TIENDA', 'Prevención y Pérdidas', 'Renovación año calendario', '2027-01-31', true),
      P('Chipinque', 'Licencia de Anuncio Unipolar', 'Jurídico', 'Renovación año calendario', '2026-08-07', false),
      // Trámites de única ocasión: no vencen
      P('Contry', 'Uso de Suelo', 'Bienes raíces', 'Única ocasión', null, true),
      P('Chipinque', 'Alta de Hacienda', 'Fiscal', 'Única ocasión', null, false),
      P('Chipinque', 'Protección Civil TIENDA', 'Prevención y Pérdidas', 'Única ocasión', null, false),
    ].map((p, i) => ({ id: i + 1, ...p, doc: p.archivos.length > 0 }));
    // Archivo de ejemplo como el del diseño
    permisos.at(-1).archivos.push({ nombre: 'incident (50)', tamano: '13.6 KB', fecha: '2026-10-06', por: 'dev@hebmex.com' });
    permisos.at(-1).doc = true;
    byName('Contry').perfil = ['Restaurante'];

    /* ---------- Avisos de vencimiento enviados ---------- */
    const DEST = ['Jefatura de Legal', 'Gerencia Legal Corporativa', 'Subdirección de BR'];
    const contratoDe = (n) => contratos.find((c) => c.sucursalId === byName(n).id);
    const avisosEnviados = [
      ['Aztlán', '1 año', '2025-08-03'], ['Aztlán', '6 meses', '2026-02-03'],
      ['Anzures', '1 año', '2025-09-09'], ['Anzures', '6 meses', '2026-03-09'],
      ['Contry', '6 meses', '2026-03-29'], ['Cumbres', '6 meses', '2026-04-16'],
      ['Chipinque', '6 meses', '2026-04-30'], ['Ciudadela', '6 meses', '2026-05-12'],
      ['Juriquilla', '1 año', '2026-05-14'], ['Linda Vista', '6 meses', '2026-05-20'],
      ['Mitras', '6 meses', '2026-06-15'], ['Valle Oriente', '1 año', '2026-09-01'],
    ].map(([suc, tipo, fecha], i) => ({ id: i + 1, contratoId: contratoDe(suc).id, tipo, fecha, destinatarios: DEST }));

    return {
      sucursales, contratos, permisos, avisosEnviados,
      avisos: [365, 180], // configuración: días antes del fin de vigencia
      nextSucursalId: sucursales.length + 1, nextContratoId: cid, nextEscrituraId: eid,
    };
  }

  /* ---------- Persistencia (sessionStorage) ---------- */
  let db;
  try { db = JSON.parse(sessionStorage.getItem(STORE_KEY)); } catch { db = null; }
  if (!db || !db.sucursales) db = build();

  const save = () => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch {} };
  const reset = () => { try { sessionStorage.removeItem(STORE_KEY); } catch {} location.reload(); };

  /* ---------- Fechas y formato ---------- */
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const toUTC = (d) => { const [y, m, dd] = d.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, dd); };
  const daysUntil = (d) => Math.round((toUTC(d) - toUTC(TODAY)) / 86400000);
  const fmtDate = (d) => { if (!d) return ''; const [y, m, dd] = d.slice(0, 10).split('-'); return `${dd}/${MESES[Number(m) - 1]}/${y}`; };
  const fmtDateTime = (d) => `${fmtDate(d)} ${d.slice(11, 16)}`;
  const addMonths = (d, n) => { const [y, m, dd] = d.slice(0, 10).split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, dd)).toISOString().slice(0, 10); };
  const addDays = (d, n) => new Date(toUTC(d) + n * 86400000).toISOString().slice(0, 10);
  const money = (n) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }).format(n);
  const num = (n) => new Intl.NumberFormat('es-MX').format(n);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

  function dueLabel(d) {
    const n = daysUntil(d);
    if (n < -1) return `Venció hace ${n * -1} días`;
    if (n === -1) return 'Venció ayer';
    if (n === 0) return 'Vence hoy';
    if (n === 1) return 'Vence mañana';
    return `Vence en ${n} días`;
  }
  // Igual que dueLabel, pero a partir de 60 días habla en meses ("Venció hace 2 meses")
  function dueLabelLong(d) {
    const n = daysUntil(d);
    const abs = Math.abs(n);
    if (abs < 60) return dueLabel(d);
    const m = Math.floor(abs / 30);
    return n < 0 ? `Venció hace ${plural(m, 'mes', 'meses')}` : `Vence en ${plural(m, 'mes', 'meses')}`;
  }

  const ESTADO_ABREV = {
    'Aguascalientes': 'Ags.', 'Coahuila': 'Coah.', 'Estado de México': 'Edo. Méx.', 'Guanajuato': 'Gto.',
    'Nuevo León': 'N.L.', 'Querétaro': 'Qro.', 'San Luis Potosí': 'S.L.P.', 'Tamaulipas': 'Tamps.',
  };
  const estadoAbrev = (e) => ESTADO_ABREV[e] || e;
  // "Ciudad, Estado" sin comas sueltas cuando falta alguno
  const lugar = (s, abrev = false) => [s.ciudad, abrev ? estadoAbrev(s.estado) : s.estado].filter(Boolean).join(', ') || 'Sin ubicación';

  // Avisos por anticipación (días → etiqueta)
  const AVISO_LABEL = { 365: '1 año', 180: '6 meses', 90: '3 meses', 30: '1 mes' };

  // Tono del badge según urgencia (usa data-status de badge.css)
  const dueStatus = (d) => { const n = daysUntil(d); return n < 0 ? 'expired' : n <= 30 ? 'expiring' : null; };

  /* ---------- Consultas ---------- */
  const sucursal = (id) => db.sucursales.find((s) => s.id === Number(id));
  const avisosDe = (contratoId) => (db.avisosEnviados || []).filter((a) => a.contratoId === contratoId).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const contratosDe = (id) => db.contratos.filter((c) => c.sucursalId === Number(id) && c.estado === 'activo');
  const permisosDe = (id) => db.permisos.filter((p) => p.sucursalId === Number(id));

  // Asuntos de la bandeja: contratos y permisos que vencen en ≤ horizonte días (o ya vencieron)
  function bandeja(horizonte = 90) {
    const out = [];
    db.contratos.forEach((c) => {
      if (c.estado !== 'activo' || c.gestion === 'renovado') return;
      const n = daysUntil(c.fin);
      if (n > horizonte) return;
      const s = sucursal(c.sucursalId);
      out.push({ key: `c${c.id}`, kind: 'contract', ref: c, sucursal: s, fin: c.fin, days: n, doc: c.doc,
        titulo: n < 0 ? 'Renovar o liberar el local' : 'Decidir la renovación', responsable: c.responsable, gestion: c.gestion, monto: c.renta });
    });
    db.permisos.forEach((p) => {
      if (!p.fin || p.gestion === 'renovado') return; // única ocasión: no vence
      const n = daysUntil(p.fin);
      if (n > horizonte) return;
      out.push({ key: `p${p.id}`, kind: 'permit', ref: p, sucursal: sucursal(p.sucursalId), fin: p.fin, days: n, doc: p.doc,
        titulo: p.nombre, responsable: p.responsable, gestion: p.gestion, monto: null });
    });
    return out.sort((a, b) => a.days - b.days);
  }

  // Semáforo de permisos: vencido < 0 · en proceso 0–90 días · vigente > 90 · sin vigencia (única ocasión / no aplica)
  function semaforo(permisos) {
    const conFecha = permisos.filter((p) => p.fin).sort((a, b) => daysUntil(a.fin) - daysUntil(b.fin));
    const d = (p) => daysUntil(p.fin);
    return {
      total: permisos.length,
      vencidos: conFecha.filter((p) => d(p) < 0).length,
      porVencer: conFecha.filter((p) => d(p) >= 0 && d(p) <= 90).length,
      vigentes: conFecha.filter((p) => d(p) > 90).length,
      unica: permisos.length - conFecha.length,
      sinDoc: permisos.filter((p) => !p.doc).length,
      proximo: conFecha[0] || null,
    };
  }


  /* ---------- Catálogo de tipos de permiso ---------- */
  // restaurante: solo aplica si el perfil de la tienda incluye Restaurante
  const CATALOGO_PERMISOS = [
    { area: 'Prevención y Pérdidas', tipos: ['Protección Civil TIENDA', 'Programa Interno de Protección Civil', 'Dictamen de Bomberos', { nombre: 'Protección Civil RESTAURANTE', restaurante: true }] },
    { area: 'Bienes raíces', tipos: ['Uso de Suelo', 'Seguridad Vial', 'Alineamiento y Número Oficial', 'Factibilidad Vial'] },
    { area: 'Jurídico', tipos: [
      'Licencia de Anuncio Unipolar', 'Licencia de Anuncio Adosado', 'Constancia de factibilidad Tienda', 'Uso y Ocupación',
      'Licencia Funcionamiento de Tienda', 'Calibración de básculas', 'Licencia sanitaria', 'Licencia de venta de bebidas alcohólicas',
      'Permiso de operación nocturna', 'Licencia de estacionamiento público', 'Aviso de funcionamiento de farmacia', 'Licencia de construcción',
      'Terminación de obra', 'Visto bueno de Ecología', { nombre: 'Licencia de funcionamiento de restaurante', restaurante: true }] },
    { area: 'Fiscal', tipos: ['Alta de Hacienda', 'Cédula de identificación fiscal', 'Padrón estatal de contribuyentes'] },
    { area: 'Mantenimiento', tipos: ['Dictamen de instalaciones eléctricas', 'Dictamen estructural', 'Dictamen de gas'] },
    { area: 'Medio ambiente', tipos: ['Licencia ambiental', 'Registro de generador de residuos', 'Permiso de descarga de aguas'] },
  ].map((g) => ({ area: g.area, tipos: g.tipos.map((t) => (typeof t === 'string' ? { nombre: t } : t)) }));

  // Tipos que aplican a una sucursal según su perfil
  const tiposAplicables = (s) => {
    const conRestaurante = (s.perfil || []).includes('Restaurante');
    return CATALOGO_PERMISOS
      .map((g) => ({ area: g.area, tipos: g.tipos.filter((t) => conRestaurante || !t.restaurante) }))
      .filter((g) => g.tipos.length);
  };

  /* ---------- Prerrequisitos por estado y permiso ---------- */
  // Informativos: lo que hay que reunir antes de tramitar cada permiso en cada estado.
  // Solo se agregan (estados o prerrequisitos) importando un Excel; el seed es el catálogo base.
  // Coahuila: documento del usuario de negocio ("Coahuila.pdf"). Título = permiso, filas = prerrequisitos en orden.
  const COAHUILA_DOC = {
    'Licencia de Funcionamiento Tienda y Restaurante': [
      'Formatos de solicitud',
      'Acta Constitutiva, Poder e Identificación de Apoderado',
      'Acreditar propiedad y/o posesión del inmueble',
      'Pago Impuesto Predial',
      'Fotografías',
      'Constancia de Uso de Suelo y cumplimiento de sus Condicionantes',
      'Dictamen de Seguridad y Operación de Funcionamiento',
      ['Plano en el que se precisen las características físicas del inmueble',
        '1. Rutas de evacuación; 2. Capacidad de aforo del inmueble; 3. Salidas de emergencia; 4. Extintores; 5. Señalización; 6. Sistema fijo contra incendios; 7. Cálculo hidráulico; 8. Escaleras de emergencia; 9. Desfibrilador externo automático; 10. Punto de reunión; 11. Luces de emergencia; 12. Detectores de humo; 13. Firma del propietario o representante legal debidamente acreditado.'],
      'Seguro de Responsabilidad Civil',
      'Comprobante de Domicilio del Establecimiento',
      'Constancia de Situación Fiscal',
      'Evidencia de Fumigación y Control de Plagas',
      'Vo. Bo. Protección Civil',
      'Autorización Secretaría Medio Ambiente',
      'Estudio Hidrológico',
      'Plano del Proyecto de Entradas y Salidas',
    ],
    'Anuncios Adosados y Autosoportado': [
      'Formatos de solicitud',
      'Acta Constitutiva, Poder e Identificación de Apoderado',
      'Acreditar propiedad y/o posesión del inmueble',
      'Pago Impuesto Predial',
      'Seguro de Responsabilidad Civil vigente y su comprobante de pago',
      'Fotografías',
      'Croquis de Ubicación del Inmueble',
      'Requisitos adicionales que atienden a la particularidad del anuncio',
      'Firma de Director Responsable de Obra autorizado por municipio acompañando la constancia de autorización del director',
      'Alineamiento Vial',
      'Memoria de Cálculo Estructural, planos estructurales, diseño de anuncio',
      'Vo. Bo. Protección Civil',
      'Licencia de Funcionamiento y Operación',
    ],
    'Licencia de Alcohol': [
      'Formatos de solicitud',
      'Licencia Municipal para venta y/o consumo de bebidas alcohólicas',
      'Escrito libre de solicitud',
      'Acta Constitutiva, Poder e Identificación de Apoderado',
      'Acreditar propiedad y/o posesión del inmueble',
      'Pago Impuesto Predial',
      'Croquis de Ubicación del Inmueble',
      'Constancia de Situación Fiscal',
      'Comprobante de Domicilio del Establecimiento',
      'Alta de Impuesto sobre Nómina',
    ],
    'Anuencia Alcohol': [
      'Formatos de solicitud',
      'Acta Constitutiva, Poder e Identificación de Apoderado',
      'Acreditar propiedad y/o posesión del inmueble',
      'Pago Impuesto Predial',
      'Constancia de Uso de Suelo',
      'Constancia de Situación Fiscal',
      'Aviso de Funcionamiento COFEPRIS',
      'Fotografías',
      'Anuencia y/o firma de vecinos',
      'Licencia de Funcionamiento y Operación',
      'Inventario de producto',
      'Autorización Secretaría Medio Ambiente',
      'Cumplir con restricciones de distancia',
      'Seguro de Responsabilidad Civil',
      'Croquis de Ubicación del Inmueble',
      'Vo. Bo. Protección Civil',
      'Comprobante de Domicilio del Establecimiento',
    ],
    'Calibración Básculas': ['Solicitud', 'Pago de Derechos'],
    'Ampliación de Horario': ['Solicitud', 'Pago de Derechos'],
    'SIEM': ['Solicitud', 'Pago de Derechos'],
  };
  const COAHUILA = Object.entries(COAHUILA_DOC).flatMap(([permiso, items]) =>
    items.map((it) => (Array.isArray(it) ? ['Coahuila', permiso, it[0], it[1], true] : ['Coahuila', permiso, it, '', true])));
  // [estado, permiso, prerrequisito, descripción, obligatorio]
  const PRERREQ_SEED = [
    ['Nuevo León', 'Licencia Funcionamiento de Tienda', 'Uso de suelo vigente', 'Constancia emitida por Desarrollo Urbano del municipio.', true],
    ['Nuevo León', 'Licencia Funcionamiento de Tienda', 'Dictamen de Protección Civil', 'Con antigüedad menor a 12 meses.', true],
    ['Nuevo León', 'Licencia Funcionamiento de Tienda', 'Constancia de situación fiscal', 'Del SAT, con fecha del mes en curso.', true],
    ['Nuevo León', 'Licencia Funcionamiento de Tienda', 'Identificación del representante legal', 'INE o pasaporte vigente.', true],
    ['Nuevo León', 'Licencia Funcionamiento de Tienda', 'Fotografías de fachada', 'Frente y accesos del inmueble.', false],
    ['Nuevo León', 'Uso de Suelo', 'Escrituras o contrato de arrendamiento', 'Acredita la posesión del inmueble.', true],
    ['Nuevo León', 'Uso de Suelo', 'Plano de ubicación', 'Con medidas y colindancias.', true],
    ['Nuevo León', 'Uso de Suelo', 'Pago predial al corriente', 'Recibo del año en curso.', true],
    ['Nuevo León', 'Protección Civil TIENDA', 'Programa Interno de Protección Civil', 'Firmado por consultor registrado.', true],
    ['Nuevo León', 'Protección Civil TIENDA', 'Póliza de seguro de responsabilidad civil', '', true],
    ['Nuevo León', 'Licencia de venta de bebidas alcohólicas', 'Licencia de funcionamiento vigente', '', true],
    ['Nuevo León', 'Licencia de venta de bebidas alcohólicas', 'Anuencia vecinal', 'Firmas de vecinos colindantes.', false],
    ...COAHUILA,
    ['Tamaulipas', 'Licencia Funcionamiento de Tienda', 'Uso de suelo vigente', '', true],
    ['Tamaulipas', 'Licencia Funcionamiento de Tienda', 'Dictamen de Protección Civil', '', true],
    ['Tamaulipas', 'Licencia de Anuncio Unipolar', 'Memoria de cálculo del anuncio', 'Para anuncios de más de 3 m².', true],
    ['San Luis Potosí', 'Licencia Funcionamiento de Tienda', 'Licencia de uso de suelo', '', true],
    ['San Luis Potosí', 'Licencia Funcionamiento de Tienda', 'Comprobante de domicilio', '', true],
    ['San Luis Potosí', 'Licencia sanitaria', 'Responsable sanitario designado', '', false],
    ['Aguascalientes', 'Licencia Funcionamiento de Tienda', 'Uso de suelo vigente', '', true],
  ];
  // Versión del seed: si cambia, se vuelve a cargar el catálogo base
  const PRERREQ_VERSION = 2;
  if (!db.prerrequisitos || db.prereqVersion !== PRERREQ_VERSION) {
    db.prereqVersion = PRERREQ_VERSION;
    db.prerrequisitos = PRERREQ_SEED.map(([estado, permiso, nombre, desc, oblig], i) => ({
      id: i + 1, estado, permiso, nombre, desc, oblig, origen: 'base', fecha: '2026-10-01', archivo: null,
    }));
    db.prereqEstados = [...new Set(PRERREQ_SEED.map((r) => r[0]))];
    db.prereqImportaciones = [];
  }
  /* ---------- Demo de sucursal mixta: varias escrituras y arrendamientos ---------- */
  // Sendero: 3 escrituras (una por fracción adquirida) y 5 contratos con nombre de área,
  // folio de contrato y superficie. Se aplica una vez sobre los datos guardados.
  const MIXTO_DEMO = 1;
  if (db.mixtoDemo !== MIXTO_DEMO) {
    const s = db.sucursales.find((x) => x.nombre === 'Sendero');
    if (s) {
      const doc = (nombre) => ({ nombre, tamano: '840 KB', fecha: '2026-09-15', por: 'dev@hebmex.com' });
      Object.assign(s, {
        num: s.num || 2985, m2Terreno: 35043.02, m2: null,
        calle: 'Av. Sendero Divisorio', noExt: '1100', colonia: 'Residencial Anáhuac', cp: '66450', coords: '25.7449, -100.2830',
      });
      s.escrituras = [
        { id: db.nextEscrituraId++, acto: 'Compraventa', numero: 64528, fraccion: 'Fracción A', fecha: '2016-10-07', superficie: 18500, notaria: null, archivos: [doc('escritura-64528.pdf')] },
        { id: db.nextEscrituraId++, acto: 'Compraventa', numero: 58113, fraccion: 'Fracción B', fecha: '2019-05-22', superficie: 6200, notaria: null, archivos: [doc('escritura-58113.pdf'), doc('plano-fraccion-b.pdf')] },
        { id: db.nextEscrituraId++, acto: 'Permuta', numero: 61027, fraccion: 'Fracción C', fecha: '2021-11-03', superficie: 1450, notaria: null, archivos: [] },
      ];
      db.contratos = db.contratos.filter((c) => c.sucursalId !== s.id);
      // [área, folio, arrendador, inicio, fin, m², renta]
      [
        ['Local anexo A', 'ARR-2021-032', 'Sendero Plazas', '2021-06-15', '2026-06-14', 620, 54000],
        ['Bodega posterior', 'ARR-2022-007', 'Inmobiliaria Regia', '2022-01-01', '2026-12-31', 1350, 96000],
        ['Área de carga', 'ARR-2024-003', 'Kalos', '2024-02-01', '2027-01-15', 1100, 62000],
        ['Estacionamiento norte', 'ARR-2019-014', 'U-CALLI', '2019-03-01', '2029-02-28', 4200, 185000],
        ['Local comercial B', 'ARR-2023-011', 'Plazas del Norte', '2023-05-01', '2028-04-30', 360, 41000],
      ].forEach(([nombre, folio, arrendador, inicio, fin, superficie, renta]) => db.contratos.push({
        id: db.nextContratoId++, sucursalId: s.id, nombre, folio, arrendador, inicio, fin, superficie, renta,
        doc: true, responsable: null, gestion: 'sin-iniciar', estado: 'activo',
      }));
    }
    db.mixtoDemo = MIXTO_DEMO;
    save();
  }

  /* ---------- Habilitación en Permisos y licencias ---------- */
  // Una sucursal registrada en Sucursales aparece en Permisos y licencias hasta que se
  // habilita con su perfil. Al arrancar, se dan por habilitadas las que ya tienen permisos.
  // Dependencias que emiten permisos (Excel de la HU02). "Otra" abre un campo de captura libre.
  const DEPENDENCIAS = [
    'Secretaría de Desarrollo Urbano', 'Secretaría de Finanzas y Tesorería', 'Secretaría de Gobierno', 'Semarnat',
    'Secretaría de Economía', 'SAT', 'Profeco', 'Secretaría del Ayuntamiento', 'Dirección de Comercio y/o Alcoholes',
    'Secretaría de Salud', 'Conagua', 'Secretaría de Seguridad Pública', 'Protección Civil', 'Bomberos',
  ];
  // Tipos de renovación (Excel de la HU02). Sin fecha de vigencia: No aplica y Única ocasión.
  const TIPOS_RENOVACION = ['No aplica', 'Única ocasión', 'Renovación año calendario', 'Renovación año documento', 'Renovación trianual', 'Renovación mensual', 'Otra'];
  const SIN_VIGENCIA = ['No aplica', 'Única ocasión'];
  // Migra los nombres anteriores de periodicidad a los tipos de renovación de la HU
  const RENOMBRE_PERIODO = { 'Año calendario': 'Renovación año calendario', 'Año documento': 'Renovación año documento', 'Mensual': 'Renovación mensual', 'Trianual': 'Renovación trianual', 'Quinquenal': 'Renovación cada 5 años' };
  let migrado = false;
  db.permisos.forEach((p) => { if (RENOMBRE_PERIODO[p.periodo]) { p.periodo = RENOMBRE_PERIODO[p.periodo]; migrado = true; } });
  if (migrado) save();
  // Aviso por correo: 90 días antes de la vigencia; 15 días para renovación mensual; sin aviso si no hay vigencia
  const diasAviso = (p) => (!p.fin ? null : p.periodo === 'Renovación mensual' ? 15 : 90);
  const TIPOS_ALCOHOL = ['Sin licencia de alcohol', 'Venta en envase cerrado', 'Consumo en el establecimiento', 'Venta y consumo'];
  const ALCANCES_PC = ['Municipal', 'Estatal', 'Municipal y estatal'];
  const HABILITACION = 1;
  if (db.habilitacion !== HABILITACION) {
    const conPermisos = new Set(db.permisos.map((p) => p.sucursalId));
    db.sucursales.forEach((s) => {
      if (!conPermisos.has(s.id)) { s.habilitada = false; return; }
      s.habilitada = true;
      s.perfilPermisos = {
        restaurante: (s.perfil || []).includes('Restaurante'), licenciaSanitaria: false, ampliacionHorario: false,
        alcohol: TIPOS_ALCOHOL[0], proteccionCivil: '', expedienteCatastral: '', asesorExterno: '', presidenteMunicipal: '',
        fecha: '2026-09-17', por: 'seed@hebmex.com',
      };
    });
    db.habilitacion = HABILITACION;
    save();
  }
  const habilitadas = () => db.sucursales.filter((s) => s.habilitada);
  const sinHabilitar = () => db.sucursales.filter((s) => !s.habilitada);

  const prerrequisitosDe = (estado, permiso) => db.prerrequisitos.filter((r) => r.estado === estado && (!permiso || r.permiso === permiso));
  // Todos los tipos del catálogo, sin agrupar (para validar el Excel)
  const tiposPermiso = () => CATALOGO_PERMISOS.flatMap((g) => g.tipos.map((t) => t.nombre));

  // Bandeja de contratos de sucursales con horizonte en meses (6 a 12)
  const HORIZONTE_DEFAULT = 6;
  const bandejaContratos = (meses = HORIZONTE_DEFAULT) =>
    bandeja(daysUntil(addMonths(TODAY, meses))).filter((i) => i.kind === 'contract');
  const bandejaPermisos = (meses = HORIZONTE_DEFAULT) =>
    bandeja(daysUntil(addMonths(TODAY, meses))).filter((i) => i.kind === 'permit');

  // Avance de la ficha de una sucursal
  function ficha(s) {
    const checks = [
      ['nombre', s.nombre], ['empresa', s.empresa], ['tipo', s.tipo], ['formato', s.formato], ['ciudad', s.ciudad],
      ['N° de tienda', s.num], ['estatus', s.estatus], ['cuenta predial', s.cuentaPredial], ['clave catastral', s.claveCatastral],
      ['dirección', s.calle], ['coordenadas', s.coords], ['superficies', s.m2 && s.m2Terreno],
      ['condiciones económicas', s.precioLista || s.renta || s.mantenimiento],
    ];
    const faltan = checks.filter(([, v]) => !v).map(([k]) => k);
    return { pct: Math.round(((checks.length - faltan.length) / checks.length) * 100), faltan };
  }

  const listaHumana = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} y ${arr.at(-1)}`);

  function log(s, titulo, icon = 'edit') {
    s.historial.unshift({ titulo, icon, por: 'Usuario de desarrollo', fecha: `${TODAY}T${new Date().toTimeString().slice(0, 5)}` });
  }

  return {
    get db() { return db; }, save, reset, TODAY, EMPRESA, ESTADOS, GEO, RESPONSABLES, GESTION,
    daysUntil, fmtDate, fmtDateTime, addDays, money, num, esc, plural, dueLabel, dueLabelLong, dueStatus, estadoAbrev, lugar, AVISO_LABEL, avisosDe,
    sucursal, contratosDe, permisosDe, bandeja, bandejaContratos, bandejaPermisos, CATALOGO_PERMISOS, tiposAplicables, HORIZONTE_DEFAULT, addMonths, ficha, listaHumana, log, semaforo,
    prerrequisitosDe, tiposPermiso, habilitadas, sinHabilitar, TIPOS_ALCOHOL, ALCANCES_PC, DEPENDENCIAS, TIPOS_RENOVACION, SIN_VIGENCIA, diasAviso,
    uuid: () => crypto.randomUUID(),
  };
})();
