(function () {
  "use strict";

  var DATA = window.HYMNS_DATA || { categories: [], hymns: [] };
  var HYMNS = DATA.hymns.slice().sort(function (a, b) { return a.number - b.number; });
  var CATEGORIES = DATA.categories.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
  var CAT_BY_ID = {};
  CATEGORIES.forEach(function (c) { CAT_BY_ID[c.id] = c.name; });
  var HYMN_BY_ID = {};
  HYMNS.forEach(function (h) { HYMN_BY_ID[h.id] = h; });

  // ---------------- Storage helpers ----------------
  var STORE_KEY = "imsHymnal.v1";
  function loadStore() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {}
  }
  var store = Object.assign({
    favorites: [],
    dark: false,
    fontSize: 17,
    lastCategory: "",
    lastSearch: ""
  }, loadStore());

  function isFav(id) { return store.favorites.indexOf(id) !== -1; }
  function toggleFav(id) {
    var idx = store.favorites.indexOf(id);
    if (idx === -1) store.favorites.push(id); else store.favorites.splice(idx, 1);
    saveStore();
  }

  // ---------------- DOM refs ----------------
  var el = {
    views: {
      hymns: document.getElementById("view-hymns"),
      favorites: document.getElementById("view-favorites"),
      settings: document.getElementById("view-settings"),
      detail: document.getElementById("view-detail")
    },
    tabbar: document.getElementById("tabbar"),
    tabs: Array.prototype.slice.call(document.querySelectorAll(".tab")),
    btnBack: document.getElementById("btnBack"),
    btnDownload: document.getElementById("btnDownload"),
    categorySelect: document.getElementById("categorySelect"),
    searchInput: document.getElementById("searchInput"),
    hymnList: document.getElementById("hymnList"),
    favoriteList: document.getElementById("favoriteList"),
    resultCount: document.getElementById("resultCount"),
    emptyHymns: document.getElementById("emptyHymns"),
    emptyFavorites: document.getElementById("emptyFavorites"),
    darkToggle: document.getElementById("darkToggle"),
    fontSizeLabel: document.getElementById("fontSizeLabel"),
    fontDecrease: document.getElementById("fontDecrease"),
    fontIncrease: document.getElementById("fontIncrease"),
    aboutCounts: document.getElementById("aboutCounts"),
    detailNumber: document.getElementById("detailNumber"),
    detailTitle: document.getElementById("detailTitle"),
    detailMeta: document.getElementById("detailMeta"),
    detailLyrics: document.getElementById("detailLyrics"),
    detailFooter: document.getElementById("detailFooter"),
    detailFavBtn: document.getElementById("detailFavBtn"),
    prevHymnBtn: document.getElementById("prevHymnBtn"),
    nextHymnBtn: document.getElementById("nextHymnBtn"),
    detailFontDecrease: document.getElementById("detailFontDecrease"),
    detailFontIncrease: document.getElementById("detailFontIncrease")
  };

  var state = {
    tab: "hymns",
    detailId: null,
    cameFromTab: "hymns"
  };

  // ---------------- Init static content ----------------
  CATEGORIES.forEach(function (c) {
    var opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.name;
    el.categorySelect.appendChild(opt);
  });
  el.categorySelect.value = store.lastCategory || "";
  el.searchInput.value = store.lastSearch || "";
  el.aboutCounts.textContent = HYMNS.length + " hymns · " + CATEGORIES.length + " categories";

  // ---------------- Navigation ----------------
  function showTab(tab) {
    state.tab = tab;
    Object.keys(el.views).forEach(function (k) {
      el.views[k].classList.toggle("view--active", k === tab);
    });
    el.tabs.forEach(function (t) {
      t.classList.toggle("tab--active", t.dataset.tab === tab);
    });
    el.tabbar.hidden = false;
    el.btnBack.hidden = true;
    if (tab === "favorites") renderFavorites();
    window.scrollTo(0, 0);
    el.views[tab] ? null : null;
    var mainEl = document.getElementById("views");
    if (mainEl) mainEl.scrollTop = 0;
  }

  el.tabs.forEach(function (t) {
    t.addEventListener("click", function () { showTab(t.dataset.tab); });
  });

  function openDetail(hymnId, fromTab) {
    state.detailId = hymnId;
    state.cameFromTab = fromTab || state.tab;
    Object.keys(el.views).forEach(function (k) {
      el.views[k].classList.toggle("view--active", k === "detail");
    });
    el.tabbar.hidden = true;
    el.btnBack.hidden = false;
    renderDetail(hymnId);
    var mainEl = document.getElementById("views");
    if (mainEl) mainEl.scrollTop = 0;
  }

  el.btnBack.addEventListener("click", function () {
    showTab(state.cameFromTab);
  });

  el.btnDownload.addEventListener("click", function () {
    showTab("settings");
  });

  // ---------------- List rendering ----------------
  function matchesSearch(h, q) {
    if (!q) return true;
    q = q.trim().toLowerCase();
    if (!q) return true;
    if (String(h.number).indexOf(q) !== -1) return true;
    if (h.title && h.title.toLowerCase().indexOf(q) !== -1) return true;
    if (h.author && h.author.toLowerCase().indexOf(q) !== -1) return true;
    return false;
  }

  function getFilteredHymns() {
    var catId = el.categorySelect.value;
    var q = el.searchInput.value;
    return HYMNS.filter(function (h) {
      if (catId && h.categories.indexOf(Number(catId)) === -1) return false;
      return matchesSearch(h, q);
    });
  }

  function hymnItemNode(h) {
    var li = document.createElement("li");
    var star = isFav(h.id) ? "is-fav" : "";
    li.innerHTML =
      '<div class="hymn-item">' +
        '<div class="hymn-item__num">' + h.number + '</div>' +
        '<button type="button" class="hymn-item__body" data-open="' + h.id + '">' +
          '<div class="hymn-item__title">' + escapeHtml(h.title) + '</div>' +
          '<div class="hymn-item__sub">' + escapeHtml(subtitleFor(h)) + '</div>' +
        '</button>' +
        '<button type="button" class="hymn-item__star ' + star + '" data-fav="' + h.id + '" aria-label="Toggle favorite">' +
          '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 2.8l2.85 6.4 6.98.62-5.3 4.62 1.6 6.86L12 17.7l-6.13 3.6 1.6-6.86-5.3-4.62 6.98-.62L12 2.8z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
        '</button>' +
      '</div>';
    return li;
  }

  function subtitleFor(h) {
    var cats = (h.categories || []).map(function (id) { return CAT_BY_ID[id]; }).filter(Boolean);
    if (cats.length) return cats.join(" · ");
    return h.author || "";
  }

  function escapeHtml(s) {
    if (!s) return "";
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderHymnList() {
    var items = getFilteredHymns();
    el.hymnList.innerHTML = "";
    var frag = document.createDocumentFragment();
    items.forEach(function (h) { frag.appendChild(hymnItemNode(h)); });
    el.hymnList.appendChild(frag);
    el.emptyHymns.hidden = items.length !== 0;
    el.resultCount.textContent = items.length === HYMNS.length
      ? items.length + " hymns"
      : items.length + " of " + HYMNS.length + " hymns";
  }

  function renderFavorites() {
    var items = HYMNS.filter(function (h) { return isFav(h.id); });
    el.favoriteList.innerHTML = "";
    var frag = document.createDocumentFragment();
    items.forEach(function (h) { frag.appendChild(hymnItemNode(h)); });
    el.favoriteList.appendChild(frag);
    el.emptyFavorites.hidden = items.length !== 0;
  }

  function handleListClick(e) {
    var openBtn = e.target.closest("[data-open]");
    if (openBtn) {
      var id = Number(openBtn.getAttribute("data-open"));
      openDetail(id, state.tab);
      return;
    }
    var favBtn = e.target.closest("[data-fav]");
    if (favBtn) {
      var fid = Number(favBtn.getAttribute("data-fav"));
      toggleFav(fid);
      favBtn.classList.toggle("is-fav", isFav(fid));
      if (state.tab === "favorites" && !isFav(fid)) {
        renderFavorites();
      }
    }
  }
  el.hymnList.addEventListener("click", handleListClick);
  el.favoriteList.addEventListener("click", handleListClick);

  el.categorySelect.addEventListener("change", function () {
    store.lastCategory = el.categorySelect.value;
    saveStore();
    renderHymnList();
  });
  el.searchInput.addEventListener("input", function () {
    store.lastSearch = el.searchInput.value;
    saveStore();
    renderHymnList();
  });

  // ---------------- Detail rendering ----------------
  function orderedSections(h) {
    return (h.sections || []).slice().sort(function (a, b) { return a.order - b.order; });
  }

  function renderDetail(id) {
    var h = HYMN_BY_ID[id];
    if (!h) return;
    el.detailNumber.textContent = h.number;
    el.detailTitle.textContent = h.title;

    var metaParts = [];
    if (h.author) metaParts.push(h.author);
    if (h.tune) metaParts.push(h.tune);
    el.detailMeta.textContent = metaParts.join(" — ");

    var sections = orderedSections(h);
    el.detailLyrics.innerHTML = "";
    if (!sections.length) {
      var p = document.createElement("p");
      p.className = "verse-block__text";
      p.textContent = "Lyrics are not available for this hymn.";
      el.detailLyrics.appendChild(p);
    } else {
      sections.forEach(function (s) {
        if (!s.content) return;
        var block = document.createElement("div");
        var isChorusLike = /chorus|refrain|coda/i.test(s.type || "");
        block.className = "verse-block" + (isChorusLike ? " verse-block--chorus" : "");
        var label = document.createElement("div");
        label.className = "verse-block__label";
        label.textContent = s.type + (s.num ? " " + s.num : "");
        var text = document.createElement("p");
        text.className = "verse-block__text";
        text.textContent = s.content;
        block.appendChild(label);
        block.appendChild(text);
        el.detailLyrics.appendChild(block);
      });
    }

    var footerParts = [];
    if (h.translator) footerParts.push("<strong>Translator:</strong> " + escapeHtml(h.translator));
    if (h.adaptedBy) footerParts.push("<strong>Adapted by:</strong> " + escapeHtml(h.adaptedBy));
    if (h.comment) footerParts.push(escapeHtml(h.comment));
    el.detailFooter.innerHTML = footerParts.join("<br>");
    el.detailFooter.style.display = footerParts.length ? "" : "none";

    el.detailFavBtn.classList.toggle("is-fav", isFav(h.id));

    var idx = HYMNS.findIndex(function (x) { return x.id === h.id; });
    el.prevHymnBtn.disabled = idx <= 0;
    el.nextHymnBtn.disabled = idx === -1 || idx >= HYMNS.length - 1;
    el.prevHymnBtn.dataset.idx = idx - 1;
    el.nextHymnBtn.dataset.idx = idx + 1;

    applyFontSize(el.detailLyrics, store.fontSize);
  }

  el.detailFavBtn.addEventListener("click", function () {
    toggleFav(state.detailId);
    el.detailFavBtn.classList.toggle("is-fav", isFav(state.detailId));
  });

  el.prevHymnBtn.addEventListener("click", function () {
    var idx = Number(el.prevHymnBtn.dataset.idx);
    if (idx >= 0 && HYMNS[idx]) openDetail(HYMNS[idx].id, state.cameFromTab);
  });
  el.nextHymnBtn.addEventListener("click", function () {
    var idx = Number(el.nextHymnBtn.dataset.idx);
    if (HYMNS[idx]) openDetail(HYMNS[idx].id, state.cameFromTab);
  });

  // ---------------- Font size ----------------
  function applyFontSize(node, size) {
    node.style.fontSize = size + "px";
  }
  function setFontSize(size) {
    size = Math.max(13, Math.min(26, size));
    store.fontSize = size;
    saveStore();
    el.fontSizeLabel.textContent = size + "px";
    document.documentElement.style.setProperty("--lyric-size", size + "px");
    if (state.detailId != null) applyFontSize(el.detailLyrics, size);
  }
  el.fontDecrease.addEventListener("click", function () { setFontSize(store.fontSize - 1); });
  el.fontIncrease.addEventListener("click", function () { setFontSize(store.fontSize + 1); });
  el.detailFontDecrease.addEventListener("click", function () { setFontSize(store.fontSize - 1); });
  el.detailFontIncrease.addEventListener("click", function () { setFontSize(store.fontSize + 1); });

  // ---------------- Dark mode ----------------
  function setDark(on) {
    store.dark = on;
    saveStore();
    document.documentElement.classList.toggle("dark", on);
    el.darkToggle.setAttribute("aria-checked", on ? "true" : "false");
  }
  el.darkToggle.addEventListener("click", function () { setDark(!store.dark); });

  // ---------------- Keyboard support for detail nav ----------------
  document.addEventListener("keydown", function (e) {
    if (state.tab !== "detail" && !(el.views.detail.classList.contains("view--active"))) return;
    if (e.key === "ArrowLeft" && !el.prevHymnBtn.disabled) el.prevHymnBtn.click();
    if (e.key === "ArrowRight" && !el.nextHymnBtn.disabled) el.nextHymnBtn.click();
    if (e.key === "Escape") el.btnBack.click();
  });

  // ---------------- Boot ----------------
  setDark(!!store.dark);
  setFontSize(store.fontSize || 17);
  renderHymnList();
  showTab("hymns");
})();
