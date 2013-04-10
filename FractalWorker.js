importScripts("colors.js");

//functions return number from 0 to (maxIter-1)
var fractalFunctions = {
    'mandlebrot': function(cx, cy, maxIter) {
        var iter, xn, yn, x = 0, y = 0;
        for (iter = 0; iter < maxIter; iter++) {
            xn = x*x - y*y + cx;
            yn = (x*y)*2 + cy;
            if (xn*xn + yn*yn > 4) {
                break;
            }
            x = xn;
            y = yn;
        }
        
        return iter;
    },
    'burningShip': function(cx, cy, maxIter) {
        var iter, xn, yn, x = 0, y = 0;
        for (iter = 0; iter < maxIter; iter++) {
            xn =  x*x - y*y - cx;
            yn = 2*Math.abs(x*y) + cy;
            if (xn*xn + yn*yn > 4) {
                break;
            }
            x = xn;
            y = yn;
        }
        
        return iter;
    },
    'multibrot': function(cx, cy, maxIter, cr) {
        var iter, xn, yn, x = 0, y = 0,n1,n2;
        for (iter = 0; iter < maxIter; iter++) {
            n1=Math.pow((x*x+y*y),(cr>>1));
            n2=cr*Math.atan2(y,x);
            xn=n1*Math.cos(n2) + cx;
            yn=n1*Math.sin(n2) + cy;
            if (xn*xn + yn*yn > 4) {
                break;
            }
            x = xn;
            y = yn;
        }
        
        return iter;
    },
    'multibrot3': function(cx, cy, maxIter) {
        var iter, xn, yn, x = 0, y = 0;
        for (iter = 0; iter < maxIter; iter++) {
            xn=Math.pow(x,3)-3*x*Math.pow(y,2) + cx;
            yn=3*Math.pow(x,2)*y-Math.pow(y,3) + cy;
            if (xn*xn + yn*yn > 4) {
                break;
            }
            x = xn;
            y = yn;
        }
        
        return iter;
    },
   'multibrot5': function(cx, cy, maxIter) {
        var iter, xn, yn, x = 0, y = 0;
        for (iter = 0; iter < maxIter; iter++) {
            xn=Math.pow(x,5)-(10*Math.pow(x,3)*Math.pow(y,2))+(5*x*Math.pow(y,4)) + cx;
            yn=(5*Math.pow(x,4)*y)-(10*x*x*Math.pow(y,3))+Math.pow(y,5) + cy;
            if (xn*xn + yn*yn > 4) {
                break;
            }
            x = xn;
            y = yn;
        }
        
        return iter;
    },
    'tricorn': function(cx, cy, maxIter) {
        var iter, xn, yn, x = 0, y = 0;
        for (iter = 0; iter < maxIter; iter++) {
            xn =  x*x - y*y - cx;
            yn =(x+x)*(-y) + cy;
            if (xn*xn + yn*yn > 4) {
                break;
            }
            x = xn;
            y = yn;
        }
        
        return iter;
    },
    'julia': function(cx, cy, maxIter, cr, ci) {
        var iter, xn, yn, x = cx, y = cy;
        for (iter = 0; iter < maxIter; iter++) {
            xn = x*x - y*y + cr;
            yn = (x*y)*2 + ci;
            if (xn*xn + yn*yn > 4) {
                break;
            }
            x = xn;
            y = yn;
        }
        
        return iter;
    }
}

var workerFunc = function(data,cb) {
    var scale = Math.pow(2, data.z - 1);
    var x0 = data.x / scale - 1;
    var y0 = data.y / scale - 1;
    var d = 1/(scale<<8);
    var pixels = new Array(65536);
    var MAX_ITER=data.maxIter;
    var c,cx,cy,iter,iii=0;
    for (var py = 0; py < 256; py++) {
        for (var px = 0; px < 256; px++) {
            cx = x0 + px*d;
            cy = y0 + py*d;
            
            iter = fractalFunctions[data.type](cx, cy, MAX_ITER, data.cr, data.ci);
            
            c = Math.floor((iter/MAX_ITER)*360);
            pixels[iii++] = colors[c];
        }
    }
    var array = new Uint32Array(pixels);
    data.pixels = array.buffer;
    cb(data,[data.pixels]);
}

function callBack(a,b){
    self.postMessage(a,b);
}

self.onmessage=function(e){
    workerFunc(e.data,callBack);
};