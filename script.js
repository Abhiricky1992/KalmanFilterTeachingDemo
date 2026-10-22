
Reveal.initialize({
  hash: true,
  controls: true,
  progress: true,
  center: false,
  transition: "slide",
  backgroundTransition: "fade",
  width: 1280,
  height: 720,
  margin: 0.04
});


/* =========================================
   SLIDE 2: KALMAN FILTER MOTIVATION ANIMATION
========================================= */

let kfMotivationAnimId = null;

const kfModelPoints = [
  [105,245],[150,233],[195,220],[240,208],[285,196],
  [330,184],[375,171],[420,159],[465,147],[510,135],
  [555,122],[610,105]
];

const kfUncertainPoints = [
  [105,245],[145,232],[180,246],[220,225],[260,214],
  [305,199],[345,204],[390,183],[435,168],[480,174],
  [530,145],[570,133],[610,108]
];

const kfPreciseBeacons = [
  { id: "kfGpsP0", t: 0.12 },
  { id: "kfGpsP1", t: 0.27 },
  { id: "kfGpsP2", t: 0.42 },
  { id: "kfGpsP3", t: 0.58 },
  { id: "kfGpsP4", t: 0.75 },
  { id: "kfGpsP5", t: 0.92 }
];

const kfUncertainBeacons = [
  { id: "kfGpsU0", t: 0.12 },
  { id: "kfGpsU1", t: 0.28 },
  { id: "kfGpsU2", t: 0.43 },
  { id: "kfGpsU3", t: 0.60 },
  { id: "kfGpsU4", t: 0.78 },
  { id: "kfGpsU5", t: 0.93 }
];

function kfSetOpacity(id, value) {
  const el = document.getElementById(id);
  if (el) el.style.opacity = value;
}

function kfSetCaption(text) {
  const el = document.getElementById("kfSceneCaption");
  if (el) el.textContent = text;
}

function kfSetAircraftPosition(x, y, angleDeg = -15) {
  const aircraft = document.getElementById("kfAircraft");
  if (!aircraft) return;
  aircraft.setAttribute(
    "transform",
    `translate(${x},${y}) rotate(${angleDeg})`
  );
}

function kfInterpolatePoints(points, alpha) {
  if (alpha <= 0) return { x: points[0][0], y: points[0][1], angle: -15 };
  if (alpha >= 1) {
    const n = points.length;
    const dx = points[n - 1][0] - points[n - 2][0];
    const dy = points[n - 1][1] - points[n - 2][1];
    return {
      x: points[n - 1][0],
      y: points[n - 1][1],
      angle: Math.atan2(dy, dx) * 180 / Math.PI
    };
  }

  const scaled = alpha * (points.length - 1);
  const i = Math.floor(scaled);
  const local = scaled - i;

  const p0 = points[i];
  const p1 = points[Math.min(i + 1, points.length - 1)];

  const x = p0[0] + local * (p1[0] - p0[0]);
  const y = p0[1] + local * (p1[1] - p0[1]);
  const angle = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180 / Math.PI;

  return { x, y, angle };
}

function resetKFMotivationScene() {
  if (kfMotivationAnimId) {
    cancelAnimationFrame(kfMotivationAnimId);
    kfMotivationAnimId = null;
  }

  kfSetAircraftPosition(105, 245, -15);

  kfSetOpacity("kfModelTrajectory", 0);
  kfSetOpacity("kfModelLabel", 0);
  kfSetOpacity("kfUncertainTrajectory", 0);
  kfSetOpacity("kfUncertainLabel", 0);

  [...kfPreciseBeacons, ...kfUncertainBeacons].forEach(b => {
    kfSetOpacity(b.id, 0);
  });

  kfSetCaption("The aircraft starts from a known initial state.");
}

function kfUpdateBeacon(b, points, alpha, visibleFor) {
  const group = document.getElementById(b.id);
  if (!group) return;

  // Aircraft position at the measurement instant
  const sample = kfInterpolatePoints(points, b.t);

  // Original center of the SVG beacon
  const circle = group.querySelector("circle");
  const cx = Number(circle.getAttribute("cx"));
  const cy = Number(circle.getAttribute("cy"));

  // Move the beacon to the sampled aircraft position
  group.setAttribute(
    "transform",
    `translate(${sample.x - cx}, ${sample.y - cy})`
  );

  // Do not show the measurement before it is taken
  const elapsed = alpha - b.t;

  let opacity = 0;

  if (elapsed >= 0 && elapsed < visibleFor) {
    opacity = 1 - elapsed / visibleFor;
  }

  group.style.opacity = opacity;
}

function playKFScene(points, options = {}) {
  const {
    showModel = false,
    showUncertain = false,
    usePreciseGps = false,
    useUncertainGps = false,
    duration = 2800,
    caption = ""
  } = options;

  if (kfMotivationAnimId) {
    cancelAnimationFrame(kfMotivationAnimId);
    kfMotivationAnimId = null;
  }

  [...kfPreciseBeacons, ...kfUncertainBeacons].forEach(b => {
    kfSetOpacity(b.id, 0);
  });

  kfSetOpacity("kfModelTrajectory", showModel ? 1 : 0);
  kfSetOpacity("kfModelLabel", showModel ? 1 : 0);
  kfSetOpacity("kfUncertainTrajectory", showUncertain ? 1 : 0);
  kfSetOpacity("kfUncertainLabel", showUncertain ? 1 : 0);

  if (caption) kfSetCaption(caption);

  const start = performance.now();

  function frame(now) {
    const alpha = Math.min((now - start) / duration, 1);
    const pose = kfInterpolatePoints(points, alpha);
    kfSetAircraftPosition(pose.x, pose.y, pose.angle);

	// Animation 2: precise GPS measurements
	if (usePreciseGps) {
		kfPreciseBeacons.forEach(b => {
		kfUpdateBeacon(b, points, alpha, 0.11);
		});
	}

	// Animation 3: GPS measurements with uncertainty
	if (useUncertainGps) {
		kfUncertainBeacons.forEach(b => {
		kfUpdateBeacon(b, points, alpha, 0.14);
		});
	}

    if (alpha < 1) {
      kfMotivationAnimId = requestAnimationFrame(frame);
    } else {
      kfMotivationAnimId = null;
    }
  }

  requestAnimationFrame(frame);
}

function playKFModelScene() {
  playKFScene(kfModelPoints, {
    showModel: true,
    showUncertain: false,
    usePreciseGps: false,
    useUncertainGps: false,
	duration: 5500,
    caption: "A constant-velocity model predicts a simple straight trajectory."
  });
}

function playKFMeasurementScene() {
  playKFScene(kfModelPoints, {
    showModel: false,
    showUncertain: false,
    usePreciseGps: true,
    useUncertainGps: false,
	duration: 5500,
    caption: "GPS provides sampled position measurements along the path."
  });
}

function playKFUncertainScene() {
  playKFScene(kfUncertainPoints, {
    showModel: false,
    showUncertain: true,
    usePreciseGps: false,
    useUncertainGps: true,
	duration: 5500,
    caption: "In reality, both the motion model and GPS measurements are uncertain."
  });
}

Reveal.on("slidechanged", event => {
  if (
    event.currentSlide &&
    event.currentSlide.classList.contains("kf-motivation-slide")
  ) {
    setTimeout(resetKFMotivationScene, 120);
  }
});

Reveal.on("fragmentshown", event => {
  const slide = event.fragment.closest(".kf-motivation-slide");
  if (!slide) return;

  const idx = Number(event.fragment.dataset.fragmentIndex);

  if (idx === 0) playKFModelScene();
  if (idx === 1) playKFMeasurementScene();
  if (idx === 2) playKFUncertainScene();
});

Reveal.on("fragmenthidden", event => {
  const slide = event.fragment.closest(".kf-motivation-slide");
  if (!slide) return;

  const idx = Number(event.fragment.dataset.fragmentIndex);

  if (idx === 2) {
    playKFMeasurementScene();
  } else if (idx === 1) {
    playKFModelScene();
  } else if (idx === 0) {
    resetKFMotivationScene();
  }
});