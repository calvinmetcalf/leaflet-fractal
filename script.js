var L = require('leaflet');
var HAS_HASHCHANGE = (function() {
  var doc_mode = window.documentMode;
  return ('onhashchange' in window) &&
    (doc_mode === undefined || doc_mode > 7);
})();
require('./FractalLayer');
var map = L.map('map', { minZoom: 1 });
var JuliaControl = L.Control.extend({
  options: {
    position: 'topright'
  },
  formChange: function (map, defaults) {
    var values, inputs, len, i;

    values = {};
    values.iterations = 500;
    values.cr = -0.37;
    values.ci = 0.6;
    values.fractalType = 'julia';
    if (!defaults) {

      inputs = document.getElementsByClassName('juliaInput');
      len = inputs.length;
      i = 0;
      while (i < len) {
        if (inputs[i].name !== 'fractalType') {
          values[inputs[i].name] = parseFloat(inputs[i].value, 10);
        } else {
          values[inputs[i].name] = inputs[i].value
        }
        i++;
      }
      if (this.layer) {
        map.removeLayer(this.layer);
      }

    }
    var zoom = map.getZoom();
    var precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));
    var center = map.getCenter();
    this.layer = L.tileLayer.fractalLayer(6, values.fractalType, values.iterations, values.cr, values.ci).addTo(map);
    history.pushState(values, '', '#' + values.iterations + '/' + values.cr + '/' + values.ci + '/' + values.fractalType + '/' + zoom + '/' + center.lat.toFixed(precision) + '/' + center.lng.toFixed(precision));
    values.type = values.fractalType;
    values[values.type] = true;
    values.iter = values.iterations;
    var form = document.getElementsByClassName('juliaForm');
    if (form.length) {
      form[0].innerHTML = this.template(values);
    }
  },
  movingMap: false,
  onMapMove: function() {
    // bail if we're moving the map (updating from a hash),
    // or if the map is not yet loaded

    if (this.movingMap || !this.map._loaded) {
      return false;
    }

    var hash = this.formatHash(this.map);
    if (this.lastHash != hash) {
      location.replace(hash);
      this.lastHash = hash;
    }
  },
  update: function() {
    var hash = location.hash;
    if (hash === this.lastHash) {
      return;
    }
    var parsed = this.parseHash(hash);
    if (parsed) {
      this.movingMap = true;

      this.map.setView(parsed.center, parsed.zoom);

      this.movingMap = false;
    } else {
      this.onMapMove(this.map);
    }
  },

  // defer hash change updates every 100ms
  changeDefer: 100,
  changeTimeout: null,
  onHashChange: function() {
    // throttle calls to update() so that they only happen every
    // `changeDefer` ms
    if (!this.changeTimeout) {
      var that = this;
      this.changeTimeout = setTimeout(function() {
        that.update();
        that.changeTimeout = null;
      }, this.changeDefer);
    }
  },

  isListening: false,
  hashChangeInterval: null,
  startListening: function() {
    var that = this;
    this.map.on('moveend', this.onMapMove, this);

    if (HAS_HASHCHANGE) {
      L.DomEvent.addListener(window, 'hashchange', this.onHashChange, this);
    } else {
      clearInterval(this.hashChangeInterval);
      this.hashChangeInterval = setInterval(function () {
        that.onHashChange();
      }, 50);
    }
    this.isListening = true;
  },

  stopListening: function() {
    this.map.off('moveend', this.onMapMove, this);

    if (HAS_HASHCHANGE) {
      L.DomEvent.removeListener(window, 'hashchange', this.onHashChange, this);
    } else {
      clearInterval(this.hashChangeInterval);
    }
    this.isListening = false;
  },
  parseHash: function(hash) {
    if(hash.indexOf('#') === 0) {
      hash = hash.substr(1);
    }
    var args = hash.split('/');
    if (args.length == 7) {
      var zoom = parseInt(args[4], 10),
        lat = parseFloat(args[5]),
        lon = parseFloat(args[6]);
      if (isNaN(zoom) || isNaN(lat) || isNaN(lon)) {
        return false;
      } else {
        return {
          center: new L.LatLng(lat, lon),
          zoom: zoom
        };
      }
    } else {
      return false;
    }
  },
  formatHash: function(map) {
    var center = map.getCenter(),
      zoom = map.getZoom(),
      precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));
    var currentHash = location.hash.slice(0, 1) === '#' ? location.hash.slice(1).split('/') : location.hash.split('/');
    currentHash[currentHash.length - 3] = zoom;
    currentHash[currentHash.length - 2] = center.lat.toFixed(precision);
    currentHash[currentHash.length - 1] = center.lng.toFixed(precision);
    return '#' + currentHash.join('/');
  },
  onAdd: function (map) {
    this.map = map;
    this.lastHash = null;
    // create the control container with a particular class name
    var container = L.DomUtil.create('div', 'leaflet-control-layers leaflet-control-layers-expanded leaflet-control');
    // ... initialize other DOM elements, add listeners, etc.
    var form = L.DomUtil.create('form', 'juliaForm', container);
    var params = {};
    params.iter = 500;
    params.cr = -0.37;
    params.ci = 0.6;
    params.type = 'julia';
    //form.dispatchFormChange()
    L.DomEvent.addListener(form, 'change', function (e) {
      this.formChange(map);
    }, this);
    var hashes;
    if (location.hash && location.hash.split('/').length < 7) {
      location.hash = '';
    }
    if (location.hash) {
      hashes = location.hash.slice(0, 1) === '#' ? location.hash.slice(1).split('/') : location.hash.split('/');
      params.iter = parseFloat(hashes[0], 10);
      params.cr = parseFloat(hashes[1], 10);
      params.ci = parseFloat(hashes[2], 10);
      params.type = hashes[3];
      this.layer = L.tileLayer.fractalLayer(6, params.type, params.iter, params.cr, params.ci).addTo(map);
      var zoom = parseInt(hashes[4], 10);
      if (zoom !== zoom) {
        zoom = 2;
      }
      var lat = parseFloat(hashes[5]);
      if (lat !== lat) {
        lat = 0;
      }
      var lon = parseFloat(hashes[6]);
      if (lon !== lon) {
        lon = 0;
      }
      map.setView(new L.LatLng(lat, lon), zoom);
    } else {
      map.setView([0, 0], 2);
      this.formChange(map, true);
    }
    this.onHashChange();

    if (!this.isListening) {
      this.startListening(map);
    }
    var _this = this;
    window.onpopstate = function (event) {
      if (event.state) {
        document.getElementById('cr').value = event.state.cr;
        document.getElementById('ci').value = event.state.ci;
        document.getElementById('iter').value = event.state.iterations;
        map.removeLayer(_this.layer);
        _this.layer = L.tileLayer.fractalLayer(6, 'julia', event.state.iterations, event.state.cr, event.state.ci).addTo(map);
      }
    };
    params[params.type] = true;
    form.innerHTML = this.template(params);
    if (!L.Browser.touch) {
      L.DomEvent.disableClickPropagation(container);
      L.DomEvent.on(container, 'mousewheel', L.DomEvent.stopPropagation);
    } else {
      L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
    }

    return container;
  },
  template: require('./template.hbs')
});
map.addControl(new JuliaControl());
