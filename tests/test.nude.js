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


var scanCount = 0;
var videoContainer = document.getElementById('videoResult');
var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d', { willReadFrequently: true }); // Set willReadFrequently to true

// Variable to track the last scan time
var lastScanTime = 0;

// Add event listener to start scanning when video starts playing
document.getElementById('demoVideo').addEventListener('play', function() {
    var video = this;

    var scanFrame = function() {
        if (!video.paused && !video.ended) {
            var currentTime = video.currentTime;
            var timeDiff = currentTime - lastScanTime;

            // Check if at least 5 seconds have elapsed since the last scan
            if (timeDiff >= 5) {
                canvas.width = Math.min(video.videoWidth, 1920); // Limit width to 1920 pixels (1080p)
                canvas.height = Math.min(video.videoHeight, 1080); // Limit height to 1080 pixels (1080p)
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Convert ImageData to a format that can be used by nude.scan()
                nude.scanVideo(imageData.data, canvas.width, canvas.height, function(result) {
                    console.log("Nudity found in frame: " + (result ? "Yes" : "No"));
                    scanCount++; // Increment scan counter
                    displayResultOnVideoContainer(scanCount, result);
                });

                // Update the last scan time
                lastScanTime = currentTime;
            }
        }
    };

    // Scan every second
    var scanInterval = setInterval(function() {
        scanFrame();
    }, 1000); // Scan every 1 second

    // Stop scanning when the video ends
    video.addEventListener('ended', function() {
        clearInterval(scanInterval); // Stop scanning
        console.log("Video scanning complete.");
    });
});

function displayResultOnVideoContainer(scanNumber, result) {
    var resultText = "Nudity found in scan " + scanNumber + ": " + (result ? "Yes" : "No");
    var resultDiv = document.createElement('div');
    resultDiv.textContent = resultText;
    videoContainer.innerHTML = ''; // Clear previous results
    videoContainer.appendChild(resultDiv);
}
