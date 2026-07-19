/* =====================================================================
   script.js — lógica de la página (JavaScript puro, sin frameworks)
   ===================================================================== */

(function () {
  "use strict";

  const grid = document.getElementById("careersGrid");
  const searchInput = document.getElementById("searchInput");
  const chipsWrap = document.getElementById("categoryChips");
  const titleChipsWrap = document.getElementById("titleChips");
  const modalityChipsWrap = document.getElementById("modalityChips");
  const institutionSelect = document.getElementById("institutionFilter");
  const clearFiltersBtn = document.getElementById("clearFilters");
  const resultsCount = document.getElementById("resultsCount");
  const noResults = document.getElementById("noResults");
  const totalCarrerasEl = document.getElementById("totalCarreras");

  let activeCategory = "Todas";
  let activeTitleType = "Todos";
  let activeModality = "Todas";
  let activeInstitution = "todas";
  let query = "";

  totalCarrerasEl.textContent = CAREERS.length;

  /* ---------------------- Tipo de título y modalidad (derivados) ---------------------- */
  function tipoTitulo(nombre) {
    const n = nombre.toLowerCase();
    if (n.startsWith("licenciatura")) return "Licenciatura";
    if (n.startsWith("ingeniería") || n.startsWith("ingenieria")) return "Ingeniería";
    if (n.startsWith("tecnicatura") || n.startsWith("técnico") || n.startsWith("tecnico")) return "Tecnicatura";
    if (n.startsWith("profesorado")) return "Profesorado";
    if (n.startsWith("analista universitario")) return "Analista Universitario";
    if (n.startsWith("doctorado")) return "Posgrado";
    return "Otros títulos";
  }

  // Siglo 21 es, en los datos de este sitio, la única institución 100% virtual;
  // el resto dicta de forma presencial (algunas con opción virtual puntual ya
  // aclarada en el campo modalidadInstituciones de esa carrera).
  function institucionIds(career) {
    return Array.isArray(career.institucion) ? career.institucion : (career.institucion ? [career.institucion] : []);
  }
  function esVirtual(career) { return institucionIds(career).includes("siglo21"); }
  function esPresencial(career) { return institucionIds(career).some(id => id !== "siglo21"); }

  /* ---------------------- Instituciones ---------------------- */
  function institucionNombres(institucionField) {
    if (!institucionField) return [];
    const ids = Array.isArray(institucionField) ? institucionField : [institucionField];
    return ids.map(id => (INSTITUCIONES[id] ? INSTITUCIONES[id].nombre : id));
  }

  const institucionesGrid = document.getElementById("institucionesGrid");
  if (institucionesGrid && typeof INSTITUCIONES === "object") {
    Object.values(INSTITUCIONES).forEach(inst => {
      const card = document.createElement("article");
      card.className = "institucion-card";
      card.innerHTML = `
        <span class="institucion-tipo">${inst.tipo}</span>
        <h3>${inst.nombre}</h3>
        <p>${inst.descripcion}</p>
        <p class="institucion-direccion">📍 ${inst.direccion}</p>
        ${inst.web ? `<a class="institucion-web" href="${inst.web}" target="_blank" rel="noopener">Sitio web →</a>` : ""}
      `;
      institucionesGrid.appendChild(card);
    });
  }

  /* ---------------------- Chips de categoría ---------------------- */
  const categorias = ["Todas", ...Array.from(new Set(CAREERS.map(c => c.categoria))).sort((a,b)=>a.localeCompare(b,"es"))];

  categorias.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "chip" + (cat === "Todas" ? " active" : "");
    btn.textContent = cat;
    btn.setAttribute("role", "tab");
    btn.addEventListener("click", () => {
      activeCategory = cat;
      chipsWrap.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      renderGrid();
      updateClearButton();
    });
    chipsWrap.appendChild(btn);
  });

  /* ---------------------- Chips de tipo de título ---------------------- */
  const tiposTitulo = ["Todos", ...Array.from(new Set(CAREERS.map(c => tipoTitulo(c.nombre)))).sort((a,b)=>a.localeCompare(b,"es"))];

  tiposTitulo.forEach(tipo => {
    const btn = document.createElement("button");
    btn.className = "chip" + (tipo === "Todos" ? " active" : "");
    btn.textContent = tipo;
    btn.setAttribute("role", "tab");
    btn.addEventListener("click", () => {
      activeTitleType = tipo;
      titleChipsWrap.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      renderGrid();
      updateClearButton();
    });
    titleChipsWrap.appendChild(btn);
  });

  /* ---------------------- Chips de modalidad ---------------------- */
  const modalidades = ["Todas", "Presencial", "Virtual"];

  modalidades.forEach(mod => {
    const btn = document.createElement("button");
    btn.className = "chip" + (mod === "Todas" ? " active" : "");
    btn.textContent = mod;
    btn.setAttribute("role", "tab");
    btn.addEventListener("click", () => {
      activeModality = mod;
      modalityChipsWrap.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      renderGrid();
      updateClearButton();
    });
    modalityChipsWrap.appendChild(btn);
  });

  /* ---------------------- Selector de institución/facultad ---------------------- */
  const institucionesOrdenadas = Object.entries(INSTITUCIONES).sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, "es"));
  const optTodas = document.createElement("option");
  optTodas.value = "todas";
  optTodas.textContent = "Todas las instituciones";
  institutionSelect.appendChild(optTodas);
  institucionesOrdenadas.forEach(([id, inst]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = inst.nombre;
    institutionSelect.appendChild(opt);
  });
  institutionSelect.addEventListener("change", (e) => {
    activeInstitution = e.target.value;
    renderGrid();
    updateClearButton();
  });

  /* ---------------------- Limpiar filtros ---------------------- */
  function updateClearButton() {
    const hayFiltros = activeCategory !== "Todas" || activeTitleType !== "Todos" || activeModality !== "Todas" || activeInstitution !== "todas" || query !== "";
    clearFiltersBtn.hidden = !hayFiltros;
  }

  clearFiltersBtn.addEventListener("click", () => {
    activeCategory = "Todas";
    activeTitleType = "Todos";
    activeModality = "Todas";
    activeInstitution = "todas";
    query = "";
    searchInput.value = "";
    chipsWrap.querySelectorAll(".chip").forEach((c, i) => c.classList.toggle("active", i === 0));
    titleChipsWrap.querySelectorAll(".chip").forEach((c, i) => c.classList.toggle("active", i === 0));
    modalityChipsWrap.querySelectorAll(".chip").forEach((c, i) => c.classList.toggle("active", i === 0));
    institutionSelect.value = "todas";
    renderGrid();
    updateClearButton();
  });

  /* ---------------------- Buscador ---------------------- */
  let debounceTimer;
  searchInput.addEventListener("input", (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      query = e.target.value.trim().toLowerCase();
      renderGrid();
      updateClearButton();
    }, 140);
  });

  /* ---------------------- Render de la grilla ---------------------- */
  function filteredCareers() {
    return CAREERS.filter(c => {
      const matchesCategory = activeCategory === "Todas" || c.categoria === activeCategory;
      const matchesTitleType = activeTitleType === "Todos" || tipoTitulo(c.nombre) === activeTitleType;
      const matchesModality = activeModality === "Todas"
        || (activeModality === "Presencial" && esPresencial(c))
        || (activeModality === "Virtual" && esVirtual(c));
      const matchesInstitution = activeInstitution === "todas" || institucionIds(c).includes(activeInstitution);
      const haystack = (c.nombre + " " + c.descripcionBreve + " " + c.categoria).toLowerCase();
      const matchesQuery = query === "" || haystack.includes(query);
      return matchesCategory && matchesTitleType && matchesModality && matchesInstitution && matchesQuery;
    });
  }

  function renderGrid() {
    const list = filteredCareers();
    grid.innerHTML = "";
    resultsCount.textContent = list.length + (list.length === 1 ? " carrera" : " carreras");
    noResults.hidden = list.length !== 0;

    list.forEach((career, i) => {
      const card = document.createElement("article");
      card.className = "career-card";
      card.style.animationDelay = Math.min(i * 30, 400) + "ms";
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", "Ver información de " + career.nombre);

      card.innerHTML = `
        <div class="card-top">
          <span class="card-icon" aria-hidden="true">${career.icono}</span>
          <span class="card-category">${career.categoria}</span>
        </div>
        <h3 class="card-title">${career.nombre}</h3>
        <p class="card-desc">${career.descripcionBreve}</p>
        <div class="card-meta">
          ${career.duracionAnios ? `<span>⏱ ${career.duracionAnios} años</span>` : ""}
          ${!career.investigado ? `<span class="badge-unverified">En construcción</span>` : ""}
        </div>
        ${institucionNombres(career.institucion).length ? `<div class="card-meta">${institucionNombres(career.institucion).map(n => `<span class="badge-institucion">🏛️ ${n}</span>`).join("")}</div>` : ""}
        <span class="card-cta">Ver información
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </span>
      `;

      card.addEventListener("click", () => openDetail(career.id));
      card.addEventListener("keypress", (e) => { if (e.key === "Enter") openDetail(career.id); });

      grid.appendChild(card);
    });
  }

  /* ---------------------- Panel de detalle ---------------------- */
  const overlay = document.getElementById("detailOverlay");
  const detailContent = document.getElementById("detailContent");
  const closeDetailBtn = document.getElementById("closeDetail");

  function renderList(items) {
    if (!items || items.length === 0) return `<p class="empty-field">Información no disponible todavía.</p>`;
    return `<ul class="plain-list">${items.map(i => `<li>${i}</li>`).join("")}</ul>`;
  }
  function renderTags(items) {
    if (!items || items.length === 0) return `<p class="empty-field">Información no disponible todavía.</p>`;
    return `<ul class="tag-list">${items.map(i => `<li>${i}</li>`).join("")}</ul>`;
  }
  function textOr(value) {
    return value && value.trim() !== "" ? value : `<span class="empty-field" style="color:var(--text-faint)">Información no disponible todavía.</span>`;
  }

  function base64ToBlob(base64, mime) {
    const byteChars = atob(base64);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
    return new Blob([new Uint8Array(byteNumbers)], { type: mime });
  }

  // Descarga confiable en cualquier dispositivo (incluidos celulares): si el PDF
  // está embebido en pdfs-data.js, se arma un blob en memoria y se dispara la
  // descarga desde ahí, sin depender de que el navegador pueda acceder a un
  // archivo suelto en la carpeta /pdfs/ (eso es lo que fallaba en algunos
  // celulares al abrir el sitio directamente desde el archivo).
  window.downloadEmbeddedPdf = function (key, filename) {
    try {
      const base64 = window.PDFS_BASE64 && window.PDFS_BASE64[key];
      if (!base64) { showToast("No se pudo descargar el PDF"); return; }
      const blob = base64ToBlob(base64, "application/pdf");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // En algunos navegadores móviles el "download" no dispara automáticamente;
      // como respaldo, si en 400ms no pasó nada, se abre el PDF en una pestaña
      // nueva para que el usuario pueda guardarlo manualmente.
      setTimeout(() => { try { window.open(url, "_blank"); } catch (e) {} }, 400);
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      showToast("No se pudo descargar el PDF");
    }
  };

  function pdfButton(label, filename, careerId) {
    if (filename) {
      const key = careerId + "/" + filename;
      const isEmbedded = typeof PDFS_BASE64 !== "undefined" && PDFS_BASE64[key];
      if (isEmbedded) {
        return `<button type="button" class="download-btn" onclick="downloadEmbeddedPdf('${key}','${filename}')">
          <span>${label}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><polyline points="7 10 12 15 17 10"/><path d="M5 19h14"/></svg>
        </button>`;
      }
      // Respaldo por si se agrega un PDF nuevo sin re-generar pdfs-data.js
      return `<a class="download-btn" href="pdfs/${careerId}/${filename}" download="${filename}" target="_blank" rel="noopener">
        <span>${label}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><polyline points="7 10 12 15 17 10"/><path d="M5 19h14"/></svg>
      </a>`;
    }
    return `<span class="download-btn disabled">
      <span>${label}</span>
      <small>Próximamente disponible</small>
    </span>`;
  }

  function openDetail(id) {
    const c = CAREERS.find(x => x.id === id);
    if (!c) return;

    const salaryHasData = c.salario && (c.salario.junior || c.salario.semiSenior || c.salario.senior);

    detailContent.innerHTML = `
      <div class="detail-header">
        <span class="detail-icon" aria-hidden="true">${c.icono}</span>
        <div>
          <span class="detail-category">${c.categoria}</span>
          <h2 class="detail-title" id="detailTitle">${c.nombre}</h2>
          ${institucionNombres(c.institucion).length ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">${institucionNombres(c.institucion).map(n => `<span class="badge-institucion">🏛️ ${n}</span>`).join("")}</div>` : ""}
          ${c.modalidadInstituciones ? `<p style="margin:8px 0 0;font-size:.82rem;color:var(--text-faint);">🧭 ${c.modalidadInstituciones}</p>` : ""}
          ${c.duracionInstituciones ? `<p style="margin:4px 0 0;font-size:.82rem;color:var(--text-faint);">⏳ ${c.duracionInstituciones}</p>` : ""}
        </div>
      </div>

      ${!c.investigado ? `
        <div class="detail-unverified-banner">
          <strong>Ficha en construcción.</strong> Todavía no se investigó esta carrera a fondo con fuentes verificadas de Argentina.
          ${c.faltaInvestigar && c.faltaInvestigar.length ? `<br><br><strong>Falta confirmar:</strong> ${c.faltaInvestigar.join(" · ")}` : ""}
        </div>
      ` : ""}

      <div class="detail-stats">
        <div class="stat-box"><div class="stat-label">Duración</div><div class="stat-value">${c.duracionAnios ? c.duracionAnios + " años" : "No disponible"}</div></div>
        <div class="stat-box"><div class="stat-label">Carga horaria</div><div class="stat-value">${c.cargaHoraria || "No disponible"}</div></div>
        <div class="stat-box"><div class="stat-label">Dificultad</div><div class="stat-value">${c.dificultad || "No disponible"}</div></div>
      </div>

      <div class="detail-section">
        <h3>🎯 ¿Qué hace este profesional?</h3>
        <p>${textOr(c.queHace)}</p>
      </div>

      <div class="detail-section">
        <h3>🧩 ¿Qué problemas resuelve?</h3>
        <p>${textOr(c.problemasQueResuelve)}</p>
      </div>

      <div class="detail-section">
        <h3>🙋 Perfil recomendado</h3>
        <p>${textOr(c.perfilRecomendado)}</p>
      </div>

      <div class="detail-section">
        <h3>🛠️ Habilidades necesarias</h3>
        ${renderTags(c.habilidades)}
      </div>

      <div class="detail-section">
        <h3>📚 Materias principales</h3>
        ${renderTags(c.materiasPrincipales)}
      </div>

      <div class="detail-section">
        <h3>🔬 Áreas de especialización</h3>
        ${renderTags(c.especializaciones)}
      </div>

      <div class="detail-section">
        <h3>💼 Salidas laborales</h3>
        ${renderList(c.salidasLaborales)}
      </div>

      <div class="detail-section">
        <h3>🏢 Empresas en Argentina</h3>
        ${renderTags(c.empresasArgentinas)}
      </div>

      <div class="detail-section">
        <h3>🏛️ Organismos públicos</h3>
        ${renderTags(c.organismosPublicos)}
      </div>

      <div class="detail-section">
        <h3>🧭 Modalidades de trabajo</h3>
        <div class="detail-stats">
          <div class="stat-box"><div class="stat-label">Independiente</div><div class="stat-value" style="font-size:.85rem;font-weight:400;">${textOr(c.trabajoIndependiente)}</div></div>
          <div class="stat-box"><div class="stat-label">Remoto</div><div class="stat-value" style="font-size:.85rem;font-weight:400;">${textOr(c.trabajoRemoto)}</div></div>
          <div class="stat-box"><div class="stat-label">Para el exterior</div><div class="stat-value" style="font-size:.85rem;font-weight:400;">${textOr(c.trabajoExterior)}</div></div>
        </div>
      </div>

      <div class="detail-section">
        <h3>📊 Demanda laboral actual en Argentina</h3>
        <p>${textOr(c.demandaActual)}</p>
      </div>

      <div class="detail-section">
        <h3>📈 Proyección laboral</h3>
        <p>${textOr(c.proyeccion)}</p>
      </div>

      <div class="detail-section">
        <h3>💰 Salarios de referencia en Argentina</h3>
        ${salaryHasData ? `
          <div class="salary-grid">
            <div class="salary-card"><div class="lvl">Junior</div><div class="amt">${c.salario.junior || "—"}</div></div>
            <div class="salary-card"><div class="lvl">Semi senior</div><div class="amt">${c.salario.semiSenior || "—"}</div></div>
            <div class="salary-card"><div class="lvl">Senior</div><div class="amt">${c.salario.senior || "—"}</div></div>
          </div>
          <p class="salary-note">Valores aproximados en ${c.salario.moneda || "ARS"}. Referencia: ${c.salario.fechaReferencia || "no especificada"}. ${c.salario.nota ? c.salario.nota : ""}</p>
          <p class="salary-sources">Fuentes: ${c.salario.fuentes && c.salario.fuentes.length ? c.salario.fuentes.join(" · ") : "no especificadas"}</p>
        ` : `<p class="empty-field" style="color:var(--text-faint)">No pudo verificarse un rango salarial confiable para esta carrera todavía.</p>`}
      </div>

      <div class="detail-section">
        <h3>🧰 Tecnologías y herramientas utilizadas</h3>
        ${renderTags(c.herramientas)}
      </div>

      <div class="detail-section">
        <h3>✅ Ventajas</h3>
        ${renderList(c.ventajas)}
      </div>

      <div class="detail-section">
        <h3>⚠️ Desafíos</h3>
        ${renderList(c.desafios)}
      </div>

      <div class="detail-section">
        <h3>✨ Datos interesantes</h3>
        ${renderList(c.datosInteresantes)}
      </div>

      <div class="detail-section">
        <h3>📝 Mi experiencia personal</h3>
        <div class="experience-box">${c.experienciaPersonal && c.experienciaPersonal.trim() !== "" ? c.experienciaPersonal : "Espacio libre para que agregues tu propia experiencia con esta carrera (editá el campo experienciaPersonal en careers-data.js)."}</div>
      </div>

      <div class="detail-section">
        <h3>📥 Material descargable</h3>
        <div class="downloads-grid">
          ${pdfButton("Plan de estudios", c.pdfs.plan, c.id)}
          ${pdfButton("Programa", c.pdfs.programa, c.id)}
          ${pdfButton("Información adicional", c.pdfs.info, c.id)}
        </div>
      </div>
    `;

    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    overlay.scrollTop = 0;
    history.pushState({ careerId: id }, "", "#" + id);
  }

  function closeDetail() {
    overlay.classList.remove("open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (location.hash) history.pushState({}, "", location.pathname + location.search);
  }

  closeDetailBtn.addEventListener("click", closeDetail);
  overlay.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDetail(); });
  window.addEventListener("popstate", () => { if (overlay.classList.contains("open")) closeDetail(); });

  // Deep-link: si la URL trae un hash de carrera al cargar, abrir directo
  window.addEventListener("DOMContentLoaded", () => {
    const hash = location.hash.replace("#", "");
    if (hash && CAREERS.some(c => c.id === hash)) openDetail(hash);
  });

  /* ---------------------- Tema claro/oscuro ---------------------- */
  const themeToggle = document.getElementById("themeToggle");
  const iconMoon = document.getElementById("iconMoon");
  const iconSun = document.getElementById("iconSun");
  const root = document.documentElement;

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    iconMoon.style.display = theme === "dark" ? "none" : "block";
    iconSun.style.display = theme === "dark" ? "block" : "none";
    try { localStorage.setItem("ov-theme", theme); } catch (e) { /* modo privado: se ignora */ }
  }

  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem("ov-theme"); } catch (e) {}
    if (saved) { applyTheme(saved); return; }
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");
  })();

  themeToggle.addEventListener("click", () => {
    const current = root.getAttribute("data-theme");
    applyTheme(current === "dark" ? "light" : "dark");
  });

  /* ---------------------- Compartir ---------------------- */
  const shareBtn = document.getElementById("shareBtn");
  const toast = document.getElementById("toast");

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2600);
  }

  shareBtn.addEventListener("click", async () => {
    const shareData = {
      title: document.title,
      text: "Guía de orientación vocacional: carreras, salidas laborales y sueldos en Argentina.",
      url: location.href
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch (e) { /* usuario canceló */ }
    } else {
      try {
        await navigator.clipboard.writeText(location.href);
        showToast("Enlace copiado al portapapeles ✓");
      } catch (e) {
        showToast("No se pudo copiar el enlace");
      }
    }
  });

  /* ---------------------- Volver arriba ---------------------- */
  const backToTop = document.getElementById("backToTop");
  window.addEventListener("scroll", () => {
    backToTop.classList.toggle("visible", window.scrollY > 480);
  });
  backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ---------------------- Primer render ---------------------- */
  renderGrid();

})();
