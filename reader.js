/* ==========================================================================
   Ancient Writing Reader — Layered Depth Interactivity
   ==========================================================================
   Layer 0:   Clean narrative (default)
   Layer 1:   Click footnote number → inline note expansion
   Layer 1.5: Hover entity name → tooltip with bio/dates
   Layer 2:   Click corpus ID in note → source panel slides open
   Layer 2.5: Click entity name → entity detail panel
   Layer 3:   Click "Show Greek" → Greek text appears
   ========================================================================== */

(function () {
  "use strict";

  // --- Parse source data embedded in page ---
  var sourceDataEl = document.getElementById("source-data");
  var sources = {};
  if (sourceDataEl) {
    try {
      var arr = JSON.parse(sourceDataEl.textContent);
      for (var i = 0; i < arr.length; i++) {
        sources[arr[i].corpus_id] = arr[i];
      }
    } catch (e) {
      console.error("Failed to parse source data:", e);
    }
  }

  // --- Parse entity data embedded in page ---
  var entityDataEl = document.getElementById("entity-data");
  var entities = {};
  if (entityDataEl) {
    try {
      var earr = JSON.parse(entityDataEl.textContent);
      for (var j = 0; j < earr.length; j++) {
        entities[earr[j].id] = earr[j];
      }
    } catch (e) {
      console.error("Failed to parse entity data:", e);
    }
  }

  // --- Theme toggle ---
  var toggle = document.querySelector(".theme-toggle");
  var html = document.documentElement;
  var saved = localStorage.getItem("theme");
  if (saved) html.setAttribute("data-theme", saved);

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next =
        html.getAttribute("data-theme") === "dark" ? "light" : "dark";
      html.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  }

  // --- Layer 1: Inline footnote expansion ---
  document.addEventListener("click", function (e) {
    var noteRef = e.target.closest(".note-ref");
    if (!noteRef) return;

    e.preventDefault();
    var noteId = noteRef.dataset.note;
    if (!noteId) return;

    var para = noteRef.closest("p, blockquote, li");
    if (!para) return;

    var existing = para.parentNode.querySelector(
      '.note-inline[data-note="' + noteId + '"]'
    );
    if (existing) {
      existing.remove();
      return;
    }

    var noteLi = document.querySelector("#note-" + noteId);
    if (!noteLi) return;

    var noteEl = document.createElement("div");
    noteEl.className = "note-inline";
    noteEl.dataset.note = noteId;

    var noteText = noteLi.querySelector(".note-text");
    var sourceLinks = noteLi.querySelectorAll(".source-link");

    var noteHtml =
      '<span class="note-number">' +
      noteId +
      ".</span> " +
      (noteText ? noteText.textContent : "");

    for (var k = 0; k < sourceLinks.length; k++) {
      var cid = sourceLinks[k].dataset.corpusId;
      noteHtml +=
        ' <a href="#" class="source-link" data-corpus-id="' +
        cid +
        '">[source ' +
        cid +
        "]</a>";
    }

    noteEl.innerHTML = noteHtml;
    para.after(noteEl);
  });

  // --- Layer 0.5: Footnote hover tooltips ---
  var noteTooltipEl = null;
  var noteTooltipTimeout = null;

  function createNoteTooltip() {
    if (noteTooltipEl) return noteTooltipEl;
    noteTooltipEl = document.createElement("div");
    noteTooltipEl.className = "note-tooltip";
    noteTooltipEl.hidden = true;
    document.body.appendChild(noteTooltipEl);

    noteTooltipEl.addEventListener("mouseenter", function () {
      clearTimeout(noteTooltipTimeout);
    });
    noteTooltipEl.addEventListener("mouseleave", function () {
      noteTooltipTimeout = setTimeout(hideNoteTooltip, 150);
    });

    return noteTooltipEl;
  }

  function showNoteTooltip(noteRef) {
    var noteId = noteRef.dataset.note;
    if (!noteId) return;

    var noteLi = document.querySelector("#note-" + noteId);
    if (!noteLi) return;

    var tip = createNoteTooltip();
    var noteText = noteLi.querySelector(".note-text");
    if (!noteText) return;

    var text = noteText.textContent;
    if (text.length > 300) text = text.slice(0, 297) + "\u2026";

    tip.innerHTML =
      '<span class="note-tooltip-number">' + noteId + ".</span> " + text;

    // Position above the footnote ref
    var rect = noteRef.getBoundingClientRect();
    tip.hidden = false;
    var tipRect = tip.getBoundingClientRect();
    var top = rect.top - tipRect.height - 8 + window.scrollY;
    var left = rect.left + (rect.width - tipRect.width) / 2 + window.scrollX;

    // Keep within viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
    if (top < window.scrollY + 8) {
      top = rect.bottom + 8 + window.scrollY;
    }

    tip.style.top = top + "px";
    tip.style.left = left + "px";
  }

  function hideNoteTooltip() {
    if (noteTooltipEl) noteTooltipEl.hidden = true;
  }

  document.addEventListener(
    "mouseenter",
    function (e) {
      var noteRef = e.target.closest(".note-ref");
      if (!noteRef) return;
      clearTimeout(noteTooltipTimeout);
      noteTooltipTimeout = setTimeout(function () {
        showNoteTooltip(noteRef);
      }, 200);
    },
    true
  );

  document.addEventListener(
    "mouseleave",
    function (e) {
      var noteRef = e.target.closest(".note-ref");
      if (!noteRef) return;
      clearTimeout(noteTooltipTimeout);
      noteTooltipTimeout = setTimeout(hideNoteTooltip, 150);
    },
    true
  );

  // Hide note tooltip on click (since click expands inline)
  document.addEventListener("click", function (e) {
    if (e.target.closest(".note-ref")) {
      hideNoteTooltip();
    }
  });

  // --- Layer 1.5: Entity hover tooltips ---
  var tooltipEl = null;
  var tooltipTimeout = null;

  function createTooltip() {
    if (tooltipEl) return tooltipEl;
    tooltipEl = document.createElement("div");
    tooltipEl.className = "entity-tooltip";
    tooltipEl.hidden = true;
    document.body.appendChild(tooltipEl);

    // Keep tooltip visible when mousing over it
    tooltipEl.addEventListener("mouseenter", function () {
      clearTimeout(tooltipTimeout);
    });
    tooltipEl.addEventListener("mouseleave", function () {
      tooltipTimeout = setTimeout(hideTooltip, 150);
    });

    return tooltipEl;
  }

  function showTooltip(entitySpan) {
    var entityId = entitySpan.dataset.entityId;
    var entity = entities[entityId];
    if (!entity) return;

    var tip = createTooltip();
    var typeLabels = { person: "Person", place: "Place", office: "Office" };

    var tipHtml = '<div class="entity-tooltip-inner">';
    tipHtml +=
      '<span class="entity-tooltip-type">' +
      (typeLabels[entity.type] || "") +
      "</span>";
    tipHtml +=
      "<strong>" +
      (entity.canonical_name || entity.name || entity.title) +
      "</strong>";

    if (entity.dates) {
      tipHtml +=
        '<div class="entity-tooltip-dates">' + entity.dates + "</div>";
    }
    if (entity.location) {
      tipHtml +=
        '<div class="entity-tooltip-location">' +
        entity.location +
        "</div>";
    }
    if (entity.bio) {
      var shortBio =
        entity.bio.length > 150
          ? entity.bio.slice(0, 147) + "..."
          : entity.bio;
      tipHtml +=
        '<div class="entity-tooltip-bio">' + shortBio + "</div>";
    }
    if (entity.corpus_ids && entity.corpus_ids.length > 0) {
      tipHtml +=
        '<div class="entity-tooltip-docs">' +
        entity.corpus_ids.length +
        " document(s)</div>";
    }
    tipHtml += "</div>";
    tip.innerHTML = tipHtml;

    // Position tooltip above the entity span
    var rect = entitySpan.getBoundingClientRect();
    tip.hidden = false;
    var tipRect = tip.getBoundingClientRect();
    var top = rect.top - tipRect.height - 8 + window.scrollY;
    var left = rect.left + (rect.width - tipRect.width) / 2 + window.scrollX;

    // Keep within viewport
    left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
    if (top < window.scrollY + 8) {
      top = rect.bottom + 8 + window.scrollY;
    }

    tip.style.top = top + "px";
    tip.style.left = left + "px";
  }

  function hideTooltip() {
    if (tooltipEl) tooltipEl.hidden = true;
  }

  // Hover events via event delegation
  document.addEventListener(
    "mouseenter",
    function (e) {
      var entitySpan = e.target.closest(".entity");
      if (!entitySpan) return;
      clearTimeout(tooltipTimeout);
      tooltipTimeout = setTimeout(function () {
        showTooltip(entitySpan);
      }, 200);
    },
    true
  );

  document.addEventListener(
    "mouseleave",
    function (e) {
      var entitySpan = e.target.closest(".entity");
      if (!entitySpan) return;
      clearTimeout(tooltipTimeout);
      tooltipTimeout = setTimeout(hideTooltip, 150);
    },
    true
  );

  // --- Layer 2: Source panel ---
  var sourcePanel = document.getElementById("source-panel");
  if (!sourcePanel) return;

  var panelRef = sourcePanel.querySelector(".source-ref");
  var panelDate = sourcePanel.querySelector(".source-date");
  var panelDesc = sourcePanel.querySelector(".source-desc");
  var panelTranslation = sourcePanel.querySelector(".source-translation-text");
  var panelGreek = sourcePanel.querySelector(".source-greek-text");
  var panelGreekSection = sourcePanel.querySelector(".source-greek");
  var greekToggle = sourcePanel.querySelector(".greek-toggle");
  var sourceCloseBtn = sourcePanel.querySelector(".source-panel-close");

  function openSourcePanel(corpusId) {
    // Close entity panel if open
    closeEntityPanel();

    var src = sources[corpusId];
    if (!src) {
      panelRef.textContent = "Source #" + corpusId;
      panelDate.textContent = "";
      panelDesc.textContent = "Source data not available in corpus.";
      panelTranslation.textContent = "";
      panelGreek.textContent = "";
    } else {
      panelRef.textContent = src.reference || "Source #" + corpusId;
      panelDate.textContent = src.date || "";
      panelDesc.textContent = src.description || "";
      panelTranslation.textContent =
        src.translation || "No translation available.";
      panelGreek.textContent = src.greek || "No Greek text available.";
    }

    if (panelGreekSection) panelGreekSection.hidden = true;
    if (greekToggle) greekToggle.textContent = "Show Greek";

    sourcePanel.hidden = false;
    sourcePanel.offsetHeight;
    sourcePanel.classList.add("open");
  }

  function closeSourcePanel() {
    if (!sourcePanel.classList.contains("open")) return;
    sourcePanel.classList.remove("open");
    sourcePanel.addEventListener(
      "transitionend",
      function handler() {
        sourcePanel.hidden = true;
        sourcePanel.removeEventListener("transitionend", handler);
      },
      { once: true }
    );
  }

  // Click source links
  document.addEventListener("click", function (e) {
    var sourceLink = e.target.closest(".source-link");
    if (!sourceLink) return;
    e.preventDefault();
    var cid = sourceLink.dataset.corpusId;
    if (cid) openSourcePanel(parseInt(cid, 10));
  });

  if (sourceCloseBtn) {
    sourceCloseBtn.addEventListener("click", closeSourcePanel);
  }

  // --- Layer 2.5: Entity detail panel ---
  var entityPanel = document.getElementById("entity-panel");

  function openEntityPanel(entityId) {
    if (!entityPanel) return;
    var entity = entities[entityId];
    if (!entity) return;

    // Close source panel if open
    closeSourcePanel();

    var typeLabels = { person: "Person", place: "Place", office: "Office" };

    var badge = entityPanel.querySelector(".entity-type-badge");
    var nameEl = entityPanel.querySelector(".entity-name");
    var datesEl = entityPanel.querySelector(".entity-dates");
    var locEl = entityPanel.querySelector(".entity-location");
    var bioEl = entityPanel.querySelector(".entity-bio");
    var rolesEl = entityPanel.querySelector(".entity-roles");
    var disambEl = entityPanel.querySelector(".entity-disambiguation");
    var docsEl = entityPanel.querySelector(".entity-docs");

    if (badge) badge.textContent = typeLabels[entity.type] || "";
    if (nameEl)
      nameEl.textContent =
        entity.canonical_name || entity.name || entity.title || "";
    if (datesEl) datesEl.textContent = entity.dates || entity.period || "";
    if (locEl)
      locEl.textContent =
        entity.location || entity.region || entity.modern_location || "";
    if (bioEl)
      bioEl.textContent = entity.bio || entity.description || "";

    // Roles list (people only)
    if (rolesEl) {
      if (entity.roles && entity.roles.length > 0) {
        var rolesHtml = "<h4>Roles</h4><ul>";
        for (var r = 0; r < entity.roles.length; r++) {
          rolesHtml += "<li>" + entity.roles[r].title;
          if (entity.roles[r].date) rolesHtml += " (" + entity.roles[r].date + ")";
          rolesHtml += "</li>";
        }
        rolesHtml += "</ul>";
        rolesEl.innerHTML = rolesHtml;
        rolesEl.hidden = false;
      } else {
        rolesEl.innerHTML = "";
        rolesEl.hidden = true;
      }
    }

    // Disambiguation
    if (disambEl) {
      if (entity.disambiguation) {
        disambEl.innerHTML =
          '<h4>Disambiguation</h4><p>' + entity.disambiguation + "</p>";
        disambEl.hidden = false;
      } else {
        disambEl.innerHTML = "";
        disambEl.hidden = true;
      }
    }

    // Document count
    if (docsEl) {
      if (entity.corpus_ids && entity.corpus_ids.length > 0) {
        docsEl.textContent =
          "Appears in " + entity.corpus_ids.length + " document(s)";
      } else {
        docsEl.textContent = "";
      }
    }

    entityPanel.hidden = false;
    entityPanel.offsetHeight;
    entityPanel.classList.add("open");
  }

  function closeEntityPanel() {
    if (!entityPanel || !entityPanel.classList.contains("open")) return;
    entityPanel.classList.remove("open");
    entityPanel.addEventListener(
      "transitionend",
      function handler() {
        entityPanel.hidden = true;
        entityPanel.removeEventListener("transitionend", handler);
      },
      { once: true }
    );
  }

  // Click entity spans → open detail panel
  document.addEventListener("click", function (e) {
    var entitySpan = e.target.closest(".entity");
    if (!entitySpan) return;
    hideTooltip();
    openEntityPanel(entitySpan.dataset.entityId);
  });

  // Entity panel close button
  if (entityPanel) {
    var entityCloseBtn = entityPanel.querySelector(".entity-panel-close");
    if (entityCloseBtn) {
      entityCloseBtn.addEventListener("click", closeEntityPanel);
    }
  }

  // --- Escape key closes any open panel ---
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (entityPanel && entityPanel.classList.contains("open")) {
        closeEntityPanel();
      } else if (sourcePanel.classList.contains("open")) {
        closeSourcePanel();
      }
    }
  });

  // --- Click outside closes panels ---
  document.addEventListener("click", function (e) {
    // Close source panel on outside click
    if (
      sourcePanel.classList.contains("open") &&
      !sourcePanel.contains(e.target) &&
      !e.target.closest(".source-link")
    ) {
      closeSourcePanel();
    }
    // Close entity panel on outside click
    if (
      entityPanel &&
      entityPanel.classList.contains("open") &&
      !entityPanel.contains(e.target) &&
      !e.target.closest(".entity")
    ) {
      closeEntityPanel();
    }
  });

  // --- Layer 3: Greek toggle ---
  if (greekToggle && panelGreekSection) {
    greekToggle.addEventListener("click", function () {
      var isHidden = panelGreekSection.hidden;
      panelGreekSection.hidden = !isHidden;
      greekToggle.textContent = isHidden ? "Hide Greek" : "Show Greek";
    });
  }
})();
