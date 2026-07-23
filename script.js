/* =====================================================================
   script.js — lógica de la página (JavaScript puro, sin frameworks)
   ===================================================================== */

(function () {
  "use strict";

  const grid = document.getElementById("careersGrid");
  const searchInput = document.getElementById("searchInput");
  const searchClearBtn = document.getElementById("searchClear");
  const searchSuggestions = document.getElementById("searchSuggestions");
  const searchHint = document.getElementById("searchHint");
  const chipsWrap = document.getElementById("categoryChips");
  const titleChipsWrap = document.getElementById("titleChips");
  const modalityChipsWrap = document.getElementById("modalityChips");
  const durationChipsWrap = document.getElementById("durationChips");
  const institutionSelect = document.getElementById("institutionFilter");
  const sortSelect = document.getElementById("sortSelect");
  const clearFiltersBtn = document.getElementById("clearFilters");
  const filtersToggleBtn = document.getElementById("filtersToggle");
  const filtersPanel = document.getElementById("filtersPanel");
  const filtersActiveBadge = document.getElementById("filtersActiveBadge");
  const resultsCount = document.getElementById("resultsCount");
  const noResults = document.getElementById("noResults");
  const totalCarrerasEl = document.getElementById("totalCarreras");

  let activeCategory = "Todas";
  let activeTitleType = "Todos";
  let activeModality = "Todas";
  let activeDuration = "Todas";
  let activeInstitution = "todas";
  let activeSort = "relevancia";
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

  /* ---------------------- Chips de duración ---------------------- */
  // Clasifica la duración en baldes simples y legibles para un estudiante
  // de secundario que recién está comparando opciones.
  function duracionCategoria(anios) {
    if (anios === null || anios === undefined) return "Variable / posgrado";
    if (anios <= 2) return "Corta (hasta 2 años)";
    if (anios <= 4) return "Media (3 a 4 años)";
    return "Larga (5 años o más)";
  }
  const duraciones = ["Todas", "Corta (hasta 2 años)", "Media (3 a 4 años)", "Larga (5 años o más)", "Variable / posgrado"];

  duraciones.forEach(dur => {
    const btn = document.createElement("button");
    btn.className = "chip" + (dur === "Todas" ? " active" : "");
    btn.textContent = dur;
    btn.setAttribute("role", "tab");
    btn.addEventListener("click", () => {
      activeDuration = dur;
      durationChipsWrap.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      renderGrid();
      updateClearButton();
    });
    durationChipsWrap.appendChild(btn);
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

  /* ---------------------- Ordenar por ---------------------- */
  sortSelect.addEventListener("change", (e) => {
    activeSort = e.target.value;
    renderGrid();
    updateClearButton();
  });

  /* ---------------------- Limpiar filtros ---------------------- */
  function updateClearButton() {
    const hayFiltros = activeCategory !== "Todas" || activeTitleType !== "Todos" || activeModality !== "Todas"
      || activeDuration !== "Todas" || activeInstitution !== "todas" || activeSort !== "relevancia" || query !== "";
    clearFiltersBtn.hidden = !hayFiltros;

    // El badge solo cuenta los filtros que viven DENTRO del panel plegable
    // (tipo de título, modalidad, duración, institución, orden), no la
    // categoría ni la búsqueda, que quedan siempre visibles afuera.
    const activosEnPanel = [
      activeTitleType !== "Todos",
      activeModality !== "Todas",
      activeDuration !== "Todas",
      activeInstitution !== "todas",
      activeSort !== "relevancia"
    ].filter(Boolean).length;
    filtersActiveBadge.textContent = activosEnPanel;
    filtersActiveBadge.hidden = activosEnPanel === 0;
  }

  /* ---------------------- Plegar / desplegar filtros avanzados ---------------------- */
  // Colapsado por defecto: se abre para tocar los filtros, se cierra para
  // no molestar al buscador, y todo sigue filtrando igual estando oculto
  // porque el estado vive en las variables de JS, no en la visibilidad del DOM.
  filtersToggleBtn.addEventListener("click", () => {
    const abierto = filtersToggleBtn.getAttribute("aria-expanded") === "true";
    filtersToggleBtn.setAttribute("aria-expanded", String(!abierto));
    filtersPanel.hidden = abierto;
  });

  clearFiltersBtn.addEventListener("click", () => {
    activeCategory = "Todas";
    activeTitleType = "Todos";
    activeModality = "Todas";
    activeDuration = "Todas";
    activeInstitution = "todas";
    activeSort = "relevancia";
    query = "";
    searchInput.value = "";
    hideSuggestions();
    searchClearBtn.hidden = true;
    searchHint.hidden = true;
    chipsWrap.querySelectorAll(".chip").forEach((c, i) => c.classList.toggle("active", i === 0));
    titleChipsWrap.querySelectorAll(".chip").forEach((c, i) => c.classList.toggle("active", i === 0));
    modalityChipsWrap.querySelectorAll(".chip").forEach((c, i) => c.classList.toggle("active", i === 0));
    durationChipsWrap.querySelectorAll(".chip").forEach((c, i) => c.classList.toggle("active", i === 0));
    institutionSelect.value = "todas";
    sortSelect.value = "relevancia";
    renderGrid();
    updateClearButton();
  });

  /* ---------------------- Buscador ---------------------- */
  // Sin esto, buscar "ingenieria" (como escribe la mayoría en el celular)
  // no encontraría "Ingeniería" por la tilde. Se normaliza todo (haystack
  // y consulta) sacando los diacríticos antes de comparar.
  function normalizeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // El haystack ahora incluye mucho más que nombre/descripción/categoría:
  // salidas laborales, habilidades, materias, empresas, datos interesantes
  // e institución. Así "programación" encuentra Ingeniería en Sistemas,
  // "sueldo alto" no sirve como texto libre pero "docente" sí encuentra
  // carreras cuya salida laboral es dar clases, aunque no lo diga el nombre.
  function buildHaystack(c) {
    const partes = [
      c.nombre, c.descripcionBreve, c.categoria, c.queHace,
      c.salidasLaborales, c.habilidades, c.materiasPrincipales,
      c.empresasArgentinas, c.organismosPublicos, c.datosInteresantes,
      c.especializaciones, institucionNombres(c.institucion)
    ];
    return partes
      .flat()
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }
  function normalizedHaystack(c) {
    return normalizeAccents(buildHaystack(c));
  }
  // Precalculado una sola vez: recorrer 139 carreras en cada tecleo es barato,
  // pero armar el string es lo único que vale la pena cachear.
  const haystackCache = new Map();
  function haystackOf(c) {
    if (!haystackCache.has(c.id)) haystackCache.set(c.id, normalizedHaystack(c));
    return haystackCache.get(c.id);
  }

  // Búsqueda por palabras: "ingeniero sueldo alto" exige que las tres
  // palabras aparezcan en algún lugar de la ficha, no como frase exacta.
  function matchesQuery(c, q) {
    if (!q) return true;
    const haystack = haystackOf(c);
    const words = normalizeAccents(q).split(/\s+/).filter(Boolean);
    return words.every(w => haystack.includes(w));
  }
  // Para el hint: ¿el match vino del nombre, o solo de campos ampliados?
  function matchesNameOnly(c, q) {
    if (!q) return true;
    const nombreLower = normalizeAccents(c.nombre.toLowerCase());
    const words = normalizeAccents(q).split(/\s+/).filter(Boolean);
    return words.every(w => nombreLower.includes(w));
  }

  function hideSuggestions() {
    searchSuggestions.hidden = true;
    searchSuggestions.innerHTML = "";
    searchInput.setAttribute("aria-expanded", "false");
  }

  const ACCENT_MAP = { a: "[aá]", e: "[eé]", i: "[ií]", o: "[oó]", u: "[uúü]", n: "[nñ]" };
  function accentInsensitivePattern(word) {
    return word.split("").map(ch => {
      const lower = ch.toLowerCase();
      if (ACCENT_MAP[lower]) return ACCENT_MAP[lower];
      return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("");
  }

  function highlightMatch(text, q) {
    if (!q) return text;
    const words = normalizeAccents(q).split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
    let out = text;
    words.forEach(w => {
      out = out.replace(new RegExp("(" + accentInsensitivePattern(w) + ")", "ig"), "<mark>$1</mark>");
    });
    return out;
  }

  let suggestionIndex = -1;

  function renderSuggestions(q) {
    if (!q) { hideSuggestions(); return; }
    const matches = CAREERS.filter(c => matchesQuery(c, q)).slice(0, 7);
    if (matches.length === 0) { hideSuggestions(); return; }

    searchSuggestions.innerHTML = matches.map((c, i) => `
      <button type="button" class="search-suggestion-item" data-id="${c.id}" role="option" id="suggestion-${i}">
        <span class="search-suggestion-icon" aria-hidden="true">${c.icono}</span>
        <span class="search-suggestion-text">${highlightMatch(c.nombre, q)}</span>
        <span class="search-suggestion-category">${c.categoria}</span>
      </button>
    `).join("");
    searchSuggestions.hidden = false;
    searchInput.setAttribute("aria-expanded", "true");
    suggestionIndex = -1;

    searchSuggestions.querySelectorAll(".search-suggestion-item").forEach(item => {
      item.addEventListener("click", () => {
        hideSuggestions();
        openDetail(item.dataset.id);
      });
    });
  }

  function updateSuggestionHighlight() {
    const items = searchSuggestions.querySelectorAll(".search-suggestion-item");
    items.forEach((item, i) => item.classList.toggle("active-suggestion", i === suggestionIndex));
    if (suggestionIndex >= 0 && items[suggestionIndex]) {
      items[suggestionIndex].scrollIntoView({ block: "nearest" });
    }
  }

  let debounceTimer;
  searchInput.addEventListener("input", (e) => {
    const raw = e.target.value;
    searchClearBtn.hidden = raw.trim() === "";
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      query = raw.trim().toLowerCase();
      renderGrid();
      updateClearButton();
      renderSuggestions(query);

      // Si hay resultados pero ninguno matchea por el nombre, avisamos que
      // el match viene de salidas laborales / materias / habilidades, para
      // que no parezca un resultado "raro".
      const list = filteredCareers();
      if (query && list.length > 0 && !list.some(c => matchesNameOnly(c, query))) {
        searchHint.hidden = false;
        searchHint.textContent = `No hay carreras que se llamen "${query}", pero encontramos coincidencias en salidas laborales, materias o habilidades.`;
      } else {
        searchHint.hidden = true;
      }
    }, 140);
  });

  searchInput.addEventListener("keydown", (e) => {
    const items = searchSuggestions.querySelectorAll(".search-suggestion-item");
    if (searchSuggestions.hidden || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      suggestionIndex = Math.min(suggestionIndex + 1, items.length - 1);
      updateSuggestionHighlight();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      suggestionIndex = Math.max(suggestionIndex - 1, -1);
      updateSuggestionHighlight();
    } else if (e.key === "Enter" && suggestionIndex >= 0) {
      e.preventDefault();
      hideSuggestions();
      openDetail(items[suggestionIndex].dataset.id);
    } else if (e.key === "Escape") {
      hideSuggestions();
    }
  });

  searchInput.addEventListener("focus", () => { if (query) renderSuggestions(query); });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) hideSuggestions();
  });

  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    query = "";
    searchClearBtn.hidden = true;
    searchHint.hidden = true;
    hideSuggestions();
    searchInput.focus();
    renderGrid();
    updateClearButton();
  });

  /* ---------------------- Orden ---------------------- */
  // Extrae el primer número del rango de sueldo junior ("700.000 – 1.400.000"
  // → 700000). Las fichas de posgrado/diplomatura tienen "N/A" y quedan al
  // final cuando se ordena por sueldo.
  function sueldoJuniorNumero(c) {
    const j = c.salario && c.salario.junior;
    if (!j) return -1;
    const digits = j.replace(/\./g, "").match(/\d+/);
    return digits ? parseInt(digits[0], 10) : -1;
  }
  function ordenarCareers(list) {
    const arr = list.slice();
    switch (activeSort) {
      case "az":
        return arr.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      case "duracion-asc":
        return arr.sort((a, b) => (a.duracionAnios ?? 99) - (b.duracionAnios ?? 99));
      case "duracion-desc":
        return arr.sort((a, b) => (b.duracionAnios ?? -1) - (a.duracionAnios ?? -1));
      case "sueldo-desc":
        return arr.sort((a, b) => sueldoJuniorNumero(b) - sueldoJuniorNumero(a));
      default:
        return arr; // "relevancia": orden alfabético que ya trae CAREERS
    }
  }

  /* ---------------------- Render de la grilla ---------------------- */
  function filteredCareers() {
    return CAREERS.filter(c => {
      const matchesCategory = activeCategory === "Todas" || c.categoria === activeCategory;
      const matchesTitleType = activeTitleType === "Todos" || tipoTitulo(c.nombre) === activeTitleType;
      const matchesModality = activeModality === "Todas"
        || (activeModality === "Presencial" && esPresencial(c))
        || (activeModality === "Virtual" && esVirtual(c));
      const matchesDuration = activeDuration === "Todas" || duracionCategoria(c.duracionAnios) === activeDuration;
      const matchesInstitution = activeInstitution === "todas" || institucionIds(c).includes(activeInstitution);
      return matchesCategory && matchesTitleType && matchesModality && matchesDuration && matchesInstitution && matchesQuery(c, query);
    });
  }

  function renderGrid() {
    const list = ordenarCareers(filteredCareers());
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
