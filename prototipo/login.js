/* =========================================================
   login.js — prototipo BRS · Inicio de sesión
   Cada cuenta entra a un solo módulo (ver PERFILES en shell.js):
   · pyl@hebmex.com        → permisos  (Permisos y licencias)
   · sucursales@hebmex.com → inmuebles (Sucursales)
   Prototipo: cualquier contraseña escrita es válida. La sesión
   se guarda en este navegador (brs-sesion) hasta "Cerrar sesión".
   ========================================================= */

(() => {
  const CUENTAS = {
    'pyl@hebmex.com': { perfil: 'permisos', inicio: 'bandeja-permisos.html' },
    'sucursales@hebmex.com': { perfil: 'inmuebles', inicio: 'sucursales.html' },
  };
  // Pantallas de cada módulo, para regresar a la que se pidió antes del login
  const PANTALLAS = {
    permisos: ['bandeja-permisos.html', 'permisos.html', 'expediente.html', 'prerrequisitos.html', 'reportes.html'],
    inmuebles: ['vencimientos.html', 'sucursales.html', 'sucursal.html'],
  };

  const form = document.getElementById('login-form');
  const msg = document.querySelector('[data-msg]');
  const { email, password } = form.elements;

  const alerta = (tipo, titulo, texto) => {
    msg.innerHTML = `<div class="alert alert-${tipo}">
      <span class="icon alert-icon" aria-hidden="true">${tipo === 'danger' ? 'error' : 'info'}</span>
      <div class="alert-content"><p class="alert-title"></p>${texto ? '<p class="alert-body"></p>' : ''}</div></div>`;
    msg.querySelector('.alert-title').textContent = titulo;
    if (texto) msg.querySelector('.alert-body').textContent = texto;
  };
  const marcar = (input, mal) => input.setAttribute('aria-invalid', String(mal));

  // Solo regresa a una pantalla del prototipo del mismo módulo (nada de URLs externas)
  function destino(perfil, inicio) {
    const volver = new URLSearchParams(location.search).get('volver') || '';
    const [pagina] = volver.split('?');
    return /^[a-z-]+\.html(\?[\w=&%-]*)?$/.test(volver) && PANTALLAS[perfil].includes(pagina) ? volver : inicio;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const correo = email.value.trim().toLowerCase();
    marcar(email, !email.checkValidity() || !correo);
    marcar(password, !password.value);
    if (!correo || !email.checkValidity()) { alerta('danger', 'Escribe tu correo electrónico.', 'Por ejemplo, pyl@hebmex.com.'); email.focus(); return; }
    if (!password.value) { alerta('danger', 'Escribe tu contraseña.'); password.focus(); return; }

    const cuenta = CUENTAS[correo];
    if (!cuenta) {
      marcar(email, true);
      alerta('danger', 'Ese correo no tiene acceso a Bienes Raíces.', 'Revisa que esté bien escrito o pide acceso a sat@heb.com.mx.');
      email.focus();
      return;
    }
    try { localStorage.setItem('brs-sesion', JSON.stringify({ email: correo, perfil: cuenta.perfil, desde: new Date().toISOString() })); } catch {}
    location.href = destino(cuenta.perfil, cuenta.inicio);
  });

  form.addEventListener('input', (e) => { if (e.target.matches('.login-input')) marcar(e.target, false); });

  document.querySelector('[data-olvide]').addEventListener('click', () =>
    alerta('info', 'Para restablecer tu contraseña, escribe a sat@heb.com.mx.', 'Te responden con las instrucciones a tu correo de HEB.'));
  document.querySelector('[data-microsoft]').addEventListener('click', () =>
    alerta('info', 'El inicio con Microsoft se conecta en la versión final.', 'En este prototipo entra con tu correo y cualquier contraseña.'));

  email.focus();
})();
