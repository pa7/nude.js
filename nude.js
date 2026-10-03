/*
 * Nude.js - Nudity detection with Javascript and HTMLCanvas
 *
 * Author: Patrick Wied ( http://www.patrick-wied.at )
 * Version: 0.1  (2010-11-21)
 * License: MIT License
 */
(function(){

	var nude = (function(){
		var WORKER_URL = "worker.nude.js",
		canvas = null,
		ctx = null,
		worker = null,
		pending = [], // result callbacks, one per in-flight scan (results arrive in order)

		initCanvas = function(){
			// The canvas is only used as a pixel buffer, so it never needs to be in the DOM
			canvas = document.createElement("canvas");
			ctx = canvas.getContext("2d", { willReadFrequently: true });
		},

		// one long-lived worker instead of a new, never-terminated worker per scan
		getWorker = function(){
			if(!worker){
				worker = new Worker(WORKER_URL);
				worker.onmessage = function(event){
					resultHandler(pending.shift(), event.data);
				};
				worker.onerror = function(err){
					console.error("nude.js worker error:", err.message || err);
					var failed = pending;
					pending = [];
					worker.terminate();
					worker = null;
					for(var i = 0; i < failed.length; i++){
						resultHandler(failed[i], false);
					}
				};
			}
			return worker;
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
			message = [image.data, canvas.width, canvas.height];

			pending.push(fn);
			// transfer the pixel buffer instead of copying it
			getWorker().postMessage(message, [image.data.buffer]);
		},

		// executed when the analysing process is done
		// result is true (it is nude) or false (it is not nude)
		resultHandler = function(fn, result){
			if(fn){
				fn(result);
			}else if(result){
				console.log("the picture contains nudity");
			}
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

	// If web workers are not supported, load the main-thread version instead.
	// It registers window.nude itself, so nothing more to do here.
	if(!window.Worker){
		var fallbackUrl = "noworker.nude.js";
		if(document.readyState === "loading"){
			// still parsing: document.write keeps script execution order
			document.write(unescape("%3Cscript src='" + fallbackUrl + "' type='text/javascript'%3E%3C/script%3E"));
		}else{
			// page already loaded: document.write would wipe it, so inject a tag
			var s = document.createElement("script");
			s.src = fallbackUrl;
			(document.head || document.documentElement).appendChild(s);
		}
		return;
	}

	// register nude at window object
	if(!window.nude)
		window.nude = nude;
	// and initialize it
	nude.init();
})();
