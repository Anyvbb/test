/* =========================================================
   shell.js — partes comunes del prototipo (perfil y menú)

   Perfiles: en BRS cada usuario trabaja en un solo módulo y
   el menú lateral solo muestra sus opciones.
   · inmuebles → Inmuebles arrendados (Bandeja, Sucursales)
   · permisos  → Permisos y licencias (Bandeja, Permisos, Reportes)
   El perfil sale de la cuenta con la que se inició sesión en
   login.html (brs-sesion en este navegador). Sin sesión, toda
   pantalla manda al login; "Cerrar sesión" la borra.
   ========================================================= */

(() => {
  const PERFILES = {
    inmuebles: {
      nombre: 'Usuario de inmuebles', modulo: 'Inmuebles arrendados', inicio: 'vencimientos.html',
      menu: [
        { href: 'vencimientos.html', icon: 'inbox', label: 'Bandeja', contador: true },
        { href: 'sucursales.html', icon: 'storefront', label: 'Sucursales', tambien: ['sucursal.html'] },
      ],
    },
    permisos: {
      nombre: 'Usuario de permisos', modulo: 'Permisos y licencias', inicio: 'bandeja-permisos.html',
      menu: [
        { href: 'bandeja-permisos.html', icon: 'inbox', label: 'Bandeja', contador: true },
        { href: 'permisos.html', icon: 'verified_user', label: 'Permisos y licencias', tambien: ['expediente.html'] },
        { href: 'prerrequisitos.html', icon: 'checklist', label: 'Prerrequisitos' },
        { href: 'reportes.html', icon: 'bar_chart', label: 'Reportes' },
      ],
    },
  };
  // Pantallas equivalentes entre módulos (mismo ?id=)
  const EQUIVALENTE = { 'sucursal.html': 'expediente.html', 'expediente.html': 'sucursal.html' };
  const SESION = 'brs-sesion';

  let sesion = null;
  try { sesion = JSON.parse(localStorage.getItem(SESION)); } catch {}
  if (!sesion || !PERFILES[sesion.perfil]) {
    window.Shell = { perfil: { id: '', ...PERFILES.inmuebles }, refresh() {} }; // la página no alcanza a usarlo
    location.replace(`login.html?volver=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}`);
    return;
  }
  const perfil = { id: sesion.perfil, email: sesion.email, ...PERFILES[sesion.perfil] };
  const pagina = location.pathname.split('/').pop() || 'index.html';

  // Una pantalla de otro módulo no es accesible: lleva a su equivalente o al inicio del perfil
  const moduloPagina = document.body.dataset.module;
  if (moduloPagina && moduloPagina !== perfil.id) {
    window.Shell = { perfil, refresh() {} }; // la página no alcanza a usarlo
    location.replace(EQUIVALENTE[pagina] ? `${EQUIVALENTE[pagina]}${location.search}${location.hash}` : perfil.inicio);
    return;
  }

  /* ---------- Menú lateral del perfil ---------- */
  const item = (m) => {
    const activo = m.href === pagina || m.tambien?.includes(pagina);
    return `<li><a class="sidebar-item" href="${m.href}" ${activo ? 'aria-current="page"' : ''} title="${m.label}">
      <span class="icon" aria-hidden="true">${m.icon}</span><span class="sidebar-label">${m.label}</span>
      ${m.contador ? '<span class="sidebar-counter" data-count-bandeja></span>' : ''}</a></li>`;
  };
  const seccion = (titulo, items) => `<div class="sidebar-section">
      <p class="sidebar-section-title">${titulo}</p>
      <ul class="sidebar-list">${items.map(item).join('')}</ul>
    </div>`;
  document.querySelectorAll('[data-nav]').forEach((nav) => {
    nav.innerHTML = seccion(perfil.modulo, perfil.menu)
      + seccion('Configuración', [{ href: '#', icon: 'folder_open', label: 'Catálogos' }]);
  });

  /* ---------- Header ---------- */
  document.querySelectorAll('.topbar-brand').forEach((a) => { a.href = perfil.inicio; });
  document.querySelectorAll('.topbar-user-name').forEach((el) => { el.textContent = perfil.nombre; });
  document.querySelectorAll('.topbar-user').forEach((b) => b.setAttribute('aria-label', `Cuenta de ${perfil.nombre}`));

  // Menú del usuario: correo, módulo y cerrar sesión
  const menu = document.getElementById('user-menu');
  if (menu) {
    const label = menu.querySelector('.menu-label');
    if (label) {
      label.className = 'menu-header';
      label.innerHTML = `<strong>${perfil.email}</strong><span>${perfil.modulo}</span>`;
    }
    [...menu.querySelectorAll('.menu-item')].find((b) => b.textContent.includes('Cerrar sesión'))?.setAttribute('data-logout', '');
    menu.addEventListener('click', (e) => {
      if (!e.target.closest('[data-logout]')) return;
      try { localStorage.removeItem(SESION); } catch {}
      location.href = 'login.html';
    });
  }

  window.Shell = {
    perfil,
    // Contador de la bandeja del perfil; llámalo tras cualquier cambio
    refresh() {
      const n = (perfil.id === 'permisos' ? CLETA.bandejaPermisos() : CLETA.bandejaContratos()).length;
      document.querySelectorAll('[data-count-bandeja]').forEach((el) => {
        el.textContent = n;
        el.hidden = n === 0;
      });
    },
  };
  Shell.refresh();
})();
