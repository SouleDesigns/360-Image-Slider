/**
* SouleDesigns forked heartcode's original 360 script 02/25/2013
*
* Converted to plugin since I will likely use this JQuery plugin for ZBrush and Maya turntables as it is awesome to
* show them off on the web!  Added options to enable passing in url format string to plugin, along with frame start,
* total frames, frame padding, etc.  All options which are typical when exporting an image sequence from a 3D application.
*/
//
(function( $ ){

  $.fn.threesixty = function( options ) {  

    // Create some defaults, extending them with any options that were provided
    var settings = $.extend( { 
      'startFrame'  			: 0,
      'totalFrames' 			: 30,
	  'imageUrl'				: '',
	  'imageNumberPadding' 		:  0,
	  'loadedSpins'				:  1,
	  'loadingBackgroundColor'	: 'rgb(32,32,35)',
	  'loadingSpinnerColor'		:  '#98A580'
    }, options);

    return this.each(function() {        

		var 
			// Reference to container element
			$this = $(this),
			// Tells if the app is ready for user interaction
			ready = false,
			// Tells the app if the user is dragging the pointer
			dragging = false,
			// Stores the pointer starting X position for the pointer tracking
			pointerStartPosX = 0,
			// Stores the pointer ending X position for the pointer tracking
			pointerEndPosX = 0,
			// Stores the distance between the starting and ending pointer X position in each time period we are tracking the pointer
			pointerDistance = 0,

			// The starting time of the pointer tracking period
			monitorStartTime = 0,
			// The pointer tracking time duration
			monitorInt = 10,
			// A setInterval instance used to call the rendering function
			ticker = 0,
			// Sets the speed of the image sliding animation
			speedMultiplier = 10,
			// CanvasLoader instance variable
			spinner,
			// Stores the total amount of images we have in the sequence
			totalFrames = settings.totalFrames,
			// Start frames used for inital loading loop only, internal implementation is all 0 based
			startFrame = settings.startFrame,
			// The current frame value of the image slider animation
			currentFrame = 0,
			// Stores all the loaded image objects
			frames = [],
			// The value of the end frame which the currentFrame will be tweened to during the sliding animation
			endFrame = 0,
			// We keep track of the loaded images by increasing every time a new image is added to the image slider
			loadedImages = settings.startFrame,
			// image url to append number onto - formatted where {0} is the value replaced by load images
			loadImageUrl = settings.imageUrl,
			// loadedImages fixed length
			loadedImagesPadding = settings.imageNumberPadding,
			// Number of times the animation spins when it is initially loaded
			loadedSpins = settings.loadedSpins,
			// Color of the loading spinner
			spinnerColor = settings.loadingSpinnerColor,
			// Background color to display behind loading spinner, will also show should the images contain alpha transparency
			spinnerBackgroundColor = settings.loadingBackgroundColor;
    
	
		// Fire it up!
		init();
	
		/**
		* Initalizes the 360 spinner
		*/
		function init() {
			
			// Generate guid as spinner id
			var spinnerId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {var r = Math.random()*16|0,v=c=='x'?r:r&0x3|0x8;return v.toString(16);})			
			
			// Setup html - done to allow basic container element without need to repeat this html 
			// everytime the plug is used
			$this.addClass("threesixty");
			$this.css("backgroundColor", spinnerBackgroundColor);
			$this.append("<div id=" + spinnerId + " class='spinner'><span style='color:" + spinnerColor + ";'>0%</span></div><ol class='threesixty_images'></ol>");
			
			// Add progress spinner	
			addSpinner(spinnerId);
			
			// Start loading images
			loadImage();
		}
	
		/**
		* Adds a "spiral" shaped CanvasLoader instance to the .spinner div
		*/
		function addSpinner (spinnerId) {
			spinner = new CanvasLoader(spinnerId);
			spinner.setShape("spiral");
			spinner.setDiameter(90);
			spinner.setDensity(90);
			spinner.setRange(1);
			spinner.setSpeed(4);
			spinner.setColor(spinnerColor);
			// As its hidden and not rendering by default we have to call its show() method
			spinner.show();
			// We use the jQuery fadeIn method to slowly fade in the preloader
			$this.find(".spinner").fadeIn("slow");
		};
		
		/**
		* Pads the input number with length amount of zeros
		*/
		function pad(number, length) {
			var str = '' + number;
			while (str.length < length) {
				str = '0' + str;
			}
		   
			return str;
		}
		
		/**
		* Creates a new <li> and loads the next image in the sequence inside it.
		* With jQuery we add the "load" event handler to the image, so when it's successfully loaded, we call the "imageLoaded" function.
		*/
		function loadImage() {
			// Creates a new <li>
			var li = document.createElement("li");
			
			// Generates the image file name using the incremented "loadedImages" variable	
			var loadedImagesString = pad(loadedImages, loadedImagesPadding);	
			var imageName = loadImageUrl.replace("{0}", loadedImagesString);
			
			/*
				Creates a new <img> and sets its src attribute to point to the file name we generated.
				It also hides the image by applying the "previous-image" CSS class to it.
				The image then is added to the <li>.
			*/
			var image = $('<img>').attr('src', imageName).addClass("previous-image").appendTo(li);
			// We add the newly added image object (returned by jQuery) to the "frames" array.
			frames.push(image);
			// We add the <li> to the <ol>
			$this.find(".threesixty_images").append(li);
			/*
				Adds the "load" event handler to the new image.
				When the event triggers it calls the "imageLoaded" function.
			*/
			$(image).load(function() {
				imageLoaded();
			});
		};
		
		/**
		* It handles the image "load" events.
		* Each time this function is called it checks if all the images have been loaded or it has to load the next one.
		* Every time a new image is succesfully loaded, we set the percentage value of the preloader to notify the user about the loading progress.
		* If all the images are loaded, it hides the preloader using the jQuery "fadeOut" method, which on complete stops the preloader rendering
		* and calls the "showThreesixty" method, that displays the image slider.
		*/
		function imageLoaded() {
			// Increments the value of the "loadedImages" variable
			loadedImages++;
			// Updates the preloader percentage text
			$this.find(".spinner span").text(Math.floor(loadedImages / (totalFrames + startFrame) * 100) + "%");
			// Checks if the currently loaded image is the last one in the sequence...
			if (loadedImages == totalFrames + startFrame) {
				// ...if so, it makes the first image in the sequence to be visible by removing the "previous-image" class and applying the "current-image" on it
				frames[0].removeClass("previous-image").addClass("current-image");
				/*
					Displays the image slider by using the jQuery "fadeOut" animation and its complete event handler.
					When the preloader is completely faded, it stops the preloader rendering and calls the "showThreesixty" function to display the images.
				*/
				$this.find(".spinner").fadeOut("slow", function(){
					spinner.hide();
					showThreesixty();
				});
			} else {
				// ...if not, Loads the next image in the sequence
				loadImage();
			}
		};
		
		/**
		* Displays the images with the "swooshy" spinning effect if the 
		* "loadedSpins" variable is greater than zero - if it is zero the first
		* image is simply displayed
		*/
		function showThreesixty () {
			// Add drag to spin 360 instructions 
			$this.append("<div class='spin-360'></div>");
			$this.find(".spin-360").fadeIn("slow");
			
			// Fades in the image slider by using the jQuery "fadeIn" method
			$this.find(".threesixty_images").fadeIn("slow");
			// Sets the "ready" variable to true, so the app now reacts to user interaction 
			ready = true;
			// Sets the endFrame to an initial value to enable or disabled the loaded spin.
			endFrame =  loadedSpins * totalFrames * -1;
			refresh();
		};
		
		
		/**
		* Renders the image slider frame animations.
		*/
		function render () {
			// The rendering function only runs if the "currentFrame" value hasn't reached the "endFrame" one
			if(currentFrame !== endFrame)
			{	
				/*
					Calculates the 10% of the distance between the "currentFrame" and the "endFrame".
					By adding only 10% we get a nice smooth and eased animation.
					If the distance is a positive number, we have to ceil the value, if its a negative number, we have to floor it to make sure
					that the "currentFrame" value surely reaches the "endFrame" value and the rendering doesn't end up in an infinite loop.
				*/
				var frameEasing = endFrame < currentFrame ? Math.floor((endFrame - currentFrame) * 0.1) : Math.ceil((endFrame - currentFrame) * 0.1);
				// Sets the current image to be hidden
				hidePreviousFrame();
				// Increments / decrements the "currentFrame" value by the 10% of the frame distance
				currentFrame += frameEasing;
				// Sets the current image to be visible
				showCurrentFrame();
			} else {
				// If the rendering can stop, we stop and clear the ticker
				window.clearInterval(ticker);
				ticker = 0;
			}
		};
		
		/**
		* Creates a new setInterval and stores it in the "ticker"
		* By default I set the FPS value to 60 which gives a nice and smooth rendering in newer browsers
		* and relatively fast machines, but obviously it could be too high for an older architecture.
		*/
		function refresh () {
			// If the ticker is not running already...
			if (ticker === 0) {
				// Let's create a new one!
				ticker = self.setInterval(render, Math.round(1000 / 30));
			}
		};
		
		/**
		* Hides the previous frame
		*/
		function hidePreviousFrame() {
			/*
				Replaces the "current-image" class with the "previous-image" one on the image.
				It calls the "getNormalizedCurrentFrame" method to translate the "currentFrame" value to the "totalFrames" range (1-180 by default).
			*/
			frames[getNormalizedCurrentFrame()].removeClass("current-image").addClass("previous-image");
		};
		
		/**
		* Displays the current frame
		*/
		function showCurrentFrame() {
			/*
				Replaces the "current-image" class with the "previous-image" one on the image.
				It calls the "getNormalizedCurrentFrame" method to translate the "currentFrame" value to the "totalFrames" range (1-180 by default).
			*/
			frames[getNormalizedCurrentFrame()].removeClass("previous-image").addClass("current-image");
		};
		
		/**
		* Returns the "currentFrame" value translated to a value inside the range of "startFrame" and "totalFrames"
		*/
		function getNormalizedCurrentFrame() {
			var c = -Math.ceil(currentFrame % totalFrames);
			if (c < 0) c += (totalFrames - 1);
			return c;
		};
		
		/**
		* Returns a simple event regarding the original event is a mouse event or a touch event.
		*/
		function getPointerEvent(event) {
			return event.originalEvent.targetTouches ? event.originalEvent.targetTouches[0] : event;
		};
		
		/**
		* Adds the jQuery "mousedown" event to the image slider wrapper.
		*/
		$this.mousedown(function (event) {
			// Prevents the original event handler behaciour
			event.preventDefault();
			// Stores the pointer x position as the starting position
			pointerStartPosX = getPointerEvent(event).pageX;
			// Tells the pointer tracking function that the user is actually dragging the pointer and it needs to track the pointer changes
			dragging = true;
		});
		
		/**
		* Adds the jQuery "mouseup" event to the document. We use the document because we want to let the user to be able to drag
		* the mouse outside the image slider as well, providing a much bigger "playground".
		*/
		$(document).mouseup(function (event){
			// Prevents the original event handler behaciour
			event.preventDefault();
			// Tells the pointer tracking function that the user finished dragging the pointer and it doesn't need to track the pointer changes anymore
			dragging = false;
		});
		
		/**
		* Adds the jQuery "mousemove" event handler to the document. By using the document again we give the user a better user experience
		* by providing more playing area for the mouse interaction.
		*/
		$(document).mousemove(function (event){
			// Prevents the original event handler behaciour
			event.preventDefault();
			// Starts tracking the pointer X position changes
			trackPointer(event);
		});
		
		/**
		* Touch start event handler
		*/
		$this.live("touchstart", function (event) {
			// Prevents the original event handler behaciour
			event.preventDefault();
			// Stores the pointer x position as the starting position
			pointerStartPosX = getPointerEvent(event).pageX;
			// Tells the pointer tracking function that the user is actually dragging the pointer and it needs to track the pointer changes
			dragging = true;
		});
		
		/**
		* Touch move event handler
		*/
		$this.live("touchmove", function (event) {
			// Prevents the original event handler behaciour
			event.preventDefault();
			// Starts tracking the pointer X position changes
			trackPointer(event);
		});
		
		/**
		* Touch end event handler
		*/
		$this.live("touchend", function (event) {
			// Prevents the original event handler behaciour
			event.preventDefault();
			// Tells the pointer tracking function that the user finished dragging the pointer and it doesn't need to track the pointer changes anymore
			dragging = false;
		});
		
		/**
		* Tracks the pointer X position changes and calculates the "endFrame" for the image slider frame animation.
		* This function only runs if the application is ready and the user really is dragging the pointer; this way we can avoid unnecessary calculations and CPU usage.
		*/
		function trackPointer(event) {
			// If the app is ready and the user is dragging the pointer...
			if (ready && dragging) {
				// Stores the last x position of the pointer
				pointerEndPosX = getPointerEvent(event).pageX;
				// Checks if there is enough time past between this and the last time period of tracking
				if(monitorStartTime < new Date().getTime() - monitorInt) {
					// Calculates the distance between the pointer starting and ending position during the last tracking time period
					pointerDistance = pointerEndPosX - pointerStartPosX;
					// Calculates the endFrame using the distance between the pointer X starting and ending positions and the "speedMultiplier" values
					endFrame = currentFrame + Math.ceil((totalFrames - 1) * speedMultiplier * (pointerDistance / $this.width()));
					// Updates the image slider frame animation
					refresh();
					// restarts counting the pointer tracking period
					monitorStartTime = new Date().getTime();
					// Stores the the pointer X position as the starting position (because we started a new tracking period)
					pointerStartPosX = getPointerEvent(event).pageX;
				}
			}
		};
	
	});

  };
})( jQuery );
