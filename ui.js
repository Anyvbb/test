/* =========================================================
   ui.js — comportamiento mínimo de los componentes.
   Sin dependencias. Todo se engancha por atributos data-*.

   data-modal-open="id"   abre el <dialog id="id">
   data-modal-close       cierra el modal que lo contiene
   data-sidebar-toggle    colapsa (escritorio) / abre (móvil) el sidebar
   data-sidebar-close     cierra el drawer en móvil
   data-alert-dismiss     cierra la alerta que lo contiene
   data-theme-toggle      alterna claro / oscuro
   popovertarget + .menu  posiciona el menú junto a su botón
   data-select-all        (en <thead>) selecciona todas las filas
   data-select-row        (en cada fila) selecciona la fila
   data-bulk-clear        quita la selección de la tabla
   ========================================================= */

(() => {
  const shell = document.querySelector('.app-shell');
  const mobile = window.matchMedia('(max-width: 1023px)');

  /* ---------- Modales ---------- */
  function openModal(id) {
    const dialog = document.getElementById(id);
    if (!dialog) return;
    dialog.showModal();
    const first = dialog.querySelector('[autofocus], .modal-body :is(input, select, textarea):not([disabled])');
    first?.focus();
  }

  function closeModal(dialog) {
    dialog.querySelector('form')?.reset();
    dialog.querySelectorAll('.field.is-invalid').forEach((f) => f.classList.remove('is-invalid'));
    dialog.close();
  }

  // Validación: marca .is-invalid en los campos que no pasan
  function validate(form) {
    let firstInvalid = null;
    form.querySelectorAll('.field').forEach((field) => {
      const control = field.querySelector('input, select, textarea');
      if (!control) return;
      const ok = control.checkValidity();
      field.classList.toggle('is-invalid', !ok);
      control.setAttribute('aria-invalid', String(!ok));
      if (!ok && !firstInvalid) firstInvalid = control;
    });
    firstInvalid?.focus();
    return !firstInvalid;
  }

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('.modal-form');
    if (!form) return;
    e.preventDefault();
    if (!validate(form)) return;
    const dialog = form.closest('dialog');
    form.dispatchEvent(new CustomEvent('modal:submit', { bubbles: true, detail: new FormData(form) }));
    closeModal(dialog);
  });

  // Quita el error en cuanto el usuario corrige
  document.addEventListener('input', (e) => {
    const field = e.target.closest('.field.is-invalid');
    if (field && e.target.checkValidity()) {
      field.classList.remove('is-invalid');
      e.target.setAttribute('aria-invalid', 'false');
    }
  });

  // Clic en el fondo cierra el modal
  document.addEventListener('mousedown', (e) => {
    if (e.target instanceof HTMLDialogElement && e.target.classList.contains('modal')) {
      const r = e.target.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) closeModal(e.target);
    }
  });

  // Esc: limpia el formulario igual que Cancelar
  document.addEventListener('cancel', (e) => {
    if (e.target.classList?.contains('modal')) {
      e.preventDefault();
      closeModal(e.target);
    }
  }, true);

  /* ---------- Sidebar ---------- */
  function toggleSidebar() {
    if (!shell) return;
    if (mobile.matches) {
      shell.dataset.sidebar = shell.dataset.sidebar === 'open' ? '' : 'open';
    } else {
      const collapsed = shell.dataset.sidebar === 'collapsed';
      shell.dataset.sidebar = collapsed ? '' : 'collapsed';
      try { localStorage.setItem('sidebar', collapsed ? '' : 'collapsed'); } catch {}
    }
    const expanded = mobile.matches ? shell.dataset.sidebar === 'open' : shell.dataset.sidebar !== 'collapsed';
    document.querySelectorAll('[data-sidebar-toggle]').forEach((b) => b.setAttribute('aria-expanded', String(expanded)));
  }

  try {
    if (!mobile.matches && localStorage.getItem('sidebar') === 'collapsed') shell.dataset.sidebar = 'collapsed';
  } catch {}

  mobile.addEventListener('change', () => { if (shell?.dataset.sidebar === 'open') shell.dataset.sidebar = ''; });

  /* ---------- Tema ---------- */
  function toggleTheme() {
    const root = document.documentElement;
    const dark = root.dataset.theme !== 'dark';
    root.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('theme', root.dataset.theme); } catch {}
    document.querySelectorAll('[data-theme-toggle] .icon').forEach((i) => (i.textContent = dark ? 'light_mode' : 'dark_mode'));
  }

  try {
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.dataset.theme = saved;
    if (saved === 'dark') document.querySelectorAll('[data-theme-toggle] .icon').forEach((i) => (i.textContent = 'light_mode'));
  } catch {}

  /* ---------- Menús (popover) ---------- */
  let menuInvoker = null;
  document.addEventListener('click', (e) => {
    const inv = e.target.closest('[popovertarget]');
    if (inv) menuInvoker = inv;
  }, true);

  function positionMenu(menu, anchor) {
    const gap = 4;
    const a = anchor.getBoundingClientRect();
    const m = menu.getBoundingClientRect();
    let top = a.bottom + gap;
    if (top + m.height > innerHeight - gap) top = Math.max(gap, a.top - m.height - gap);
    // data-menu-align="start": alinea a la izquierda y al menos tan ancho como el botón (selectores)
    const start = anchor.dataset.menuAlign === 'start';
    if (start) menu.style.minWidth = `${a.width}px`;
    let left = start ? a.left : a.right - m.width;
    left = Math.min(Math.max(gap, left), innerWidth - menu.getBoundingClientRect().width - gap);
    menu.style.top = `${top}px`;
    menu.style.left = `${left}px`;
  }

  document.addEventListener('toggle', (e) => {
    const menu = e.target;
    if (!menu.classList?.contains('menu')) return;
    if (e.newState === 'open' && menuInvoker) {
      positionMenu(menu, menuInvoker);
      menu.menuInvoker = menuInvoker;
      menuInvoker.setAttribute('aria-expanded', 'true');
      menu.querySelector('.menu-item')?.focus();
    } else if (e.newState === 'closed') {
      menu.menuInvoker?.setAttribute('aria-expanded', 'false');
    }
  }, true);

  // El menú se cierra al hacer scroll o cambiar tamaño (evita que quede flotando)
  const closeMenus = () => document.querySelectorAll('.menu:popover-open').forEach((m) => m.hidePopover());
  addEventListener('resize', closeMenus);
  document.addEventListener('scroll', closeMenus, true);

  // Flechas ↑ ↓ dentro del menú
  document.addEventListener('keydown', (e) => {
    const menu = e.target.closest?.('.menu:popover-open');
    if (!menu || !['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const items = [...menu.querySelectorAll('.menu-item:not(:disabled)')];
    const i = items.indexOf(document.activeElement);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  });

  /* ---------- Selección de filas en tablas ---------- */
  function syncSelection(table) {
    const rows = [...table.querySelectorAll('tbody [data-select-row]')];
    const checked = rows.filter((c) => c.checked);
    rows.forEach((c) => c.closest('tr').setAttribute('aria-selected', String(c.checked)));

    const all = table.querySelector('[data-select-all]');
    if (all) {
      all.checked = rows.length > 0 && checked.length === rows.length;
      all.indeterminate = checked.length > 0 && checked.length < rows.length;
    }

    const card = table.closest('.table-view');
    const bulk = card?.querySelector('.table-bulk');
    const toolbar = card?.querySelector('.table-toolbar');
    if (bulk) {
      bulk.hidden = checked.length === 0;
      if (toolbar) toolbar.hidden = checked.length > 0;
      bulk.querySelectorAll('[data-bulk-count]').forEach((n) => (n.textContent = checked.length));
    }
  }

  document.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-select-all]')) {
      const table = t.closest('table');
      table.querySelectorAll('tbody [data-select-row]').forEach((c) => (c.checked = t.checked));
      syncSelection(table);
    } else if (t.matches('[data-select-row]')) {
      syncSelection(t.closest('table'));
    }
  });

  function clearSelection(card) {
    const table = card.querySelector('table');
    table.querySelectorAll('[data-select-row], [data-select-all]').forEach((c) => (c.checked = false));
    syncSelection(table);
  }

  /* ---------- Zona de carga: muestra el archivo elegido ---------- */
  document.addEventListener('change', (e) => {
    const input = e.target;
    if (!input.matches?.('.dropzone input[type="file"]')) return;
    const dz = input.closest('.dropzone');
    const out = dz.querySelector('[data-dropzone-file]');
    const names = [...input.files].map((f) => f.name).join(', ');
    dz.classList.toggle('has-file', input.files.length > 0);
    if (out) out.textContent = names;
    if (input.files.length) input.closest('.field')?.classList.remove('is-invalid');
  });
  // Arrastrar y soltar sobre la zona
  ['dragover', 'drop'].forEach((type) => document.addEventListener(type, (e) => {
    const dz = e.target.closest?.('.dropzone');
    if (!dz) return;
    e.preventDefault();
    if (type === 'drop' && e.dataTransfer.files.length) {
      const input = dz.querySelector('input[type="file"]');
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }));
  document.addEventListener('reset', (e) => {
    e.target.querySelectorAll?.('.dropzone').forEach((dz) => {
      dz.classList.remove('has-file');
      const out = dz.querySelector('[data-dropzone-file]');
      if (out) out.textContent = '';
    });
  }, true);

  /* ---------- Toast ---------- */
  const TOAST_ICON = { success: 'check_circle', danger: 'error', warning: 'warning', info: 'info' };
  function toast(message, type = 'info', ms = 4000) {
    let region = document.querySelector('.toast-region');
    if (!region) {
      region = document.createElement('div');
      region.className = 'toast-region';
      region.setAttribute('aria-live', 'polite');
      document.body.append(region);
    }
    const el = document.createElement('div');
    el.className = 'toast';
    el.dataset.type = type;
    el.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    el.innerHTML = `<span class="icon toast-icon" aria-hidden="true">${TOAST_ICON[type] || 'info'}</span>
      <span class="toast-text"></span>
      <button class="toast-close" aria-label="Cerrar aviso"><span class="icon" aria-hidden="true">close</span></button>`;
    el.querySelector('.toast-text').textContent = message;
    const remove = () => { el.classList.add('is-leaving'); setTimeout(() => el.remove(), 150); };
    el.querySelector('.toast-close').addEventListener('click', remove);
    region.append(el);
    setTimeout(remove, ms);
  }

  // validate(contenedor): valida solo los campos dentro de ese contenedor (p. ej. un paso del stepper)
  window.UI = { openModal, closeModal, syncSelection, clearSelection, toast, validate };

  /* ---------- Delegación de clics ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-modal-open], [data-modal-close], [data-sidebar-toggle], [data-sidebar-close], [data-alert-dismiss], [data-theme-toggle], [data-bulk-clear]');
    if (!t) return;

    t.closest('.menu:popover-open')?.hidePopover();

    if (t.dataset.modalOpen) openModal(t.dataset.modalOpen);
    else if (t.hasAttribute('data-modal-close')) closeModal(t.closest('dialog'));
    else if (t.hasAttribute('data-sidebar-toggle')) toggleSidebar();
    else if (t.hasAttribute('data-sidebar-close')) shell.dataset.sidebar = '';
    else if (t.hasAttribute('data-theme-toggle')) toggleTheme();
    else if (t.hasAttribute('data-bulk-clear')) clearSelection(t.closest('.table-view'));
    else if (t.hasAttribute('data-alert-dismiss')) {
      const alert = t.closest('.alert');
      alert.classList.add('is-dismissing');
      setTimeout(() => alert.remove(), 150);
    }
  });
})();
