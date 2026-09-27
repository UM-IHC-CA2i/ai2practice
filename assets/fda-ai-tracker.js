(function () {
  'use strict';

  var DATA_URL = 'data/fda-ai-summary.json';
  var COLORS = ['#2568b8','#c93636','#e97817','#16858c','#ad2458','#f3a62a','#3e8b45','#6a2ca0','#4b2ca3','#14725e','#8b7468','#7f97a1','#d44a1c','#5a8d3b','#64748b'];

  function $(id) { return document.getElementById(id); }
  function fmt(n) { return Number(n || 0).toLocaleString('en-US'); }
  function pct(n) { return Number(n || 0).toFixed(1).replace(/\.0$/, '') + '%'; }
  function dateLabel(iso) {
    if (!iso) return 'not available';
    var d = new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ''));
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-US', {year:'numeric', month:'short', day:'numeric', timeZone:'UTC'});
  }

  function setText(id, value) {
    var el = $(id);
    if (el) el.textContent = value;
  }

  function niceMax(value) {
    if (value <= 10) return 10;
    var magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    var normalized = value / magnitude;
    var step = normalized <= 2 ? 0.5 : normalized <= 5 ? 1 : 2;
    return Math.ceil(normalized / step) * step * magnitude;
  }

  function svgEl(name, attrs, text) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    if (text != null) el.textContent = text;
    return el;
  }

  function renderChart(data) {
    var root = $('fdaStackedChart');
    var legend = $('fdaPanelLegend');
    if (!root || !data.years || !data.years.length) return;

    root.innerHTML = '';
    if (legend) legend.innerHTML = '';

    var years = data.years.filter(function (y) { return y.total > 0; });
    var panels = (data.display_panels || []).slice();
    if (!panels.length) panels = ['Total'];

    var width = Math.max(1040, years.length * 37 + 95);
    var height = 430;
    var m = {top: 28, right: 20, bottom: 78, left: 55};
    var plotW = width - m.left - m.right;
    var plotH = height - m.top - m.bottom;
    var maxTotal = Math.max.apply(null, years.map(function (y) { return y.total; }));
    var yMax = niceMax(maxTotal);
    var svg = svgEl('svg', {viewBox:'0 0 '+width+' '+height, role:'img', 'aria-label':'FDA AI-Enabled Medical Device List entries by final-decision year and FDA lead panel'});

    for (var i = 0; i <= 5; i++) {
      var val = yMax * i / 5;
      var y = m.top + plotH - (val / yMax * plotH);
      svg.appendChild(svgEl('line', {x1:m.left, y1:y, x2:width-m.right, y2:y, stroke:'#dce3e8', 'stroke-width':'1'}));
      svg.appendChild(svgEl('text', {x:m.left-9, y:y+4, 'text-anchor':'end', fill:'#64748b', 'font-size':'11'}, Math.round(val)));
    }

    var stepX = plotW / years.length;
    var barW = Math.max(10, Math.min(24, stepX * 0.64));

    years.forEach(function (row, idx) {
      var x = m.left + idx * stepX + (stepX - barW) / 2;
      var yBottom = m.top + plotH;
      var panelMap = row.panels || null;
      var segments;

      if (panelMap && Object.keys(panelMap).length) {
        segments = panels.map(function (p) { return [p, Number(panelMap[p] || 0)]; });
      } else {
        segments = [['Total', Number(row.total || 0)]];
      }

      segments.forEach(function (seg) {
        if (!seg[1]) return;
        var h = seg[1] / yMax * plotH;
        yBottom -= h;
        var panelIndex = panels.indexOf(seg[0]);
        var color = panelIndex >= 0 ? COLORS[panelIndex % COLORS.length] : COLORS[0];
        var rect = svgEl('rect', {x:x, y:yBottom, width:barW, height:Math.max(1,h), fill:color});
        rect.appendChild(svgEl('title', {}, row.year + ' · ' + seg[0] + ': ' + seg[1]));
        svg.appendChild(rect);
      });

      if (row.year >= 2016 || idx === years.length - 1) {
        svg.appendChild(svgEl('text', {x:x+barW/2, y:Math.max(13, yBottom-6), 'text-anchor':'middle', fill:'#334155', 'font-size':'10', 'font-weight':'700'}, row.total));
      }

      svg.appendChild(svgEl('text', {x:x+barW/2, y:m.top+plotH+20, fill:'#64748b', 'font-size':'10', 'text-anchor':'end', transform:'rotate(-52 '+(x+barW/2)+' '+(m.top+plotH+20)+')'}, row.year));
    });

    svg.appendChild(svgEl('line', {x1:m.left, y1:m.top+plotH, x2:width-m.right, y2:m.top+plotH, stroke:'#94a3b8'}));
    svg.appendChild(svgEl('line', {x1:m.left, y1:m.top, x2:m.left, y2:m.top+plotH, stroke:'#94a3b8'}));
    root.appendChild(svg);

    if (legend) {
      panels.forEach(function (panel, idx) {
        var item = document.createElement('span');
        var swatch = document.createElement('i');
        swatch.style.background = COLORS[idx % COLORS.length];
        var total = 0;
        if (data.panel_totals) {
          var found = data.panel_totals.find(function (p) { return p.panel === panel; });
          if (found) total = found.count;
        }
        item.appendChild(swatch);
        item.appendChild(document.createTextNode(panel + (total ? ' (' + fmt(total) + ')' : '')));
        legend.appendChild(item);
      });
    }
  }

  fetch(DATA_URL, {cache:'no-store'})
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (data) {
      setText('fdaTotalDevices', fmt(data.total_list_entries));
      setText('fdaRadiologyDevices', fmt(data.radiology_entries));
      setText('fdaRadiologyShare', pct(data.radiology_share_pct));
      var lastYear = data.years && data.years.length ? data.years[data.years.length - 1] : null;
      setText('fdaLatestYearCount', lastYear ? fmt(lastYear.total) : '—');
      setText('fdaLatestYearLabel', lastYear ? ('entries in ' + lastYear.year) : 'entries in latest year');
      setText('fdaChartRange', data.years && data.years.length ? (data.years[0].year + '–' + data.years[data.years.length - 1].year) : '');
      setText('fdaLatestDecision', dateLabel(data.latest_final_decision));
      setText('fdaSyncDate', dateLabel((data.synced_at_utc || '').slice(0,10)));
      renderChart(data);
    })
    .catch(function (err) {
      var status = $('fdaDataStatus');
      if (status) status.textContent = 'FDA summary data are temporarily unavailable; the rest of the tracker remains available.';
      if (window.console) console.warn('FDA tracker data load failed:', err);
    });
})();
