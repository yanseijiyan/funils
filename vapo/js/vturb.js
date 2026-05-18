/*
 Vturb Video Delay
*/

// Get data
var delaySeconds = document.getElementById("video").dataset.vdelay;

// Hidden Content
document.addEventListener("DOMContentLoaded", function () {
	/* Change here */
	var SECONDS_TO_DISPLAY = delaySeconds;
	var CLASS_TO_DISPLAY = ".esconder";
	/* END Change here */
	var attempts = 0;
	var elsHiddenList = [];
	var elsDisplayed = false;
	var elsHidden = document.querySelectorAll(CLASS_TO_DISPLAY);
	var alreadyDisplayedKey = `alreadyElsDisplayed${SECONDS_TO_DISPLAY}`
	var alreadyElsDisplayed = null;
	try {
		alreadyElsDisplayed = localStorage.getItem(alreadyDisplayedKey);
	} catch (e) {
		console.warn('Failed to read data from localStorage: ', e);
	}
	setTimeout(function () { elsHiddenList = Array.prototype.slice.call(elsHidden); }, 0);
	var showHiddenElements = function () {
		elsDisplayed = true;
		elsHiddenList.forEach((e) => e.style.display = "block");
		try {
			localStorage.setItem(alreadyDisplayedKey, true);
		} catch (e) {
			console.warn('Failed to save data in localStorage: ', e);
		}
	}
	var startWatchVideoProgress = function () {
		if (typeof smartplayer === 'undefined' || !(smartplayer.instances && smartplayer.instances.length)) {
			if (attempts >= 10) return;
			attempts += 1;
			return setTimeout(function () { startWatchVideoProgress() }, 1000);
		}
		smartplayer.instances[0].on('timeupdate', () => {
			if (elsDisplayed || smartplayer.instances[0].smartAutoPlay) return;
			if (smartplayer.instances[0].video.currentTime < SECONDS_TO_DISPLAY) return;
			showHiddenElements();
		})
	}
	if (alreadyElsDisplayed === 'true') {
		setTimeout(function () { showHiddenElements(); }, 100);
	} else {
		startWatchVideoProgress()
	}
});