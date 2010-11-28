window.onload = function(){


	var images = [
					{"id":"testImage", "expected":false}, {"id":"testImage2", "expected":false}, {"id":"testImage3", "expected":false},
					{"id":"testImage4", "expected":true}
				];
	
	var matches = [];
	var startTime = new Date().getTime();
	
	
	(function testImage(i){
	
		var image = images[i];
		
		nude.load(image.id);
		nude.scan(function(result){
			if(result == image.expected){
				matches.push(image);
			}
			if(i != images.length-1){
					testImage(i+1);
			}else{
					var endTime = new Date().getTime();
					console.log("Test complete:");
					console.log("Test duration: "+(endTime-startTime)+"ms");
					console.log("Checked "+images.length + " images for nudity.");
					console.log(matches.length + " / "+ images.length + " images returned the expected result");
					if(matches.length != images.length){
						console.log("Detection algorithm checked successfully for nudity at the following images: ");
						console.log(matches);
					}
			}
		});
	
	})(0);
	

	
	


}