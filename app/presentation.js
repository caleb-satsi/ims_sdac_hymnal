(function () {
  "use strict";

  var el = {
    stage: document.getElementById("stage"),
    stageNum: document.getElementById("stageNum"),
    stageTitle: document.getElementById("stageTitle"),
    stageTag: document.getElementById("stageTag"),
    stageText: document.getElementById("stageText"),
    blankBlack: document.getElementById("blankBlack"),
    blankWhite: document.getElementById("blankWhite")
  };

  var state = { hymn: null, slides: [], index: 0 };

  function slideLabel(s) {
    return s.type + (s.num ? " " + s.num : "");
  }

  function render() {
    var hymn = state.hymn;
    el.stage.classList.toggle("is-idle", !hymn);
    if (!hymn) return;

    el.stageNum.textContent = "No. " + hymn.number;
    el.stageTitle.textContent = hymn.title;

    var slide = state.slides[state.index];
    if (slide) {
      el.stageTag.textContent = slideLabel(slide);
      el.stageText.textContent = slide.content;
    } else {
      el.stageTag.textContent = "";
      el.stageText.textContent = "";
    }
  }

  function loadHymn(hymnId) {
    var hymn = window.HymnUtils.getHymn(hymnId);
    state.hymn = hymn;
    state.slides = window.HymnUtils.orderedSlides(hymn);
    state.index = 0;
    render();
  }

  window.hymnalBridge.onSetHymn(function (hymnId) { loadHymn(hymnId); });

  window.hymnalBridge.onVerseChange(function (index) {
    state.index = index;
    render();
  });

  window.hymnalBridge.onBlank(function (mode) {
    el.blankBlack.classList.toggle("is-active", mode === "black");
    el.blankWhite.classList.toggle("is-active", mode === "white");
  });

  var initialHymnId = window.HymnUtils.queryParam("hymnId");
  if (initialHymnId && initialHymnId !== "undefined" && initialHymnId !== "null") {
    loadHymn(initialHymnId);
  } else {
    render();
  }
})();
