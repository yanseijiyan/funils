/*
 Countdown Timer
*/
function updateTimer(e) {
	var t = parseInt(e.dataset.time, 10),
		r = setInterval(function () {
			if (t <= 0) return clearInterval(r), void (e.innerHTML = "00:00");
			var n = Math.floor(t / 60),
				o = t % 60,
				i = ("0" + n).slice(-2) + ":" + ("0" + o).slice(-2);
			e.innerHTML = i, t--
		}, 1e3)
}
for (var timerElements = document.querySelectorAll(".timer"), i = 0; i < timerElements.length; i++) updateTimer(timerElements[i]);