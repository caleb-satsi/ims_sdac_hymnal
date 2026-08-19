// Shared between control.html (Presenter Console) and presentation.html
// (Congregation Display). Expects window.HYMNS_DATA to already be loaded
// (via data.js) before this script runs.
window.HymnUtils = (function () {
  var DATA = window.HYMNS_DATA || { categories: [], hymns: [] };
  var BY_ID = {};
  DATA.hymns.forEach(function (h) { BY_ID[h.id] = h; });

  function getHymn(id) {
    return BY_ID[Number(id)] || null;
  }

  function orderedSlides(hymn) {
    if (!hymn) return [];
    return (hymn.sections || [])
      .slice()
      .sort(function (a, b) { return a.order - b.order; })
      .filter(function (s) { return s.content && s.content.trim(); });
  }

  function queryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  return { getHymn: getHymn, orderedSlides: orderedSlides, queryParam: queryParam };
})();
