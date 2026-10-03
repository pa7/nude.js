/*
 * Nude.js - Nudity detection with Javascript and HTMLCanvas
 * No-worker version: runs the analysis on the main thread.
 * Same typed-array analysis as worker.nude.js.
 *
 * Author: Patrick Wied ( http://www.patrick-wied.at )
 * Version: 0.1  (2010-11-21)
 * License: MIT License
 */
(function(){

	var nude = (function(){
		// Regions with this many pixels or fewer are ignored
		var MIN_REGION_SIZE = 30,
		canvas = null,
		ctx = null,

		initCanvas = function(){
			// The canvas is only used as a pixel buffer, so it never needs to be in the DOM
			canvas = document.createElement("canvas");
			ctx = canvas.getContext("2d", { willReadFrequently: true });
		},

		drawElement = function(element){
			// use the intrinsic size where available (img.width is the rendered size)
			var w = element.naturalWidth || element.videoWidth || element.width,
			h = element.naturalHeight || element.videoHeight || element.height;
			if(!w || !h){
				throw new Error("nude.js: element has no size (is the image loaded yet?)");
			}
			canvas.width = w;
			canvas.height = h;
			ctx.drawImage(element, 0, 0, w, h);
		},

		loadImageById = function(id){
			var img = document.getElementById(id);
			if(!img){
				throw new Error("nude.js: no element with id '" + id + "'");
			}
			drawElement(img);
		},

		scanImage = function(fn){
			if(!canvas.width || !canvas.height){
				throw new Error("nude.js: call load() before scan()");
			}
			// throws a SecurityError for cross-origin images without CORS
			var image = ctx.getImageData(0, 0, canvas.width, canvas.height),
			width = canvas.width,
			height = canvas.height;

			// Run asynchronously so the result callback fires after scan() returns,
			// exactly as it does with the worker version.
			setTimeout(function(){
				resultHandler(fn, analyse(image.data, width, height));
			}, 0);
		},

		// executed when the analysing process is done
		// result is true (it is nude) or false (it is not nude)
		resultHandler = function(fn, result){
			if(fn){
				fn(result);
			}else if(result){
				console.log("the picture contains nudity");
			}
		},

		/*
		 * Skin classifier: the three rules of the original (RGB rule,
		 * normalised-RGB rule, HSV-style rule), allocation-free and
		 * without divisions.
		 */
		isSkin = function(r, g, b){
			var sum = r + g + b;
			if(sum === 0) return false;

			var mx = r > g ? (r > b ? r : b) : (g > b ? g : b),
			mn = r < g ? (r < b ? r : b) : (g < b ? g : b);

			// 1. RGB rule
			if(r > 95 && g > 40 && g < 100 && b > 20 &&
			   (mx - mn) > 15 && (r - g) > 15 && r > b){
				return true;
			}

			// 2. Normalised RGB rule: (r/g) > 1.185 && r*b/sum^2 > 0.107 && r*g/sum^2 > 0.112
			var sum2 = sum * sum;
			if(r > 1.185 * g && r * b > 0.107 * sum2 && r * g > 0.112 * sum2){
				return true;
			}

			// 3. HSV rule: 0 < hue < 35 degrees and 0.23 < s < 0.68 (s = 1 - 3*min/sum).
			// Hue < 35 can only happen on the "red is max" branch with g > b, and
			// hue = 60 * (g - b) / (max - min), so no division is needed.
			if(mx === r && g > b && 60 * (g - b) < 35 * (mx - mn)){
				var m3 = 3 * mn;
				return m3 > 0.32 * sum && m3 < 0.77 * sum;
			}

			return false;
		},

		analyse = function(d, width, height){
			var total = width * height;
			if(total === 0) return false;

			// ---- Pass 1: classify + label connected skin regions (8-connectivity) ----
			// labels[i] === 0 means "not skin". Union-find resolves label equivalences.
			var labels = new Int32Array(total),
			// New labels are only created for pixels with no labelled W/NW/N/NE
			// neighbour, so they form an independent set: at most this many.
			parent = new Int32Array((((width + 1) >> 1) * ((height + 1) >> 1)) + 2),
			count = 0;

			var find = function(a){
				while(parent[a] !== a){
					parent[a] = parent[parent[a]];
					a = parent[a];
				}
				return a;
			},
			union = function(a, b){
				var ra = find(a), rb = find(b);
				if(ra < rb) parent[rb] = ra;       // smaller index always becomes root
				else if(rb < ra) parent[ra] = rb;
			};

			var x, y, i = 0, p = 0, l;
			for(y = 0; y < height; y++){
				for(x = 0; x < width; x++, i++, p += 4){
					if(!isSkin(d[p], d[p + 1], d[p + 2])) continue;

					var n1 = x > 0 ? labels[i - 1] : 0,
					n2 = (y > 0 && x > 0) ? labels[i - width - 1] : 0,
					n3 = y > 0 ? labels[i - width] : 0,
					n4 = (y > 0 && x < width - 1) ? labels[i - width + 1] : 0,
					lab = n1;

					if(n2 && (!lab || n2 < lab)) lab = n2;
					if(n3 && (!lab || n3 < lab)) lab = n3;
					if(n4 && (!lab || n4 < lab)) lab = n4;

					if(!lab){
						lab = ++count;
						parent[lab] = lab;
					}else{
						if(n1 && n1 !== lab) union(lab, n1);
						if(n2 && n2 !== lab) union(lab, n2);
						if(n3 && n3 !== lab) union(lab, n3);
						if(n4 && n4 !== lab) union(lab, n4);
					}
					labels[i] = lab;
				}
			}

			// ---- Flatten the label tree in one sweep (parent[l] <= l always holds) ----
			for(l = 1; l <= count; l++){
				parent[l] = parent[parent[l]];
			}

			// ---- Pass 2: region sizes ----
			var sizes = new Int32Array(count + 1);
			for(i = 0; i < total; i++){
				l = labels[i];
				if(l){
					l = parent[l];
					labels[i] = l;
					sizes[l]++;
				}
			}

			// ---- Find the three largest regions (no sorting needed) ----
			var regionCount = 0, totalSkin = 0,
			t1 = 0, t2 = 0, t3 = 0,      // labels of the top three
			s1 = 0, s2 = 0, s3 = 0;      // their sizes

			for(l = 1; l <= count; l++){
				var size = sizes[l];
				if(parent[l] !== l || size <= MIN_REGION_SIZE) continue;
				regionCount++;
				totalSkin += size;
				if(size > s1){
					t3 = t2; s3 = s2; t2 = t1; s2 = s1; t1 = l; s1 = size;
				}else if(size > s2){
					t3 = t2; s3 = s2; t2 = l; s2 = size;
				}else if(size > s3){
					t3 = l; s3 = size;
				}
			}

			// Fewer than three regions: not nude
			if(regionCount < 3) return false;

			// Less than 15% skin: not nude
			if((totalSkin / total) * 100 < 15) return false;

			// Largest < 35% AND second < 30% AND third < 30% of the skin: not nude
			if((s1 / totalSkin) * 100 < 35 &&
			   (s2 / totalSkin) * 100 < 30 &&
			   (s3 / totalSkin) * 100 < 30) return false;

			// Largest region < 45% of the skin: not nude
			if((s1 / totalSkin) * 100 < 45) return false;

			// ---- Bounding box of the three largest regions ----
			var minX = width, minY = height, maxX = -1, maxY = -1;
			i = 0;
			for(y = 0; y < height; y++){
				for(x = 0; x < width; x++, i++){
					l = labels[i];
					if(l && (l === t1 || l === t2 || l === t3)){
						if(x < minX) minX = x;
						if(x > maxX) maxX = x;
						if(y < minY) minY = y;
						if(y > maxY) maxY = y;
					}
				}
			}

			// ---- Skin pixels and average intensity inside the bounding box ----
			var polyArea = (maxX - minX + 1) * (maxY - minY + 1),
			polySkin = 0, intensitySum = 0;

			for(y = minY; y <= maxY; y++){
				i = y * width + minX;
				p = i * 4;
				for(x = minX; x <= maxX; x++, i++, p += 4){
					if(labels[i]){
						polySkin++;
						intensitySum += d[p] + d[p + 1] + d[p + 2];
					}
				}
			}
			var avgIntensity = intensitySum / (3 * 255 * polySkin);

			// Skin < 30% of the image AND < 55% of the polygon filled with skin: not nude
			if(totalSkin < 0.3 * total && polySkin < 0.55 * polyArea) return false;

			// More than 60 regions AND average intensity < 0.25: not nude
			if(regionCount > 60 && avgIntensity < 0.25) return false;

			return true;
		};

		// public interface
		return {
			init: function(){
				initCanvas();
			},
			load: function(param){
				if(typeof(param) == "string"){
					loadImageById(param);
				}else{
					drawElement(param);
				}
			},
			scan: function(fn){
				scanImage(typeof(fn) == "function" ? fn : null);
			}
		};
	})();

	// register nude at window object
	window.nude = nude;
	nude.init();
})();
