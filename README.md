# nude.js

***nude.js*** is a JavaScript implementation of a nudity scanner based on approaches from research papers. HTMLCanvas makes it possible to analyse image data and afterwards decide whether it should be displayed or not. The detection algorithm runs at the client, therefore it's possible (with user interaction) to display the image even if it's identified as nude (false positive)
The real world usage for client side nudity detection could be in webproxies with child security filters, and maybe even more (e.g. on social media plattforms)
nude.js is Open Source. Contributions are very welcome, the goal is to build a reliable client-side nudity scanner.

**NOTE** The algorithm is mostly based on the following paper:
https://sites.google.com/a/dcs.upd.edu.ph/csp-proceedings/Home/pcsc-2005/AI4.pdf?attredirects=0

### Demo
Test the nudity detection script on several predefined images, I didn't have enough time to build a nice demo with flickr image support but feel free to test some of your images too. nude.js is currently supported in IE9(excanvas), FF 3.6+, Chrome, Safari and Opera. For really fast results try Chrome.

Include nude.js as ususal
```HTML
<script src="nude.js/compressed/nude.min.js"></script>
```
Add images as usual
```HTML
<img src="sample1.jpg" alt="Alt text" id="image1" onclick="onImageClick('image1');" />
<img src="sample2.jpg" alt="Alt text" id="image2" onclick="onImageClick('image2');" />
<img src="sample3.jpg" alt="Alt text" id="image3" onclick="onImageClick('image3');" />
```
Then run the checking algorithm on the images you want to run it on

##### nude.js provides 3 functions:

**nude.init()**

The init function initializes nudejs by appending a hidden canvas element to the document’s body.

**nude.load(param)**

The load function sets the size of the invisible canvas element and draws the imagedata into the canvas.
It uses 2 types of parameters: a valid id of an element in the document’s body or an image/video element (CAREFUL: make sure you define width and height of your element ).

**nude.scan(function optional)**

This function initiates the scanning process, the optional function is executed after the scanning process finished.

### Example
```Javascript
nude.load(node);
// Scan it
nude.scan(function(result){ 
    alert(result ? "Nudity found in " + node.id + "!" : "Not nude");
});
```

### Project page
https://www.patrick-wied.at/static/nudejs/

### Contact
If you have any questions about the project, don't hesitate to contact me:

https://www.patrick-wied.at

contact@patrick-wied.at
