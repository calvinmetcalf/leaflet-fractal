var L = require('leaflet');
var LRUCache = require('lru-cache');
var debug = require('debug')('leaflet:fractal');
L.TileLayer.FractalLayer = L.TileLayer.Canvas.extend({
  options: {
    async: true,
    maxZoom: 23,
    continuousWorld: true
  },
  initialize: function (numWorkers, fractalType, maxIter, cr, ci) {
    this.fractalType = fractalType || 'mandlebrot';
    this.numWorkers = numWorkers;
    this._workers = new Array(this.numWorkers);

    this.messages = {};
    this.queue = { total: numWorkers };
    this.cr = cr || -0.74543;
    this.ci = ci || 0.11301;
    this.maxIter = maxIter || 500;
    this.cache = LRUCache({
      max: 500
    });
    this.workerPath = 'worker.js';
  },
  onAdd: function (map) {
    var _this = this;
    var i = 0;
    var next;
    this.queue.free = [];
    this.queue.len = 0;
    this.queue.tiles = [];
    function onWorker(e) {
      debug(Date.now() - e.data.start + ':' + e.data.tileID);
      var canvas;
      if (_this.queue.len) {
        _this.queue.len--;
        next = _this.queue.tiles.shift();
        _this._renderTile(next[0], next[1], e.data.workerID);
      } else {
        _this.queue.free.push(e.data.workerID);
      }
      if (e.data.tileID in _this.messages) {
        canvas = _this.messages[e.data.tileID];
      } else {
        return;
      }
      _this.cache.set(e.data.tileID, e.data);
      var array = new Uint8Array(e.data.pixels);
      var ctx = canvas.getContext('2d');
      var imagedata = ctx.getImageData(0, 0, 256, 256);
      imagedata.data.set(array);
      ctx.putImageData(imagedata, 0, 0);
      _this.tileDrawn(canvas);
    }
    while (i < this.numWorkers) {
      this.queue.free.push(i);
      this._workers[i] = new Worker(this.workerPath);
      this._workers[i].onmessage = onWorker;
      i++;
    }

    this.on('tileunload', function (e) {
      if (e.tile._tileIndex) {
        var pos = e.tile._tileIndex,
          tileID = [pos.x, pos.y, pos.z].join(':');
        if (tileID in _this.messages) {
          delete _this.messages[tileID];
        }
      }
    });

    map.on('zoomstart', function () {
      this.queue.len = 0;
      this.queue.tiles = [];
    }, this);
    return L.TileLayer.Canvas.prototype.onAdd.call(this, map);
  },
  onRemove: function (map) {
    this.messages = {};
    var len = this._workers.length;
    var i = 0;
    while (i < len) {
      this._workers[i].terminate();
      i++;
    }
    return L.TileLayer.Canvas.prototype.onRemove.call(this, map);
  },
  drawTile: function (canvas, tilePoint) {
    var tileID = tilePoint.x + ':' + tilePoint.y + ':' + this._map.getZoom();
    if (this.cache.has(tileID)) {
      var array = new Uint8Array(this.cache.get(tileID).pixels);
      var ctx = canvas.getContext('2d');
      var imagedata = ctx.getImageData(0, 0, 256, 256);
      imagedata.data.set(array);
      ctx.putImageData(imagedata, 0, 0);
      this.tileDrawn(canvas);
      return;
    }
    if (!this.queue.free.length) {
      this.queue.tiles.push([canvas, tilePoint]);
      this.queue.len++;
    } else {
      this._renderTile(canvas, tilePoint, this.queue.free.pop());
    }
  },
  _renderTile: function (canvas, tilePoint, workerID) {
    var z = this._map.getZoom();
    canvas._tileIndex = { x: tilePoint.x, y: tilePoint.y, z: z };
    var tileID = tilePoint.x + ':' + tilePoint.y + ':' + z;
    this.messages[tileID] = canvas;
    var msg = {
      x: tilePoint.x,
      y: tilePoint.y,
      z: z,
      tileID: tileID,
      workerID: workerID,
      cr: this.cr,
      ci: this.ci,
      maxIter: this.maxIter,
      type: this.fractalType,
      start: Date.now()
    };
    this._workers[workerID].postMessage(msg);
  }
});
L.tileLayer.fractalLayer = function (numWorkers, t, mi, cr, ci) {
  return new L.TileLayer.FractalLayer(numWorkers, t, mi, cr, ci);
};
