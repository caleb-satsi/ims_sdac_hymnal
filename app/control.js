(function () {
  "use strict";

  var el = {
    hymnNum: document.getElementById("hymnNum"),
    hymnTitle: document.getElementById("hymnTitle"),
    hymnSub: document.getElementById("hymnSub"),
    displayStatus: document.getElementById("displayStatus"),
    exitBtn: document.getElementById("exitBtn"),
    verseRail: document.getElementById("verseRail"),
    nowTag: document.getElementById("nowTag"),
    nowText: document.getElementById("nowText"),
    nextTag: document.getElementById("nextTag"),
    nextText: document.getElementById("nextText"),
    prevBtn: document.getElementById("prevBtn"),
    nextBtn: document.getElementById("nextBtn"),
    blankBlackBtn: document.getElementById("blankBlackBtn"),
    blankWhiteBtn: document.getElementById("blankWhiteBtn"),
    ctrlCount: document.getElementById("ctrlCount"),
    noHymnOverlay: document.getElementById("noHymnOverlay")
  };

  var state = {
    hymn: null,
    slides: [],
    index: 0,
    blank: null // null | "black" | "white"
  };

  function loadHymn(hymnId) {
    var hymn = window.HymnUtils.getHymn(hymnId);
    state.hymn = hymn;
    state.slides = window.HymnUtils.orderedSlides(hymn);
    state.index = 0;
    state.blank = null;
    render();
    if (hymn) {
      window.hymnalBridge.sendVerseChange(0);
      window.hymnalBridge.sendBlank(null);
    }
  }

  function escapeHtml(s) {
    if (!s) return "";
    return s.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function slideLabel(s) {
    return s.type + (s.num ? " " + s.num : "");
  }

  function render() {
    var hymn = state.hymn;
    el.noHymnOverlay.hidden = !!hymn;

    if (!hymn) {
      el.hymnNum.textContent = "—";
      el.hymnTitle.textContent = "Choose a hymn to present";
      el.hymnSub.textContent = "";
      el.verseRail.innerHTML = "";
      el.nowTag.textContent = "—";
      el.nowText.textContent = "";
      el.nextTag.textContent = "—";
      el.nextText.textContent = "";
      el.ctrlCount.textContent = "0 / 0";
      el.prevBtn.disabled = true;
      el.nextBtn.disabled = true;
      return;
    }

    el.hymnNum.textContent = hymn.number;
    el.hymnTitle.textContent = hymn.title;
    el.hymnSub.textContent = hymn.author || "";

    // Verse rail (click any slide to jump straight to it — handy for
    // choruses that repeat between verses).
    el.verseRail.innerHTML = "";
    var frag = document.createDocumentFragment();
    state.slides.forEach(function (s, i) {
      var div = document.createElement("div");
      div.className = "rail-item" + (i === state.index ? " is-active" : "");
      div.dataset.index = i;
      div.innerHTML =
        '<div class="rail-item__tag">' + escapeHtml(slideLabel(s)) + "</div>" +
        '<div class="rail-item__text">' + escapeHtml(s.content) + "</div>";
      frag.appendChild(div);
    });
    el.verseRail.appendChild(frag);

    var current = state.slides[state.index];
    var next = state.slides[state.index + 1];

    if (current) {
      el.nowTag.textContent = slideLabel(current);
      el.nowText.textContent = current.content;
    } else {
      el.nowTag.textContent = "—";
      el.nowText.textContent = "No lyrics available for this hymn.";
    }

    if (next) {
      el.nextTag.textContent = slideLabel(next);
      el.nextText.textContent = next.content;
    } else {
      el.nextTag.textContent = "End";
      el.nextText.textContent = "This is the last slide.";
    }

    el.ctrlCount.textContent = (state.slides.length ? state.index + 1 : 0) + " / " + state.slides.length;
    el.prevBtn.disabled = state.index <= 0;
    el.nextBtn.disabled = state.slides.length === 0 || state.index >= state.slides.length - 1;

    el.blankBlackBtn.classList.toggle("is-active", state.blank === "black");
    el.blankWhiteBtn.classList.toggle("is-active", state.blank === "white");
  }

  function goTo(index) {
    if (!state.slides.length) return;
    index = Math.max(0, Math.min(state.slides.length - 1, index));
    if (index === state.index) return;
    state.index = index;
    render();
    window.hymnalBridge.sendVerseChange(index);
  }

  function toggleBlank(mode) {
    state.blank = state.blank === mode ? null : mode;
    render();
    window.hymnalBridge.sendBlank(state.blank);
  }

  el.prevBtn.addEventListener("click", function () { goTo(state.index - 1); });
  el.nextBtn.addEventListener("click", function () { goTo(state.index + 1); });
  el.blankBlackBtn.addEventListener("click", function () { toggleBlank("black"); });
  el.blankWhiteBtn.addEventListener("click", function () { toggleBlank("white"); });
  el.exitBtn.addEventListener("click", function () {
    window.hymnalBridge.exitPresentation();
    window.close();
  });
  el.verseRail.addEventListener("click", function (e) {
    var item = e.target.closest(".rail-item");
    if (item) goTo(Number(item.dataset.index));
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") { e.preventDefault(); goTo(state.index + 1); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); goTo(state.index - 1); }
    else if (e.key === "b" || e.key === "B") { toggleBlank("black"); }
    else if (e.key === "w" || e.key === "W") { toggleBlank("white"); }
    else if (e.key === "Escape") { window.hymnalBridge.exitPresentation(); window.close(); }
  });

  window.hymnalBridge.onSetHymn(function (hymnId) { loadHymn(hymnId); });
  window.hymnalBridge.onClosedByDisplay(function () { window.close(); });

  window.hymnalBridge.getStatus().then(function (status) {
    if (status.hasSecondDisplay) {
      el.displayStatus.textContent = "Projecting to second display";
      el.displayStatus.classList.remove("is-single");
    } else {
      el.displayStatus.textContent = "No second display — drag the display window to your projector";
      el.displayStatus.classList.add("is-single");
    }
  });

  var initialHymnId = window.HymnUtils.queryParam("hymnId");
  if (initialHymnId && initialHymnId !== "undefined" && initialHymnId !== "null") {
    loadHymn(initialHymnId);
  } else {
    render();
  }
})();
