/*
 * Nude.js - Nudity detection with Javascript and HTMLCanvas
 * 
 * Author: Patrick Wied ( http://www.patrick-wied.at )
 * Version: 0.1  (2010-11-21)
 * License: MIT License
 */
(function(){

	var nude = (function(){
		// private var definition
		var canvas = null,
		ctx = null,
		resultFn = null,
		img = null,
		domPos = null,
		// private functions
		initCanvas = function(){
			canvas = document.createElement("canvas");
			// the canvas should not be visible
			canvas.style.display = "none";
			var b = document.getElementsByTagName("body")[0];
			b.appendChild(canvas);
			ctx = canvas.getContext("2d");
		},
		loadImage = function(id){
			
			img = document.getElementById(id);
			canvas.width = img.width;
			canvas.height = img.height;
			img.setAttribute("style", "visibility:hidden;");
			domPos = getPosition(img);
			resultFn = null;
			// draw the image into the canvas element
			ctx.drawImage(img, 0, 0);

		},
		// not ready for usage!! todo: debug
		loadImageFromVideo = function(video){
			canvas.width = video.width;
			canvas.height = video.height;
			ctx.drawImage(video, 0, 0, video.width, video.height);
		},
		scanImage = function(){
			// get the image data
			var image = ctx.getImageData(0, 0, canvas.width, canvas.height),
			imageData = image.data;

			var myWorker = new Worker('worker.js'),
			message = [imageData, canvas.width, canvas.height];
			myWorker.postMessage(message);
			myWorker.onmessage = function(event){
				resultHandler(event.data);
			}
		},
		// the result handler will be executed when the analysing process is done
		// the result contains true (it is nude) or false (it is not nude)
		// if the user passed an result function to the scan function, the result function will be executed
		// otherwise the default resulthandling executes
		resultHandler = function(result){
			
			if(resultFn){
				resultFn(result);
			}
			if(img != null){
				if(result){
					// creating the "it's nudity" - message
					var message = document.createElement("div");
					message.setAttribute("style", "position:absolute;width:300px;left:"+(domPos.left+(canvas.width/2)-150)+"px;top:"+(domPos.top+(canvas.height/2))+"px;z-index:100000;cursor:pointer;padding:10px;background-color:#d9d9d9;font-family:Arial;color:#df0019;");
					message.innerHTML = "<strong>The image contains nudity.</strong><br /><span style='color:#444;'>If this image definitely does not contain nudity click on this message</span>";
					message.onclick = function(){
						this.setAttribute("style","display:none");
						img.setAttribute("style","visibility:visible;");
					};
					
					var b = document.getElementsByTagName("body")[0];
					b.appendChild(message);
				}else{
					img.setAttribute("style","visibility:visible;");
				}
			}
		},
		// colorizeRegions function is for testdevelopment only
		// the detected skinRegions will be painted in random colors (one color per region)
		colorizeRegions = function(){
			
			var length = skinRegions.length;
			for(var i = 0; i < length; i++){
				
				var region = skinRegions[i],
				regionLength = region.length,
				randR = Math.ceil(Math.random()*255),
				randG = Math.ceil(Math.random()*255),
				rangB = Math.ceil(Math.random()*255);
				
				for(var o = 0; o < regionLength; o++){
					
					var pixel = ctx.getImageData(region[o].x, region[o].y, 1,1),
					pdata = pixel.data;
					
					pdata[0] = randR;
					pdata[1] = randG;
					pdata[2] = rangB;
					
					pixel.data = pdata;
					
					ctx.putImageData(pixel, region[o].x, region[o].y);
					
				}
				
			}
			
		},
		getPosition = function(el){
			var x = 0, y = 0;
			
			while(el != null){
				x += el.offsetLeft;
				y += el.offsetTop;
				el = el.offsetParent;
			}
			return { "left":x, "top":y };
		}
		// public interface
		return {
			init: function(){
				initCanvas();
			},
			load: function(param){
				if(typeof(param)!="string"){
					// if it's not an image tag ID
					// it's a video element
					loadImageFromVideo(param);
				}else{
					loadImage(param);
				}
			},
			scan: function(fn){
				if(arguments.length>0 && typeof(arguments[0]) == "function"){
					resultFn = fn;
				}
				scanImage();
			}
		};
	})();
	// register nude at window object
	if(!window.nude)
		window.nude = nude;
})();

window.onload = function(){
	nude.init();
}