L.TileLayer.FractalLayer = L.TileLayer.Canvas.extend({
	options: {
		async: true,
		maxZoom:23,
		continuousWorld:true
	},
	initialize: function (workers,fractal) {
        this.messages={};
	var fractalType,mi;
		fractal=fractal||"mandlebrot";
        var _this = this;
	this.fractals = {
		mandlebrot:{
		fractalType:"xn = x*x - y*y + cx;\n\
					yn = ((x*y)*2) + cy;",
		mi:500
		},
		multibrot3:{
		fractalType:"xn=Math.pow(x,3)-3*x*Math.pow(y,2) + cx;\n\
					yn=3*Math.pow(x,2)*y-Math.pow(y,3) + cy;",
		mi:200
	},
	multibrot5:{
		fractalType:"xn=Math.pow(x,5)-(10*Math.pow(x,3)*Math.pow(y,2))+(5*x*Math.pow(y,4)) + cx;\n\
					yn=(5*Math.pow(x,4)*y)-(10*x*x*Math.pow(y,3))+Math.pow(y,5) + cy;",
		mi:500
	},
	"burning ship":{
		fractalType:"xn =  x*x - y*y - cx;\n\
					yn = 2*Math.abs(x*y) + cy;",
		mi:500
	},
	tricorn:{
		fractalType : "xn =  x*x - y*y - cx;\n\
					yn =(x+x)*(-y) + cy;",
		mi:500
	
	},
	julia:{
		fractalType : "cr = 0.1;\n\
		ci = -0.1;\n\
		xn = cr*x-ci*y+cx;\n\
					yn = 2*(cr*x+ci*y)+cy;",
		mi:50
	}
}


		communist.IEpath="ie.js";
		this.workers=workers;
		this.workerFunc=Mustache.render(this.template,this.fractals[fractal]);
        this.on("tileunload", function(e) {
            var pos = e.tile._tileIndex,
                id = [pos.x, pos.y, pos.z].join(':');
                if(id in _this.messages){
                    delete _this.messages[id];
                }
        });
		},
		onAdd:function(map){
		var _this = this;
		this._workers = new Array(_this.workers);
		var i = 0;
		while(i<_this.workers){
		this._workers[i]=communist(_this.workerFunc);
		i++
		}
		return L.TileLayer.Canvas.prototype.onAdd.call(this,map);
	},
	onRemove:function(map){
	var len = this._workers.length;
	var i =0;
	while(i<len){
	this._workers[i].close();
	i++;
	}
	return L.TileLayer.Canvas.prototype.onRemove.call(this,map);
	},
	drawTile: function (canvas, tilePoint) {
		var _this = this,
		z = this._map.getZoom();
        var tileID=tilePoint.x+":"+tilePoint.y+":"+z;
        _this.messages[tileID]=true;
		canvas._tileIndex = {x: tilePoint.x, y: tilePoint.y, z: z};
		this._workers[parseInt((Math.random()*this.workers),10)].data({x: tilePoint.x, y:tilePoint.y, z: z,id:tileID}).then(function(data) {
			 if(_this.messages[data.id]){
            var array=new Uint8ClampedArray(data.pixels);
			var ctx = canvas.getContext('2d');
			var imagedata = ctx.getImageData(0, 0, 256, 256);
			imagedata.data.set(array);
			ctx.putImageData(imagedata, 0, 0);
			_this.tileDrawn(canvas);
			 };
		});
	},
	template:"function(data,cb) {\n\
		var scale = Math.pow(2, data.z - 1);\n\
	var x0 = data.x / scale - 1;\n\
	var y0 = data.y / scale - 1;\n\
	//x0,y0 tile offset\n\
	var d = 1/(scale<<8);\n\
	var pixels = new Array(262144);\n\
	var MAX_ITER={{mi}};\n\
	var c,cx,cy,cr,ci,x,y,xn,yn,dn,zr,zi,iii=0;\n\
	//c = value\n\
	//cx,cy = absolute coords\n\
	//px,px are pixel coords\n\
	for (var py = 0; py < 256; py++) {\n\
		for (var px = 0; px < 256; px++) {\n\
			cx = x0 + px*d;\n\
			cy = y0 + py*d;\n\
			x = 0; y = 0;\n\
			for (var iter = 0; iter < MAX_ITER; iter++) {\n\
				{{fractalType}}\n\
				if (xn*xn + yn*yn > 4) {\n\
					break;\n\
				}\n\
				x = xn;\n\
				y = yn;\n\
			}\n\
		c = (iter/MAX_ITER)*360;\n\
		(function(h,s){\n\
			//from http://schinckel.net/2012/01/10/hsv-to-rgb-in-javascript/\n\
			var v = 0.75;\n\
			var rgb, i, data = [];\n\
			if (s === 0) {\n\
				rgb = [0.75, 0.1875, 0.75];\n\
			} else {\n\
				h = h / 60;\n\
				i = Math.floor(h);\n\
				data = [v*(1-s), v*(1-s*(h-i)), v*(1-s*(1-(h-i)))];\n\
				switch(i) {\n\
					case 0:\n\
						rgb = [v, data[2], data[0]];\n\
						break;\n\
					case 1:\n\
						rgb = [data[1], v, data[0]];\n\
						break;\n\
					case 2:\n\
						rgb = [data[0], v, data[2]];\n\
						break;\n\
					case 3:\n\
						rgb = [data[0], data[1], v];\n\
						break;\n\
					case 4:\n\
						rgb = [data[2], data[0], v];\n\
						break;\n\
					default:\n\
						rgb = [v, data[0], data[1]];\n\
						break;\n\
				}}\n\
				pixels[iii++]=(rgb[0]*255);\n\
				pixels[iii++]=(rgb[1]*255);\n\
				pixels[iii++]=(rgb[2]*255);\n\
				pixels[iii++]=(255);\n\
			\n\
		})(c,c===360?0:0.75)\n\
		}\n\
	}\n\
	var array = new Uint8ClampedArray(pixels);\n\
 			var buf = array.buffer;\n\
	cb({pixels: buf,id:data.id}/*,[buf]*/);\n\
}"
});
L.tileLayer.fractalLayer=function(workers,fractal){
	return new L.TileLayer.FractalLayer(workers,fractal);
}
