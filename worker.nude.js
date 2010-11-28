/*
 * Nude.js - Nudity detection with Javascript and HTMLCanvas
 * 
 * Author: Patrick Wied ( http://www.patrick-wied.at )
 * Version: 0.1  (2010-11-21)
 * License: MIT License
 */
var skinRegions = [],
skinMap = [],
canvas = {};

onmessage = function(event){
	canvas.width = event.data[1];
	canvas.height = event.data[2];
	scanImage(event.data[0]);
};



Array.prototype.remove = function(index) {
	  var rest = this.slice(index + 1);
	  this.length = index;
	  return this.push.apply(this, rest);
};

function scanImage(imageData){

var detectedRegions = [],
mergeRegions = [],
width = canvas.width,
lastFrom = -1,
lastTo = -1;

	
var addMerge = function(from, to){
	lastFrom = from;
	lastTo = to;
	var len = mergeRegions.length,
	fromIndex = -1,
	toIndex = -1;
	
	
	while(len--){
	
		var region = mergeRegions[len],
		rlen = region.length;
		
		while(rlen--){
		
			if(region[rlen] == from){
				fromIndex = len;
			}
			
			if(region[rlen] == to){
				toIndex = len;
			}
									
		}
		
	}

	if(fromIndex != -1 && toIndex != -1 && fromIndex == toIndex){
		return;
	}
	
	if(fromIndex == -1 && toIndex == -1){

		mergeRegions.push([from, to]);
		
		return;
	}
	if(fromIndex != -1 && toIndex == -1){

		mergeRegions[fromIndex].push(to);
		return;
	}
	if(fromIndex == -1 && toIndex != -1){
		mergeRegions[toIndex].push(from);
		return;
	}
	if(fromIndex != -1 && toIndex != -1 && fromIndex != toIndex){
		mergeRegions[fromIndex] = mergeRegions[fromIndex].concat(mergeRegions[toIndex]);
		mergeRegions.remove(toIndex);
		return;
	}

};

// iterate the image from the top left to the bottom right
var length = imageData.length,
width = canvas.width;

for(var i = 0, u = 1; i < length; i+=4, u++){
	
	var r = imageData[i],
	g = imageData[i+1],
	b = imageData[i+2],
	x = (u>width)?((u%width)-1):u,
	y = (u>width)?(Math.ceil(u/width)-1):1;
	
	if(classifySkin(r, g, b)){ // 
		skinMap.push({"id": u, "skin": true, "region": 0, "x": x, "y": y, "checked": false});
		
		var region = -1,
		checkIndexes = [u-2, (u-width)-2, u-width-1, (u-width)],
		checker = false;
		
		for(var o = 0; o < 4; o++){
			var index = checkIndexes[o];
			if(skinMap[index] && skinMap[index].skin){
				if(skinMap[index].region!=region && region!=-1 && lastFrom!=region && lastTo!=skinMap[index].region){
					addMerge(region, skinMap[index].region);
				}
				region = skinMap[index].region;
				checker = true;
			}
		}

		if(!checker){
			skinMap[u-1].region = detectedRegions.length;
			detectedRegions.push([skinMap[u-1]]);
			continue;
		}else{
			
			if(region > -1){
				
				if(!detectedRegions[region]){
					detectedRegions[region] = [];
				}

				skinMap[u-1].region = region;					
				detectedRegions[region].push(skinMap[u-1]);

			}
		}
		
	}else{
		skinMap.push({"id": u, "skin": false, "region": 0, "x": x, "y": y, "checked": false});
	}

}

merge(detectedRegions, mergeRegions);
analyseRegions();
};

// function for merging detected regions
function merge(detectedRegions, mergeRegions){

var length = mergeRegions.length,
detRegions = [];


// merging detected regions 
while(length--){
	
	var region = mergeRegions[length],
	rlen = region.length;

	if(!detRegions[length])
		detRegions[length] = [];

	while(rlen--){
		var index = region[rlen];
		detRegions[length] = detRegions[length].concat(detectedRegions[index]);
		detectedRegions[index] = [];
	}

}

// push the rest of the regions to the detRegions array
// (regions without merging)
var l = detectedRegions.length;
while(l--){
	if(detectedRegions[l].length > 0){
		detRegions.push(detectedRegions[l]);
	}
}

// clean up
clearRegions(detRegions);

};

// clean up function
// only pushes regions which are bigger than a specific amount to the final result
function clearRegions(detectedRegions){

var length = detectedRegions.length;

for(var i=0; i < length; i++){
	if(detectedRegions[i].length > 30){
		skinRegions.push(detectedRegions[i]);
	}
}

};

function analyseRegions(){

// sort the detected regions by size
var length = skinRegions.length,
totalPixels = canvas.width * canvas.height,
totalSkin = 0;

// if there are less than 3 regions
if(length < 3){
	postMessage(false);
	return;
}

// sort the skinRegions with bubble sort algorithm
(function(){ 
	var sorted = false;
	while(!sorted){
		sorted = true;
		for(var i = 0; i < length-1; i++){
			if(skinRegions[i].length < skinRegions[i+1].length){
				sorted = false;
				var temp = skinRegions[i];
				skinRegions[i] = skinRegions[i+1];
				skinRegions[i+1] = temp;
			}
		}
	}
})();

// count total skin pixels
while(length--){
	totalSkin += skinRegions[length].length;
}

// check if there are more than 15% skin pixel in the image
if((totalSkin/totalPixels)*100 < 15){
	// if the percentage lower than 15, it's not nude!
	//console.log("it's not nude :) - total skin percent is "+((totalSkin/totalPixels)*100)+"% ");
	postMessage(false);
	return;				
}


// check if the largest skin region is less than 35% of the total skin count
// AND if the second largest region is less than 30% of the total skin count
// AND if the third largest region is less than 30% of the total skin count
if((skinRegions[0].length/totalSkin)*100 < 35 
		&& (skinRegions[1].length/totalSkin)*100 < 30
		&& (skinRegions[2].length/totalSkin)*100 < 30){
	// the image is not nude.
	//console.log("it's not nude :) - less than 35%,30%,30% skin in the biggest areas :" + ((skinRegions[0].length/totalSkin)*100) + "%, " + ((skinRegions[1].length/totalSkin)*100)+"%, "+((skinRegions[2].length/totalSkin)*100)+"%");
	postMessage(false);
	return;
	
}

// check if the number of skin pixels in the largest region is less than 45% of the total skin count
if((skinRegions[0].length/totalSkin)*100 < 45){
	// it's not nude
	//console.log("it's not nude :) - the biggest region contains less than 45%: "+((skinRegions[0].length/totalSkin)*100)+"%");
	postMessage(false);
	return;
}

// TODO:
// build the bounding polygon by the regions edge values:
// Identify the leftmost, the uppermost, the rightmost, and the lowermost skin pixels of the three largest skin regions.
// Use these points as the corner points of a bounding polygon.

// TODO:
// check if the total skin count is less than 30% of the total number of pixels
// AND the number of skin pixels within the bounding polygon is less than 55% of the size of the polygon
// if this condition is true, it's not nude.

// TODO: include bounding polygon functionality
// if there are more than 60 skin regions and the average intensity within the polygon is less than 0.25
// the image is not nude
if(skinRegions.length > 60){
	//console.log("it's not nude :) - more than 60 skin regions");
	postMessage(false);
	return;
}


// otherwise it is nude
postMessage(true);
			
};
function classifySkin(r, g, b){
	// A Survey on Pixel-Based Skin Color Detection Techniques
	var rgbClassifier = ((r>95) && (g>40 && g <100) && (b>20) && ((Math.max(r,g,b) - Math.min(r,g,b)) > 15) && (Math.abs(r-g)>15) && (r > g) && (r > b)),
	nurgb = toNormalizedRgb(r, g, b),
	nr = nurgb[0],
	ng = nurgb[1],
	nb = nurgb[2],
	normRgbClassifier = (((nr/ng)>1.185) && (((r*b)/(Math.pow(r+g+b,2))) > 0.107) && (((r*g)/(Math.pow(r+g+b,2))) > 0.112)),
	//hsv = toHsv(r, g, b),
	//h = hsv[0]*100,
	//s = hsv[1],
	//hsvClassifier = (h < 50 && h > 0 && s > 0.23 && s < 0.68);
	hsv = toHsvTest(r, g, b),
	h = hsv[0],
	s = hsv[1],
	hsvClassifier = (h > 0 && h < 35 && s > 0.23 && s < 0.68);
	/*
	 * ycc doesnt work
	 
	ycc = toYcc(r, g, b),
	y = ycc[0],
	cb = ycc[1],
	cr = ycc[2],
	yccClassifier = ((y > 80) && (cb > 77 && cb < 127) && (cr > 133 && cr < 173));
	*/
	
	return (rgbClassifier || normRgbClassifier || hsvClassifier); // 
};
function toYcc(r, g, b){
	r/=255,g/=255,b/=255;
	var y = 0.299*r + 0.587*g + 0.114*b,
	cr = r - y,
	cb = b - y;
	
	return [y, cr, cb];
};

function toHsv(r, g, b){
	return [
	        // hue
	        Math.acos((0.5*((r-g)+(r-b)))/(Math.sqrt((Math.pow((r-g),2)+((r-b)*(g-b)))))),
	        // saturation
	        1-(3*((Math.min(r,g,b))/(r+g+b))),
	        // value
	        (1/3)*(r+g+b)
	        ];
};
function toHsvTest(r, g, b){
	var h = 0,
	mx = Math.max(r, g, b),
	mn = Math.min(r, g, b),
	dif = mx - mn;
	
	if(mx == r){
		h = (g - b)/dif;
	}else if(mx == g){
		h = 2+((g - r)/dif)
	}else{
		h = 4+((r - g)/dif);
	}
	h = h*60;
	if(h < 0){
		h = h+360;
	}
	
	return [h, 1-(3*((Math.min(r,g,b))/(r+g+b))),(1/3)*(r+g+b)] ;	
	
};
function toNormalizedRgb(r, g, b){
	var sum = r+g+b;
	return [(r/sum), (g/sum), (b/sum)];
};
