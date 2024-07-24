const video = document.getElementById("video")
const canvas = document.getElementById("canvas")
const canvasContext = canvas.getContext('2d')
const startVideoButton = document.getElementById("startVideo")
const image = document.getElementById("image")
const architectureElement = document.getElementById("architecture")
const multiplierElement = document.getElementById("multiplier")
const outputStrideElement = document.getElementById("outputStride")
const quantBytesElement = document.getElementById("quantBytes")
const internalResolutionElement = document.getElementById("internalResolution")
const segmentationThresholdElement = document.getElementById("segmentationThreshold")
const backgroundBlurAmountSlider = document.getElementById("backgroundBlurAmountSlider")
const backgroundBlurAmountSliderValue = document.getElementById("backgroundBlurAmountSliderValue")
const edgeBlurAmountSlider = document.getElementById("edgeBlurAmountSlider")
const edgeBlurAmountSliderValue = document.getElementById("edgeBlurAmountSliderValue")

var bodyPixNet;
/* default values*/
var isBlurVideo = false;
var isReplaceBackground = false;
var isDrawMask = false;
var isVideoStreamActive = false;

var configValues = {
	architecture: ['MobileNetV1', 'ResNet50'],
	outputStride: [8, 16, 32],
	multiplier: [1.0, 0.75, 0.50],
	quantBytes: [4, 2, 1],
	internalResolution: ['full', 'high', 'medium', 'low'],
	segmentationThreshold: 0.75,
	flipHorizontal: true,
	backgroundBlurAmount: 20,
	edgeBlurAmount: 20
}
var architectureValueDefaultIndex = 0, outputStrideValueDefaultIndex = 1,
	multiplierValueDefaultIndex = 0, quantBytesValueDefaultIndex = 1,
	internalResolutionValueDefaultIndex = 2
var architecture, multiplier, outputStride, quantBytes, flipHorizontal, internalResolution, 
segmentationThreshold, backgroundBlurAmount, edgeBlurAmount
var multipliersSelectList = {
	'MobileNetV1': [1.0, 0.75, 0.50],
	'ResNet50': [1.0]
}
var freshLoad = true;
var architectureUpdate = false;

function init() {
	loadBodyPix()
	setupDefaultValues()
}

init()

function setupDefaultValues() {
	architecture = configValues.architecture[architectureValueDefaultIndex]
	multiplier = configValues.multiplier[multiplierValueDefaultIndex]
	outputStride = configValues.outputStride[outputStrideValueDefaultIndex]
	quantBytes = configValues.quantBytes[quantBytesValueDefaultIndex]
	internalResolution = configValues.internalResolution[internalResolutionValueDefaultIndex]
	segmentationThreshold = configValues.segmentationThreshold
	flipHorizontal = configValues.flipHorizontal
	backgroundBlurAmount = configValues.backgroundBlurAmount
	edgeBlurAmount = configValues.edgeBlurAmount

	backgroundBlurAmountSlider.value = backgroundBlurAmount
	backgroundBlurAmountSliderValue.innerHTML = backgroundBlurAmount

	edgeBlurAmountSlider.value = edgeBlurAmount
	edgeBlurAmountSliderValue.innerHTML = edgeBlurAmount

	for(let i = 0; i < configValues.architecture.length; i++){
		architectureElement.options.add(new Option(configValues.architecture[i]))
	}
	architectureElement.selectedIndex = architectureValueDefaultIndex;

	for(let i = 0; i < configValues.outputStride.length; i++){
		outputStrideElement.options.add(new Option(configValues.outputStride[i]))
	}
	outputStrideElement.selectedIndex = outputStrideValueDefaultIndex;

	for(let i = 0; i < configValues.quantBytes.length; i++){
		quantBytesElement.options.add(new Option(configValues.quantBytes[i]))
	}
	quantBytesElement.selectedIndex = quantBytesValueDefaultIndex;

	addMultiplierOptions()

	for(let i = 0; i < configValues.internalResolution.length; i++){
		internalResolutionElement.options.add(new Option(configValues.internalResolution[i]))
	}
	internalResolutionElement.selectedIndex = internalResolutionValueDefaultIndex

	segmentationThresholdElement.value = segmentationThreshold
	
	freshLoad = false;
}

function displayImage() {
	var input = document.getElementById("imgfile");

	var url = URL.createObjectURL(input.files[0]);
	canvas.style.background = "url(" + url + ") no-repeat";
	canvas.style.backgroundSize = "cover";
}

function startVideoStream() {
  navigator.mediaDevices.getUserMedia({video: true, audio: false})
    .then(stream => {
    	isVideoStreamActive = true;
      video.srcObject = stream;
      video.play();
      video.onplaying = () => {
      	canvas.height = video.videoHeight;
      	canvas.width = video.videoWidth;
      } 
    })
    .catch(error => {
      console.log(error);
    });
}

function clearCanvas() {
	canvasContext.clearRect(0, 0, canvas.width, canvas.height)
}

function stopVideoStream() {
	// A video's MediaStream object is available through its srcObject attribute
const mediaStream = video.srcObject;

// Through the MediaStream, you can get the MediaStreamTracks with getTracks():
const tracks = mediaStream.getTracks();

// Tracks are returned as an array, so if you know you only have one, you can stop it with: 
// tracks[0].stop();

// Or stop all like so:
tracks.forEach(track => track.stop())
	// video.pause()
	video.srcObject = null;
	// video.removeAttribute('src') // empty source
	video.load()
	clearCanvas()
}

function blurVideo() {
	isReplaceBackground = false
	isDrawMask = false
	isBlurVideo = true
	clearCanvas()
	performSegmentation()
}

function modifyVideoBackground() {
	isBlurVideo = false
	isDrawMask = false
	isReplaceBackground = true
	clearCanvas()
	performSegmentation()
}

function drawMaskClicked() {
	isDrawMask = true
	isBlurVideo = false
	isReplaceBackground = false
	performSegmentation()
}

async function loadBodyPix() {
	//MobileNet (smaller, faster, less accurate)
	//ResNet (larger, slower, more accurate) **new!**
    options = {
    	architecture: architecture,
    	multiplier: multiplier,
    	stride: outputStride,
    	quantBytes: quantBytes
    }
    console.log("before loadBodyPix()")
    await bodyPix.load(options)
    .then(net => {
    	bodyPixNet = net;
    	console.log("inside loadBodyPix()")
    })
    .catch(err => console.log("Error while loading bodyPix : " + err))
    console.log("after loadBodyPix() in loadBodyPix()")
}

async function performSegmentation() {
	if (bodyPixNet && video.srcObject) {

		const segmentPerson = await bodyPixNet.segmentPerson(video, {
			flipHorizontal: flipHorizontal,
			internalResolution: internalResolution,
			segmentationThreshold: segmentationThreshold
		}).catch(error => {console.log( "Error while performing person segmentation : " + error)})


		if (isReplaceBackground) {
			replaceBackground(segmentPerson)
		}

		if (isBlurVideo) {
			blur(segmentPerson)
		}

		if (isDrawMask) {
			drawMask(segmentPerson)
		}
		requestAnimationFrame(this.performSegmentation);	
	} else {
		cancelAnimationFrame(this.performSegmentation)
	}
}

function blur(segmentPerson) {
    const flipHorizontal = false;

//blur
    bodyPix.drawBokehEffect(
      canvas, video, segmentPerson, backgroundBlurAmount,
      edgeBlurAmount, flipHorizontal);
}

function drawMask(segmentation) {
const maskBackground = true;
// Convert the segmentation into a mask to darken the background.
const foregroundColor = {r: 0, g: 0, b: 0, a: 0};
const backgroundColor = {r: 0, g: 0, b: 0, a: 255};
// const backgroundDarkeningMask = bodyPix.toMask(
//     segmentation, foregroundColor, backgroundColor);
// const backgroundDarkeningMask = bodyPix.toMask(segmentation);


// The colored part image is an rgb image with a corresponding color from the
// rainbow colors for each part at each pixel, and white pixels where there is
// no part.
const coloredPartImage = bodyPix.toColoredPartMask(segmentation);
const pixelCellWidth = 10.0;


const opacity = 0;
const maskBlurAmount = 20;
const flipHorizontal = false;
// Draw the mask onto the image on a canvas.  With opacity set to 0.7 and
// maskBlurAmount set to 3, this will darken the background and blur the
// darkened background's edge.
// bodyPix.drawMask(
//     canvas, image, backgroundDarkeningMask, opacity, maskBlurAmount, flipHorizontal);

// Draw the pixelated colored part image on top of the original image onto a
// canvas.  Each pixel cell's width will be set to 10 px. The pixelated colored
// part image will be drawn semi-transparent, with an opacity of 0.7, allowing
// for the original image to be visible under.
bodyPix.drawPixelatedMask(
    canvas, image, coloredPartImage, opacity, maskBlurAmount,
    flipHorizontal, pixelCellWidth);
}

function replaceBackground(segmentPerson) {
	canvasContext.drawImage(video, 0, 0, video.width, video.height);
		var imageData = canvasContext.getImageData(0,0, video.width, video.height);
		var pixel = imageData && imageData.data;
		for (var p = 0; p<pixel.length; p+=4) {
			if (segmentPerson && segmentPerson.data[p/4] == 0) {
				pixel[p+3] = 0;
			}
		}
		canvasContext.imageSmoothingEnabled = true;
		canvasContext.putImageData(imageData,0,0);
}

function onUpdateParams() {
	architecture = architectureElement.value
	multiplier = parseFloat(multiplierElement.value)
	outputStride = parseInt(outputStrideElement.value)
	quantBytes = parseInt(quantBytesElement.value)
	// flipHorizontal = document.getElementById("flipHorizontal").checked
	reloadBodyPix()
}

async function reloadBodyPix() {
	if (!freshLoad) {
		await loadBodyPix()
		console.log("after loadBodyPix() in reloadBodyPix()")
		if (isVideoStreamActive) {
			performSegmentation()
		}
	}
	console.log("reloadBodyPix \n freshLoad: " + freshLoad + "\n isVideoStreamActive: "
		+ isVideoStreamActive + "\n architecture: " + architecture
		+ "\n outputStride: " + outputStride + "\n multiplier: " + multiplier
		+ "\n quantBytes: " + quantBytes)
}

function addMultiplierOptions() {
	while (multiplierElement.options.length) {
		multiplierElement.remove(0);
	}
  var currentMultiplierList = multipliersSelectList[architecture];
  if (currentMultiplierList) {
  	for (var i = 0; i < currentMultiplierList.length; i++) {
  		multiplierElement.options.add(new Option(currentMultiplierList[i]));
  	}
  }
  multiplierValueDefaultIndex = architecture == configValues.architecture[0] ? multiplierValueDefaultIndex : 0
  multiplierElement.selectedIndex = multiplierValueDefaultIndex
  multiplier = configValues.multiplier[multiplierValueDefaultIndex]
}

architectureElement.onchange = async function() {
	architectureUpdate = true
	architecture = architectureElement.value
	await addMultiplierOptions()
	reloadBodyPix()
}

multiplierElement.onchange = function() {
	multiplier = parseFloat(multiplierElement.value)
	if (!architectureUpdate) {
		reloadBodyPix()
	}
	architectureUpdate = false
}

outputStrideElement.onchange = function() {
	outputStride = parseInt(outputStrideElement.value)
	reloadBodyPix()
}

quantBytesElement.onchange = function() {
	quantBytes = parseInt(quantBytesElement.value)
	reloadBodyPix()
}

internalResolutionElement.onchange = function() {
	internalResolution = internalResolutionElement.value
}

segmentationThresholdElement.onchange = function() {
	segmentationThreshold = parseFloat(segmentationThresholdElement.value)
}

backgroundBlurAmountSlider.oninput = function() {
	backgroundBlurAmountSliderValue.innerHTML = backgroundBlurAmountSlider.value
	backgroundBlurAmount = parseInt(backgroundBlurAmountSlider.value)
}

edgeBlurAmountSlider.oninput = function() {
	edgeBlurAmountSliderValue.innerHTML = edgeBlurAmountSlider.value
	edgeBlurAmount = parseInt(edgeBlurAmountSlider.value)
}
