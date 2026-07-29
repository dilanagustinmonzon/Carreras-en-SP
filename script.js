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
  let showOnlyFavorites = false;

  totalCarrerasEl.textContent = CAREERS.length;

  /* ---------------------- Estadísticas del sitio ---------------------- */
  (function renderSiteStats() {
    const statsEl = document.getElementById("siteStats");
    if (!statsEl) return;
    const totalInstituciones = Object.keys(INSTITUCIONES).length;
    const totalCategorias = new Set(CAREERS.map(c => c.categoria)).size;
    const conFuenteReal = CAREERS.filter(c =>
      c.salario && c.salario.fuentes && c.salario.fuentes.length &&
      !c.salario.fuentes[0].startsWith("Estimación interna")
    ).length;
    const pctReal = Math.round((conFuenteReal / CAREERS.length) * 100);

    statsEl.innerHTML = `
      <div class="stat-item"><span class="stat-number">${CAREERS.length}</span><span class="stat-label">Carreras</span></div>
      <div class="stat-item"><span class="stat-number">${totalInstituciones}</span><span class="stat-label">Instituciones</span></div>
      <div class="stat-item"><span class="stat-number">${totalCategorias}</span><span class="stat-label">Áreas de estudio</span></div>
      <div class="stat-item"><span class="stat-number">${pctReal}%</span><span class="stat-label">Con sueldo de fuentes relevadas</span></div>
    `;
  })();

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

  /* ---------------------- Comparador de instituciones ---------------------- */
  const institucionesCompareBody = document.getElementById("institucionesCompareBody");
  if (institucionesCompareBody && typeof INSTITUCIONES === "object") {
    const filasOrdenadas = Object.entries(INSTITUCIONES).sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, "es"));
    institucionesCompareBody.innerHTML = filasOrdenadas.map(([instId, inst]) => {
      const cantidad = CAREERS.filter(c => institucionIds(c).includes(instId)).length;
      return `
        <tr>
          <td>${inst.nombre}</td>
          <td>${inst.tipo}</td>
          <td>${inst.modalidad.length > 90 ? inst.modalidad.slice(0, 90).trim() + "…" : inst.modalidad}</td>
          <td>${cantidad}</td>
          <td>${inst.direccion}</td>
          <td><button type="button" class="compare-view-btn institucion-view-btn" data-id="${instId}">Ver carreras →</button></td>
        </tr>
      `;
    }).join("");

    institucionesCompareBody.querySelectorAll(".institucion-view-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const instId = btn.dataset.id;
        activeInstitution = instId;
        institutionSelect.value = instId;
        renderGrid();
        updateClearButton();
        const carrerasSection = document.getElementById("carreras");
        if (carrerasSection) carrerasSection.scrollIntoView({ behavior: "smooth", block: "start" });
      });
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
      const matchesFavorite = !showOnlyFavorites || isFavorite(c.id);
      return matchesCategory && matchesTitleType && matchesModality && matchesDuration && matchesInstitution && matchesFavorite && matchesQuery(c, query);
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

      const inCompare = isInCompare(career.id);
      const isFav = isFavorite(career.id);

      card.innerHTML = `
        <button type="button" class="card-fav-btn${isFav ? " active" : ""}" data-id="${career.id}" aria-pressed="${isFav ? "true" : "false"}" aria-label="${isFav ? "Quitar de favoritos" : "Agregar a favoritos"}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>
        </button>
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
        <div class="card-actions">
          <button type="button" class="compare-toggle-btn${inCompare ? " active" : ""}" data-id="${career.id}" aria-pressed="${inCompare ? "true" : "false"}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <span class="compare-toggle-label">${inCompare ? "En comparación" : "Comparar"}</span>
          </button>
          <span class="card-cta">Ver información
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </span>
        </div>
      `;

      card.addEventListener("click", () => openDetail(career.id));
      card.addEventListener("keypress", (e) => { if (e.key === "Enter") openDetail(career.id); });

      const compareBtn = card.querySelector(".compare-toggle-btn");
      compareBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleCompare(career.id);
      });
      compareBtn.addEventListener("keypress", (e) => e.stopPropagation());

      const favBtn = card.querySelector(".card-fav-btn");
      favBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleFavorite(career.id);
      });
      favBtn.addEventListener("keypress", (e) => e.stopPropagation());

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

    const related = relatedCareers(c, 3);
    const relatedHTML = related.length ? `
      <div class="detail-section">
        <h3>🔎 Carreras relacionadas</h3>
        <div class="related-careers-grid">
          ${related.map(rc => `
            <button type="button" class="related-career-card" data-id="${rc.id}">
              <span class="related-icon" aria-hidden="true">${rc.icono}</span>
              <span class="related-info">
                <strong>${rc.nombre}</strong>
                <span class="related-meta">${rc.categoria}</span>
              </span>
              <svg class="related-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>
          `).join("")}
        </div>
      </div>
    ` : "";

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

      <div class="detail-quick-actions">
        <button type="button" id="speakBtn" class="quick-action-btn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>
          <span id="speakBtnLabel">Escuchar esta ficha</span>
        </button>
        <button type="button" id="downloadPdfBtn" class="quick-action-btn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12"/><polyline points="7 10 12 15 17 10"/><path d="M5 19h14"/></svg>
          <span id="downloadPdfBtnLabel">Descargar ficha en PDF</span>
        </button>
        <button type="button" id="shareWhatsappBtn" class="quick-action-btn whatsapp-quick-btn">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.35 5.07L2 22l5.06-1.33A9.94 9.94 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18c-1.6 0-3.09-.46-4.35-1.26l-.31-.19-3.01.79.8-2.93-.2-.3A7.95 7.95 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8-8 8zm4.4-5.9c-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.34-1.68-.14-.24-.01-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.19-.47-.39-.4-.54-.41-.14-.01-.3-.01-.46-.01-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.57.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28z"/></svg>
          <span>Compartir por WhatsApp</span>
        </button>
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

      ${buildTimelineHTML(c)}

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
          ${buildSalaryChartHTML(c)}
          <div class="salary-grid">
            <div class="salary-card">
              <div class="lvl">Junior</div>
              <div class="amt">${c.salario.junior || "—"}</div>
              ${c.salario.juniorUSD ? `<div class="amt-usd">${c.salario.juniorUSD} /mes</div>` : ""}
            </div>
            <div class="salary-card">
              <div class="lvl">Semi senior</div>
              <div class="amt">${c.salario.semiSenior || "—"}</div>
              ${c.salario.semiSeniorUSD ? `<div class="amt-usd">${c.salario.semiSeniorUSD} /mes</div>` : ""}
            </div>
            <div class="salary-card">
              <div class="lvl">Senior</div>
              <div class="amt">${c.salario.senior || "—"}</div>
              ${c.salario.seniorUSD ? `<div class="amt-usd">${c.salario.seniorUSD} /mes</div>` : ""}
            </div>
          </div>
          <p class="salary-note">Valores aproximados en ${c.salario.moneda || "ARS"}. Referencia: ${c.salario.fechaReferencia || "no especificada"}. Equivalente en dólares calculado a ~$1.500 ARS = US$1 (referencia julio 2026; varía día a día). ${c.salario.nota ? c.salario.nota : ""}</p>
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

      ${relatedHTML}

      <div class="detail-section">
        <h3>📥 Material descargable</h3>
        <div class="downloads-grid">
          ${pdfButton("Plan de estudios", c.pdfs.plan, c.id)}
          ${pdfButton("Programa", c.pdfs.programa, c.id)}
          ${pdfButton("Información adicional", c.pdfs.info, c.id)}
        </div>
      </div>
    `;

    stopSpeech();
    const speakBtn = document.getElementById("speakBtn");
    const downloadPdfBtn = document.getElementById("downloadPdfBtn");
    if (speakBtn) {
      if (!("speechSynthesis" in window)) {
        speakBtn.hidden = true;
      } else {
        speakBtn.addEventListener("click", () => toggleSpeech(c));
      }
    }
    if (downloadPdfBtn) {
      downloadPdfBtn.addEventListener("click", () => downloadCareerPdf(c));
    }
    const shareWhatsappBtn = document.getElementById("shareWhatsappBtn");
    if (shareWhatsappBtn) {
      shareWhatsappBtn.addEventListener("click", () => shareCareerOnWhatsapp(c));
    }
    detailContent.querySelectorAll(".related-career-card").forEach((btn) => {
      btn.addEventListener("click", () => openDetail(btn.dataset.id));
    });

    overlay.classList.add("open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    overlay.scrollTop = 0;
    history.pushState({ careerId: id }, "", "#" + id);
  }

  function closeDetail() {
    stopSpeech();
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

  /* ---------------------- Accesibilidad: lectura en voz alta ---------------------- */
  let speechState = "idle"; // idle | playing | paused

  function buildSpeechText(c) {
    const parts = [`Ficha de ${c.nombre}.`];
    if (c.categoria) parts.push(`Categoría: ${c.categoria}.`);
    if (c.queHace) parts.push(`¿Qué hace este profesional? ${c.queHace}`);
    if (c.problemasQueResuelve) parts.push(`¿Qué problemas resuelve? ${c.problemasQueResuelve}`);
    if (c.perfilRecomendado) parts.push(`Perfil recomendado: ${c.perfilRecomendado}`);
    if (c.duracionAnios) parts.push(`Duración: ${c.duracionAnios} años.`);
    if (c.habilidades && c.habilidades.length) parts.push(`Habilidades necesarias: ${c.habilidades.join(", ")}.`);
    if (c.salidasLaborales && c.salidasLaborales.length) parts.push(`Salidas laborales: ${c.salidasLaborales.join(", ")}.`);
    if (c.salario && (c.salario.junior || c.salario.semiSenior || c.salario.senior)) {
      parts.push(`Sueldos de referencia en Argentina. Junior: ${c.salario.junior || "no disponible"}${c.salario.juniorUSD ? ", equivalente aproximado " + c.salario.juniorUSD.replace("US$", "dólares") : ""}. Semi senior: ${c.salario.semiSenior || "no disponible"}. Senior: ${c.salario.senior || "no disponible"}.`);
    }
    if (c.ventajas && c.ventajas.length) parts.push(`Ventajas: ${c.ventajas.join(". ")}.`);
    if (c.desafios && c.desafios.length) parts.push(`Desafíos a tener en cuenta: ${c.desafios.join(". ")}.`);
    return parts.join(" ");
  }

  function updateSpeakButtonLabel() {
    const label = document.getElementById("speakBtnLabel");
    if (!label) return;
    if (speechState === "playing") label.textContent = "Pausar lectura";
    else if (speechState === "paused") label.textContent = "Continuar lectura";
    else label.textContent = "Escuchar esta ficha";
  }

  function toggleSpeech(c) {
    if (!("speechSynthesis" in window)) return;

    if (speechState === "playing") {
      window.speechSynthesis.pause();
      speechState = "paused";
      updateSpeakButtonLabel();
      return;
    }
    if (speechState === "paused") {
      window.speechSynthesis.resume();
      speechState = "playing";
      updateSpeakButtonLabel();
      return;
    }

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(buildSpeechText(c));
    utter.lang = "es-AR";
    utter.rate = 0.98;
    utter.onend = () => { speechState = "idle"; updateSpeakButtonLabel(); };
    utter.onerror = () => { speechState = "idle"; updateSpeakButtonLabel(); };
    window.speechSynthesis.speak(utter);
    speechState = "playing";
    updateSpeakButtonLabel();
  }

  function stopSpeech() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    speechState = "idle";
  }

  // Si el usuario cambia de pestaña o cierra el navegador, no dejar la voz sonando sola
  window.addEventListener("pagehide", stopSpeech);

  /* ---------------------- Accesibilidad: descargar ficha en PDF ---------------------- */
  // El PDF replica la identidad visual del sitio (modo oscuro): mismos colores,
  // mismas tipografías (Fraunces para títulos, Inter para texto) y el isotipo
  // de la brújula en el encabezado y pie de página.
  let jsPdfLoadPromise = null;
  let pdfAssetsPromise = null;

  const PDF_COLORS = {
    bg: [14, 20, 32],        // --bg (oscuro)
    card: [22, 30, 46],      // --card (oscuro)
    cardBorder: [38, 47, 66],// --card-border (oscuro)
    text: [234, 237, 244],   // --text (oscuro)
    textMuted: [160, 168, 186], // --text-muted (oscuro)
    textFaint: [107, 115, 133], // --text-faint (oscuro)
    accent: [227, 167, 91],  // --accent (oscuro)
  };

  function loadJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
    if (jsPdfLoadPromise) return jsPdfLoadPromise;
    jsPdfLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      script.onload = () => {
        if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
        else reject(new Error("No se pudo preparar el generador de PDF."));
      };
      script.onerror = () => reject(new Error("No se pudo descargar el generador de PDF. Revisá tu conexión."));
      document.head.appendChild(script);
    });
    return jsPdfLoadPromise;
  }

  // Convierte un archivo (fuente o imagen) a base64 para incrustarlo en el PDF.
  // Se cargan una sola vez y se reutilizan en las descargas siguientes.
  function fetchAsBase64(url) {
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error("No se pudo cargar " + url);
      return r.arrayBuffer();
    }).then((buf) => {
      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
      }
      return btoa(binary);
    });
  }

  function loadPdfAssets() {
    if (pdfAssetsPromise) return pdfAssetsPromise;
    pdfAssetsPromise = Promise.all([
      fetchAsBase64("assets/fonts/Fraunces-SemiBold.ttf"),
      fetchAsBase64("assets/fonts/Fraunces-Bold.ttf"),
      fetchAsBase64("assets/fonts/Inter-Regular.ttf"),
      fetchAsBase64("assets/fonts/Inter-SemiBold.ttf"),
      fetchAsBase64("assets/fonts/Inter-Bold.ttf"),
      fetchAsBase64("assets/logo-mark.png"),
    ]).then(([frauncesSemiBold, frauncesBold, interRegular, interSemiBold, interBold, logoMark]) => ({
      frauncesSemiBold, frauncesBold, interRegular, interSemiBold, interBold, logoMark
    }));
    return pdfAssetsPromise;
  }

  function downloadCareerPdf(c) {
    const btnLabel = document.getElementById("downloadPdfBtnLabel");
    const originalLabel = btnLabel ? btnLabel.textContent : null;
    if (btnLabel) btnLabel.textContent = "Generando PDF…";

    Promise.all([loadJsPDF(), loadPdfAssets()]).then(([jsPDF, assets]) => {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 48;
      const maxWidth = pageWidth - marginX * 2;
      const contentTop = 132;
      const footerReserve = 46;

      // ---- Registrar tipografías propias del sitio ----
      doc.addFileToVFS("Fraunces-SemiBold.ttf", assets.frauncesSemiBold);
      doc.addFont("Fraunces-SemiBold.ttf", "FrauncesSB", "normal");
      doc.addFileToVFS("Fraunces-Bold.ttf", assets.frauncesBold);
      doc.addFont("Fraunces-Bold.ttf", "FrauncesBold", "normal");
      doc.addFileToVFS("Inter-Regular.ttf", assets.interRegular);
      doc.addFont("Inter-Regular.ttf", "Inter", "normal");
      doc.addFileToVFS("Inter-SemiBold.ttf", assets.interSemiBold);
      doc.addFont("Inter-SemiBold.ttf", "InterSB", "normal");
      doc.addFileToVFS("Inter-Bold.ttf", assets.interBold);
      doc.addFont("Inter-Bold.ttf", "InterBold", "normal");

      let y = contentTop;
      let pageNum = 1;

      function paintBackground() {
        doc.setFillColor(...PDF_COLORS.bg);
        doc.rect(0, 0, pageWidth, pageHeight, "F");
      }

      function drawContinuationHeader() {
        doc.addImage(assets.logoMark, "PNG", marginX, 30, 18, 18);
        doc.setFont("InterSB", "normal"); doc.setFontSize(9); doc.setTextColor(...PDF_COLORS.accent);
        doc.text("ORIENTACIÓN VOCACIONAL", marginX + 26, 42);
        doc.setDrawColor(...PDF_COLORS.cardBorder);
        doc.setLineWidth(0.75);
        doc.line(marginX, 66, pageWidth - marginX, 66);
      }

      function newPage() {
        doc.addPage();
        pageNum++;
        paintBackground();
        drawContinuationHeader();
        y = 92;
      }

      function ensureSpace(h) {
        if (y + h > pageHeight - footerReserve) newPage();
      }

      function addHeading(text) {
        ensureSpace(28); y += 14;
        doc.setFont("FrauncesSB", "normal"); doc.setFontSize(13); doc.setTextColor(...PDF_COLORS.accent);
        doc.text(text, marginX, y);
        y += 17;
      }
      function addParagraph(text) {
        doc.setFont("Inter", "normal"); doc.setFontSize(10); doc.setTextColor(...PDF_COLORS.textMuted);
        doc.splitTextToSize(text, maxWidth).forEach((line) => { ensureSpace(15); doc.text(line, marginX, y); y += 14.5; });
        y += 4;
      }
      function addList(items) {
        doc.setFont("Inter", "normal"); doc.setFontSize(10);
        items.forEach((item) => {
          doc.splitTextToSize(item, maxWidth - 16).forEach((line, i) => {
            ensureSpace(15);
            if (i === 0) { doc.setTextColor(...PDF_COLORS.accent); doc.text("•", marginX, y); }
            doc.setTextColor(...PDF_COLORS.textMuted);
            doc.text(line, marginX + 14, y);
            y += 14.5;
          });
        });
        y += 4;
      }

      // Tarjeta con fondo tipo "card" del sitio, para datos clave (duración,
      // modalidad, sueldos). Mide el contenido antes de dibujar el fondo.
      function addCard(title, rows) {
        const pad = 16;
        doc.setFont("Inter", "normal"); doc.setFontSize(10);
        const innerWidth = maxWidth - pad * 2;
        const wrappedRows = rows.map((r) => doc.splitTextToSize(r, innerWidth));
        const lineCount = wrappedRows.reduce((sum, w) => sum + w.length, 0);
        const titleH = 22;
        const lineH = 14.5;
        const totalH = pad * 2 + titleH + lineCount * lineH;

        ensureSpace(totalH + 16);
        y += 10;
        doc.setFillColor(...PDF_COLORS.card);
        doc.setDrawColor(...PDF_COLORS.cardBorder);
        doc.setLineWidth(0.75);
        doc.roundedRect(marginX, y, maxWidth, totalH, 8, 8, "FD");

        let cy = y + pad + 13;
        doc.setFont("FrauncesSB", "normal"); doc.setFontSize(11.5); doc.setTextColor(...PDF_COLORS.accent);
        doc.text(title, marginX + pad, cy);
        cy += titleH;

        doc.setFont("Inter", "normal"); doc.setFontSize(10); doc.setTextColor(...PDF_COLORS.textMuted);
        wrappedRows.forEach((wrapped) => {
          wrapped.forEach((line) => { doc.text(line, marginX + pad, cy); cy += lineH; });
        });

        y += totalH + 18;
      }

      // ---- Fondo + encabezado principal (portada) ----
      paintBackground();
      doc.addImage(assets.logoMark, "PNG", marginX, 34, 34, 34);
      doc.setFont("InterSB", "normal"); doc.setFontSize(10.5); doc.setTextColor(...PDF_COLORS.accent);
      doc.text("ORIENTACIÓN VOCACIONAL", marginX + 44, 48);
      doc.setFont("Inter", "normal"); doc.setFontSize(8.5); doc.setTextColor(...PDF_COLORS.textFaint);
      doc.text("Guía para estudiantes secundarios · Chaco", marginX + 44, 60);
      doc.setDrawColor(...PDF_COLORS.cardBorder);
      doc.setLineWidth(0.75);
      doc.line(marginX, 86, pageWidth - marginX, 86);

      y = 118;
      doc.setFont("FrauncesBold", "normal"); doc.setFontSize(20); doc.setTextColor(...PDF_COLORS.text);
      doc.splitTextToSize(c.nombre, maxWidth).forEach((line) => { ensureSpace(26); doc.text(line, marginX, y); y += 26; });

      doc.setFont("Inter", "normal"); doc.setFontSize(10); doc.setTextColor(...PDF_COLORS.textMuted);
      const subtitle = c.categoria + (institucionNombres(c.institucion).length ? " · " + institucionNombres(c.institucion).join(", ") : "");
      doc.splitTextToSize(subtitle, maxWidth).forEach((line) => { doc.text(line, marginX, y); y += 13; });
      y += 8;

      addCard("Datos generales", [
        `Duración: ${c.duracionInstituciones || (c.duracionAnios ? c.duracionAnios + " años" : "No disponible")}`,
        `Carga horaria: ${c.cargaHoraria || "No disponible"}`,
        `Dificultad: ${c.dificultad || "No disponible"}`,
        `Modalidad: ${modalidadTexto(c)}`,
      ]);

      if (c.queHace) { addHeading("¿Qué hace este profesional?"); addParagraph(c.queHace); }
      if (c.problemasQueResuelve) { addHeading("¿Qué problemas resuelve?"); addParagraph(c.problemasQueResuelve); }
      if (c.perfilRecomendado) { addHeading("Perfil recomendado"); addParagraph(c.perfilRecomendado); }
      if (c.habilidades && c.habilidades.length) { addHeading("Habilidades necesarias"); addList(c.habilidades); }
      if (c.materiasPrincipales && c.materiasPrincipales.length) { addHeading("Materias principales"); addList(c.materiasPrincipales); }
      if (c.salidasLaborales && c.salidasLaborales.length) { addHeading("Salidas laborales"); addList(c.salidasLaborales); }

      const salaryHasData = c.salario && (c.salario.junior || c.salario.semiSenior || c.salario.senior);
      if (salaryHasData) {
        const salaryRows = [
          `Junior: ${c.salario.junior || "—"}${c.salario.juniorUSD ? " (" + c.salario.juniorUSD + ")" : ""}`,
          `Semi senior: ${c.salario.semiSenior || "—"}${c.salario.semiSeniorUSD ? " (" + c.salario.semiSeniorUSD + ")" : ""}`,
          `Senior: ${c.salario.senior || "—"}${c.salario.seniorUSD ? " (" + c.salario.seniorUSD + ")" : ""}`,
          `Moneda: ${c.salario.moneda || "ARS"}. Referencia: ${c.salario.fechaReferencia || "no especificada"}.`,
        ];
        if (c.salario.fuentes && c.salario.fuentes.length) salaryRows.push(`Fuentes: ${c.salario.fuentes.join(" · ")}`);
        addCard("Salarios de referencia en Argentina", salaryRows);
      }

      if (c.ventajas && c.ventajas.length) { addHeading("Ventajas"); addList(c.ventajas); }
      if (c.desafios && c.desafios.length) { addHeading("Desafíos"); addList(c.desafios); }
      if (c.datosInteresantes && c.datosInteresantes.length) { addHeading("Datos interesantes"); addList(c.datosInteresantes); }

      // ---- Pie de página en todas las hojas ----
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(...PDF_COLORS.cardBorder);
        doc.setLineWidth(0.5);
        doc.line(marginX, pageHeight - 34, pageWidth - marginX, pageHeight - 34);
        doc.addImage(assets.logoMark, "PNG", marginX, pageHeight - 26, 11, 11);
        doc.setFont("Inter", "normal"); doc.setFontSize(8); doc.setTextColor(...PDF_COLORS.textFaint);
        doc.text(`Orientación Vocacional · ${c.nombre}`, marginX + 16, pageHeight - 18);
        doc.text(`Página ${p} de ${totalPages}`, pageWidth - marginX, pageHeight - 18, { align: "right" });
      }

      doc.save("ficha-" + c.id + ".pdf");
      if (btnLabel) btnLabel.textContent = originalLabel;
    }).catch((err) => {
      showToast(err && err.message ? err.message : "No se pudo generar el PDF");
      if (btnLabel) btnLabel.textContent = originalLabel;
    });
  }

  /* ---------------------- Favoritos ---------------------- */
  // Se guardan en este navegador/dispositivo (localStorage), así que cada
  // persona ve únicamente los suyos y nadie más los ve desde otro equipo.
  const FAVORITES_KEY = "ov-favorites";
  const favoritesToggleBtn = document.getElementById("favoritesToggle");
  const favoritesCountEl = document.getElementById("favoritesCount");

  let favoritesList = [];
  try {
    const savedFav = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    if (Array.isArray(savedFav)) favoritesList = savedFav.filter(id => CAREERS.some(c => c.id === id));
  } catch (e) { /* modo privado: se ignora */ }

  function isFavorite(id) { return favoritesList.includes(id); }

  function saveFavoritesList() {
    try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoritesList)); } catch (e) { /* modo privado */ }
  }

  function syncFavoriteButtons() {
    document.querySelectorAll(".card-fav-btn").forEach((btn) => {
      const active = isFavorite(btn.dataset.id);
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.setAttribute("aria-label", active ? "Quitar de favoritos" : "Agregar a favoritos");
      const svg = btn.querySelector("svg");
      if (svg) svg.setAttribute("fill", active ? "currentColor" : "none");
    });
  }

  function updateFavoritesToggleUI() {
    favoritesCountEl.textContent = favoritesList.length;
    favoritesCountEl.hidden = favoritesList.length === 0;
    favoritesToggleBtn.classList.toggle("active", showOnlyFavorites);
    favoritesToggleBtn.setAttribute("aria-pressed", showOnlyFavorites ? "true" : "false");
    document.getElementById("shareFavoritesBtn").hidden = favoritesList.length === 0;
  }

  function toggleFavorite(id) {
    const idx = favoritesList.indexOf(id);
    if (idx > -1) favoritesList.splice(idx, 1);
    else favoritesList.push(id);
    saveFavoritesList();
    syncFavoriteButtons();
    updateFavoritesToggleUI();

    // Si estábamos viendo "solo favoritos" y se vació la lista, volvemos a mostrar todas
    if (showOnlyFavorites && favoritesList.length === 0) {
      showOnlyFavorites = false;
      updateFavoritesToggleUI();
      showToast("Ya no tenés carreras marcadas como favoritas");
    }
    if (showOnlyFavorites) renderGrid();
  }

  favoritesToggleBtn.addEventListener("click", () => {
    if (!showOnlyFavorites && favoritesList.length === 0) {
      showToast("Todavía no marcaste ninguna carrera como favorita. Tocá el ❤️ en las tarjetas que te interesen.");
      return;
    }
    showOnlyFavorites = !showOnlyFavorites;
    updateFavoritesToggleUI();
    renderGrid();
    if (showOnlyFavorites) document.getElementById("carreras").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  updateFavoritesToggleUI();

  /* ---------------------- Compartir por WhatsApp ---------------------- */
  function shareCareerOnWhatsapp(c) {
    const url = location.origin + location.pathname + "#" + c.id;
    const texto = `Mirá esta carrera: *${c.nombre}* 🎓\n${c.descripcionBreve}\n\n${url}`;
    window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener");
  }

  function shareFavoritesOnWhatsapp() {
    const favs = favoritesList.map(id => CAREERS.find(c => c.id === id)).filter(Boolean);
    if (favs.length === 0) return;
    const url = location.origin + location.pathname;
    const listado = favs.map(c => `• ${c.nombre}`).join("\n");
    const texto = `Estas son las carreras que estoy considerando 🎓:\n\n${listado}\n\nLas encontré acá: ${url}`;
    window.open("https://wa.me/?text=" + encodeURIComponent(texto), "_blank", "noopener");
  }

  const shareFavoritesBtn = document.getElementById("shareFavoritesBtn");
  shareFavoritesBtn.addEventListener("click", shareFavoritesOnWhatsapp);

  /* ---------------------- Comparador de carreras ---------------------- */
  const MAX_COMPARE = 3;
  const COMPARE_KEY = "ov-compare";

  const compareBar = document.getElementById("compareBar");
  const compareBarList = document.getElementById("compareBarList");
  const compareBarCount = document.getElementById("compareBarCount");
  const compareBarOpenBtn = document.getElementById("compareBarOpen");
  const compareBarClearBtn = document.getElementById("compareBarClear");
  const compareOverlay = document.getElementById("compareOverlay");
  const compareContent = document.getElementById("compareContent");
  const closeCompareBtn = document.getElementById("closeCompare");

  let compareList = [];
  try {
    const saved = JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]");
    if (Array.isArray(saved)) compareList = saved.filter(id => CAREERS.some(c => c.id === id)).slice(0, MAX_COMPARE);
  } catch (e) { /* modo privado: se ignora */ }

  function isInCompare(id) { return compareList.includes(id); }

  function saveCompareList() {
    try { localStorage.setItem(COMPARE_KEY, JSON.stringify(compareList)); } catch (e) { /* modo privado */ }
  }

  function syncCompareButtons() {
    document.querySelectorAll(".compare-toggle-btn").forEach((btn) => {
      const active = isInCompare(btn.dataset.id);
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      const label = btn.querySelector(".compare-toggle-label");
      if (label) label.textContent = active ? "En comparación" : "Comparar";
    });
  }

  function toggleCompare(id) {
    const idx = compareList.indexOf(id);
    if (idx > -1) {
      compareList.splice(idx, 1);
    } else {
      if (compareList.length >= MAX_COMPARE) {
        showToast(`Podés comparar hasta ${MAX_COMPARE} carreras a la vez. Sacá una para agregar otra.`);
        return;
      }
      compareList.push(id);
    }
    saveCompareList();
    syncCompareButtons();
    renderCompareBar();
    if (compareOverlay.classList.contains("open")) renderCompareContent();
  }

  function renderCompareBar() {
    const careers = compareList.map(id => CAREERS.find(c => c.id === id)).filter(Boolean);
    compareBarList.innerHTML = careers.map(c => `
      <div class="compare-chip" data-id="${c.id}">
        <span class="compare-chip-icon" aria-hidden="true">${c.icono}</span>
        <span class="compare-chip-name">${c.nombre}</span>
        <button type="button" class="compare-chip-remove" data-id="${c.id}" aria-label="Quitar ${c.nombre} de la comparación">✕</button>
      </div>
    `).join("");
    compareBarCount.textContent = `(${careers.length})`;
    compareBarOpenBtn.disabled = careers.length < 2;
    const visible = careers.length > 0;
    compareBar.classList.toggle("visible", visible);
    compareBar.setAttribute("aria-hidden", visible ? "false" : "true");
    document.body.classList.toggle("has-compare-bar", visible);
  }

  compareBarList.addEventListener("click", (e) => {
    const btn = e.target.closest(".compare-chip-remove");
    if (btn) toggleCompare(btn.dataset.id);
  });

  compareBarClearBtn.addEventListener("click", () => {
    compareList = [];
    saveCompareList();
    syncCompareButtons();
    renderCompareBar();
    if (compareOverlay.classList.contains("open")) renderCompareContent();
  });

  compareBarOpenBtn.addEventListener("click", () => openCompare());

  function truncateText(text, n) {
    if (!text || !text.trim()) return "Información no disponible";
    return text.length > n ? text.slice(0, n).trim() + "…" : text;
  }

  function compactListText(items, limit) {
    limit = limit || 4;
    if (!items || items.length === 0) return "Información no disponible";
    const shown = items.slice(0, limit).join(" · ");
    const rest = items.length - limit;
    return rest > 0 ? shown + ` (+${rest} más)` : shown;
  }

  /* ---------------------- Gráfico visual de sueldos ---------------------- */
  function parseAvgARS(str) {
    if (!str) return null;
    const tokens = str.match(/\d{1,3}(?:\.\d{3})+/g);
    if (!tokens) return null;
    const nums = tokens.map(t => Number(t.replace(/\./g, "")));
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }

  function buildSalaryChartHTML(c) {
    const niveles = [
      { label: "Junior", valor: parseAvgARS(c.salario.junior), usd: c.salario.juniorUSD },
      { label: "Semi senior", valor: parseAvgARS(c.salario.semiSenior), usd: c.salario.semiSeniorUSD },
      { label: "Senior", valor: parseAvgARS(c.salario.senior), usd: c.salario.seniorUSD }
    ];
    const valoresValidos = niveles.map(n => n.valor).filter(v => v !== null);
    if (valoresValidos.length === 0) return "";
    const max = Math.max(...valoresValidos);

    return `
      <div class="salary-chart" role="img" aria-label="Gráfico de barras comparando el sueldo aproximado junior, semi senior y senior">
        ${niveles.map(n => {
          if (n.valor === null) return "";
          const pct = Math.max(10, Math.round((n.valor / max) * 100));
          return `
            <div class="salary-bar-row">
              <span class="salary-bar-label">${n.label}</span>
              <div class="salary-bar-track">
                <div class="salary-bar-fill" style="width:${pct}%">
                  <span class="salary-bar-value">${n.usd || ""}</span>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  /* ---------------------- Línea de tiempo visual por carrera ---------------------- */
  function buildTimelineHTML(c) {
    if (!c.duracionAnios) return "";
    const steps = Math.max(1, Math.round(c.duracionAnios));
    const items = [];
    for (let i = 1; i <= steps; i++) {
      let texto;
      if (steps === 1) {
        texto = "Formación intensiva, prácticas y trabajo final.";
      } else if (i === 1) {
        texto = "Materias introductorias y fundamentos generales de la carrera.";
      } else if (i === steps) {
        texto = "Prácticas profesionales, trabajo final o tesina, y egreso.";
      } else if (i === steps - 1 && steps > 2) {
        texto = "Especialización en contenidos específicos y primeras prácticas.";
      } else {
        texto = "Profundización en contenidos específicos de la carrera.";
      }
      items.push({ year: i, texto });
    }

    return `
      <div class="detail-section">
        <h3>🗓️ Recorrido orientativo de la carrera</h3>
        <div class="career-timeline">
          ${items.map((it, idx) => `
            <div class="timeline-step">
              <div class="timeline-dot-col">
                <span class="timeline-dot">${it.year}</span>
                ${idx < items.length - 1 ? `<span class="timeline-line"></span>` : ""}
              </div>
              <div class="timeline-content">
                <span class="timeline-year-label">Año ${it.year}</span>
                <p>${it.texto}</p>
              </div>
            </div>
          `).join("")}
        </div>
        <p class="timeline-disclaimer">Estructura orientativa según la duración informada; el detalle exacto por año puede variar según la institución — consultá el plan de estudios oficial para precisión.</p>
      </div>
    `;
  }

  function modalidadTexto(c) {
    if (c.modalidadInstituciones) return c.modalidadInstituciones;
    const virtual = esVirtual(c), presencial = esPresencial(c);
    if (virtual && presencial) return "Presencial y virtual";
    if (virtual) return "Virtual";
    if (presencial) return "Presencial";
    return "No disponible";
  }

  /* ---------------------- Carreras relacionadas ---------------------- */
  function relatedCareers(c, limit) {
    limit = limit || 3;
    const myInst = institucionIds(c);
    return CAREERS
      .filter(o => o.id !== c.id)
      .map(o => {
        let score = 0;
        if (o.categoria === c.categoria) score += 2;
        if (institucionIds(o).some(id => myInst.includes(id))) score += 1;
        return { o, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.o);
  }

  const COMPARE_ROWS = [
    { label: "Institución", get: c => institucionNombres(c.institucion).join(" · ") || "No disponible" },
    { label: "Modalidad", get: modalidadTexto },
    { label: "Tipo de título", get: c => tipoTitulo(c.nombre) },
    { label: "Duración", get: c => c.duracionInstituciones || (c.duracionAnios ? c.duracionAnios + " años" : "No disponible") },
    { label: "Carga horaria", get: c => c.cargaHoraria || "No disponible" },
    { label: "Dificultad", get: c => c.dificultad || "No disponible" },
    { label: "Perfil recomendado", get: c => truncateText(c.perfilRecomendado, 140) },
    { label: "Habilidades clave", get: c => compactListText(c.habilidades) },
    { label: "Salidas laborales", get: c => compactListText(c.salidasLaborales) },
    { label: "Sueldo junior", get: c => (c.salario && c.salario.junior) ? `${c.salario.junior}${c.salario.juniorUSD ? " (" + c.salario.juniorUSD + ")" : ""}` : "No disponible" },
    { label: "Sueldo semi senior", get: c => (c.salario && c.salario.semiSenior) ? `${c.salario.semiSenior}${c.salario.semiSeniorUSD ? " (" + c.salario.semiSeniorUSD + ")" : ""}` : "No disponible" },
    { label: "Sueldo senior", get: c => (c.salario && c.salario.senior) ? `${c.salario.senior}${c.salario.seniorUSD ? " (" + c.salario.seniorUSD + ")" : ""}` : "No disponible" },
    { label: "Trabajo remoto", get: c => truncateText(c.trabajoRemoto, 100) },
    { label: "Demanda actual", get: c => truncateText(c.demandaActual, 120) }
  ];

  function buildCompareHTML(careers) {
    const theadCols = careers.map(c => `
      <th>
        <div class="compare-col-head">
          <div class="compare-col-head-top">
            <span class="compare-col-icon" aria-hidden="true">${c.icono}</span>
            <button type="button" class="compare-remove-btn" data-id="${c.id}" aria-label="Quitar ${c.nombre} de la comparación">✕</button>
          </div>
          <strong>${c.nombre}</strong>
          <span class="compare-col-category">${c.categoria}</span>
        </div>
      </th>
    `).join("");

    const rows = COMPARE_ROWS.map(row => `
      <tr>
        <td class="compare-row-label">${row.label}</td>
        ${careers.map(c => `<td>${row.get(c)}</td>`).join("")}
      </tr>
    `).join("");

    const footerRow = `
      <tr class="compare-footer-row">
        <td class="compare-row-label"></td>
        ${careers.map(c => `<td><button type="button" class="compare-view-btn" data-id="${c.id}">Ver ficha completa →</button></td>`).join("")}
      </tr>
    `;

    return `
      <div class="compare-header">
        <p class="compare-eyebrow">Comparador de carreras</p>
        <h2>Comparando ${careers.length} carreras</h2>
        <p class="compare-scroll-hint">Deslizá hacia los costados para ver todas las columnas →</p>
      </div>
      <div class="compare-table-wrap">
        <table class="compare-table">
          <thead><tr><th class="compare-row-label"></th>${theadCols}</tr></thead>
          <tbody>${rows}${footerRow}</tbody>
        </table>
      </div>
      <div class="compare-actions-bottom">
        <button type="button" class="compare-clear-all-btn" id="compareClearAllBtn">Vaciar comparación</button>
      </div>
    `;
  }

  function renderCompareContent() {
    const careers = compareList.map(id => CAREERS.find(c => c.id === id)).filter(Boolean);

    if (careers.length < 2) {
      compareContent.innerHTML = `
        <div class="compare-empty">
          <span class="compare-empty-icon" aria-hidden="true">⚖️</span>
          <h2>Elegí al menos 2 carreras para comparar</h2>
          <p>Volvé al listado y tocá el botón <strong>"Comparar"</strong> en las carreras que te interesan (hasta ${MAX_COMPARE} a la vez).</p>
          <button type="button" class="compare-empty-back-btn" id="compareEmptyBack">Ver carreras</button>
        </div>
      `;
      document.getElementById("compareEmptyBack").addEventListener("click", closeCompare);
      return;
    }

    compareContent.innerHTML = buildCompareHTML(careers);

    compareContent.querySelectorAll(".compare-remove-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        toggleCompare(btn.dataset.id);
        renderCompareContent();
      });
    });
    compareContent.querySelectorAll(".compare-view-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        closeCompare();
        setTimeout(() => openDetail(id), 300);
      });
    });
    const clearAllBtn = document.getElementById("compareClearAllBtn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", () => {
        compareList = [];
        saveCompareList();
        syncCompareButtons();
        renderCompareBar();
        renderCompareContent();
      });
    }
  }

  function openCompare() {
    renderCompareContent();
    compareOverlay.classList.add("open");
    compareOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    compareOverlay.scrollTop = 0;
  }

  function closeCompare() {
    compareOverlay.classList.remove("open");
    compareOverlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  closeCompareBtn.addEventListener("click", closeCompare);
  compareOverlay.addEventListener("keydown", (e) => { if (e.key === "Escape") closeCompare(); });

  renderCompareBar();

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

  /* ---------------------- Modo lectura simple ---------------------- */
  const readingModeToggle = document.getElementById("readingModeToggle");
  const READING_MODE_KEY = "ov-reading-mode";

  function applyReadingMode(on) {
    root.classList.toggle("reading-mode", on);
    readingModeToggle.classList.toggle("active", on);
    readingModeToggle.setAttribute("aria-pressed", on ? "true" : "false");
  }

  let readingModeOn = false;
  try { readingModeOn = localStorage.getItem(READING_MODE_KEY) === "on"; } catch (e) { /* modo privado */ }
  applyReadingMode(readingModeOn);

  readingModeToggle.addEventListener("click", () => {
    readingModeOn = !readingModeOn;
    applyReadingMode(readingModeOn);
    try { localStorage.setItem(READING_MODE_KEY, readingModeOn ? "on" : "off"); } catch (e) { /* modo privado */ }
    showToast(readingModeOn ? "Modo lectura simple activado ✓" : "Modo lectura simple desactivado");
  });

  /* ---------------------- Búsqueda por voz ---------------------- */
  const voiceSearchBtn = document.getElementById("voiceSearchBtn");
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognitionCtor) {
    voiceSearchBtn.hidden = false;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    let listening = false;

    recognition.addEventListener("result", (e) => {
      const transcript = e.results[0][0].transcript;
      searchInput.value = transcript;
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      searchInput.focus();
    });
    recognition.addEventListener("end", () => {
      listening = false;
      voiceSearchBtn.classList.remove("listening");
    });
    recognition.addEventListener("error", () => {
      listening = false;
      voiceSearchBtn.classList.remove("listening");
      showToast("No se pudo escuchar. Revisá el permiso del micrófono en tu navegador.");
    });

    voiceSearchBtn.addEventListener("click", () => {
      if (listening) { recognition.stop(); return; }
      try {
        recognition.start();
        listening = true;
        voiceSearchBtn.classList.add("listening");
      } catch (e) { /* ya estaba escuchando */ }
    });
  }

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

  /* ---------------------- Sorprendeme ---------------------- */
  const surpriseBtn = document.getElementById("surpriseBtn");
  let lastSurpriseId = null;

  surpriseBtn.addEventListener("click", () => {
    const pool = CAREERS.length > 1 ? CAREERS.filter(c => c.id !== lastSurpriseId) : CAREERS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    lastSurpriseId = pick.id;
    openDetail(pick.id);
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
