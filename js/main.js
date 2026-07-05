const PRESETS = {
  classic: {
    edgeStrength: 1.1, colorLevels: 10, smoothness: 0.65, saturation: 1.35, warmth: 0.25,
    contrast: 1.0, monochrome: 0, paperTone: 0, halftone: 0,
  },
  ghibli: {
    edgeStrength: 0.7, colorLevels: 14, smoothness: 0.85, saturation: 1.1, warmth: 0.45,
    contrast: 0.95, monochrome: 0, paperTone: 0.15, halftone: 0,
  },
  shonen: {
    edgeStrength: 1.6, colorLevels: 7, smoothness: 0.45, saturation: 1.6, warmth: 0.15,
    contrast: 1.2, monochrome: 0, paperTone: 0, halftone: 0,
  },
  pastel: {
    edgeStrength: 0.5, colorLevels: 16, smoothness: 0.9, saturation: 0.95, warmth: 0.35,
    contrast: 0.9, monochrome: 0, paperTone: 0.2, halftone: 0,
  },
  manga: {
    edgeStrength: 1.85, colorLevels: 5, smoothness: 0.5, saturation: 0, warmth: 0,
    contrast: 1.45, monochrome: 1, paperTone: 0.65, halftone: 0.55,
  },
  cyber: {
    edgeStrength: 1.25, colorLevels: 8, smoothness: 0.4, saturation: 1.85, warmth: 0,
    contrast: 1.25, monochrome: 0, paperTone: 0, halftone: 0,
  },
  noir: {
    edgeStrength: 1.15, colorLevels: 6, smoothness: 0.55, saturation: 0.25, warmth: 0.05,
    contrast: 1.55, monochrome: 0, paperTone: 0.1, halftone: 0.2,
  },
  watercolor: {
    edgeStrength: 0.35, colorLevels: 20, smoothness: 0.95, saturation: 1.15, warmth: 0.4,
    contrast: 0.85, monochrome: 0, paperTone: 0.35, halftone: 0,
  },
};

const SLIDERS = [
  { id: "edge-strength", key: "edgeStrength", decimals: 2 },
  { id: "color-levels", key: "colorLevels", decimals: 0 },
  { id: "smoothness", key: "smoothness", decimals: 2 },
  { id: "saturation", key: "saturation", decimals: 2 },
  { id: "warmth", key: "warmth", decimals: 2 },
  { id: "contrast", key: "contrast", decimals: 2 },
];

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const viewport = document.getElementById("viewport");
const loading = document.getElementById("loading");
const errorPanel = document.getElementById("error");
const errorMessage = document.getElementById("error-message");
const compareHandle = document.getElementById("compare-handle");
const recordBadge = document.getElementById("record-badge");

let renderer;
let recorder;
let stream = null;
let facingMode = "user";
let compareEnabled = false;
let compareSplit = 0.5;
let lastCaptureUrl = null;
let animationId = null;
let activePreset = "classic";

function showError(message) {
  loading.hidden = true;
  errorPanel.hidden = false;
  errorMessage.textContent = message;
}

function hideError() {
  errorPanel.hidden = true;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function startCamera() {
  hideError();
  loading.hidden = false;

  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode,
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
      audio: false,
    });

    video.srcObject = stream;
    await video.play();
    loading.hidden = true;

    if (!renderer) {
      renderer = new AnimeFilterRenderer(canvas);
      recorder = new CanvasRecorder(canvas);
      setupRecording();
    }

    renderer.setParams({ mirror: facingMode === "user" ? 1.0 : 0.0 });
    resizeViewport();
    renderLoop();
  } catch (err) {
    const msg =
      err.name === "NotAllowedError"
        ? "Camera permission denied. Allow camera access and try again."
        : err.name === "NotFoundError"
          ? "No camera found on this device."
          : `Could not start camera: ${err.message}`;
    showError(msg);
  }
}

function resizeViewport() {
  const rect = viewport.getBoundingClientRect();
  renderer.resize(rect.width, rect.height);
}

function renderLoop() {
  if (animationId) cancelAnimationFrame(animationId);

  const tick = () => {
    if (renderer) {
      renderer.setParams({
        compareSplit: compareEnabled && !recorder?.recording ? compareSplit : 1.0,
      });
      renderer.render(video);
    }
    animationId = requestAnimationFrame(tick);
  };

  tick();
}

function bindSliders() {
  SLIDERS.forEach(({ id, key, decimals }) => {
    const input = document.getElementById(id);
    const output = document.getElementById(`${id}-val`);

    const update = () => {
      const value = parseFloat(input.value);
      output.textContent = value.toFixed(decimals);
      if (renderer) renderer.setParams({ [key]: value });
      clearActivePreset();
    };

    input.addEventListener("input", update);
    update();
  });
}

function clearActivePreset() {
  activePreset = null;
  document.querySelectorAll(".preset").forEach((btn) => btn.classList.remove("active"));
}

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;

  activePreset = name;
  document.querySelectorAll(".preset").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.preset === name);
  });

  SLIDERS.forEach(({ id, key, decimals }) => {
    const input = document.getElementById(id);
    const output = document.getElementById(`${id}-val`);
    input.value = preset[key];
    output.textContent = preset[key].toFixed(decimals);
  });

  if (renderer) renderer.setParams(preset);
}

function setupCompare() {
  const toggle = document.getElementById("toggle-compare");
  let dragging = false;

  toggle.addEventListener("click", () => {
    if (recorder?.recording) return;
    compareEnabled = !compareEnabled;
    compareHandle.hidden = !compareEnabled;
    toggle.textContent = compareEnabled ? "Hide compare" : "Compare";
    toggle.classList.toggle("active", compareEnabled);
  });

  const setSplitFromX = (clientX) => {
    const rect = viewport.getBoundingClientRect();
    compareSplit = Math.min(0.95, Math.max(0.05, (clientX - rect.left) / rect.width));
    compareHandle.style.left = `${compareSplit * 100}%`;
  };

  compareHandle.addEventListener("pointerdown", (e) => {
    dragging = true;
    compareHandle.setPointerCapture(e.pointerId);
    setSplitFromX(e.clientX);
  });

  compareHandle.addEventListener("pointermove", (e) => {
    if (dragging) setSplitFromX(e.clientX);
  });

  compareHandle.addEventListener("pointerup", () => {
    dragging = false;
  });
}

function setupCapture() {
  const captureBtn = document.getElementById("capture");
  const downloadBtn = document.getElementById("download");

  captureBtn.addEventListener("click", () => {
    if (!renderer || !video.videoWidth || recorder?.recording) return;

    const wasCompare = compareEnabled;
    compareEnabled = false;
    compareHandle.hidden = true;
    document.getElementById("toggle-compare").textContent = "Compare";

    lastCaptureUrl = renderer.captureFrame(video);
    compareEnabled = wasCompare;
    if (compareEnabled) compareHandle.hidden = false;

    downloadBtn.disabled = false;
    captureBtn.classList.add("captured");
    setTimeout(() => captureBtn.classList.remove("captured"), 200);
  });

  downloadBtn.addEventListener("click", () => {
    if (!lastCaptureUrl) return;
    const link = document.createElement("a");
    link.href = lastCaptureUrl;
    link.download = `anime-filter-${Date.now()}.png`;
    link.click();
  });
}

function setupRecording() {
  const recordBtn = document.getElementById("toggle-record");
  const downloadVideoBtn = document.getElementById("download-video");

  if (!CanvasRecorder.isSupported()) {
    recordBtn.disabled = true;
    recordBtn.title = "Video recording not supported in this browser";
    return;
  }

  recorder.onTick = (seconds) => {
    if (recordBadge) {
      recordBadge.hidden = false;
      recordBadge.textContent = `REC ${formatTime(seconds)}`;
    }
  };

  recorder.onStop = (blob, mime) => {
    recordBadge.hidden = true;
    recordBtn.classList.remove("recording");
    recordBtn.textContent = "Record";
    viewport.classList.remove("is-recording");

    const ext = extensionForMime(mime);
    downloadVideoBtn.disabled = false;
    downloadVideoBtn.onclick = () => downloadBlob(blob, `anime-filter-${Date.now()}.${ext}`);
  };

  recordBtn.addEventListener("click", () => {
    if (!renderer || !video.videoWidth) return;

    if (recorder.recording) {
      recorder.stop();
      return;
    }

    compareEnabled = false;
    compareHandle.hidden = true;
    document.getElementById("toggle-compare").textContent = "Compare";
    document.getElementById("toggle-compare").classList.remove("active");

    const started = recorder.start(30);
    if (!started) return;

    recordBtn.classList.add("recording");
    recordBtn.textContent = "Stop";
    viewport.classList.add("is-recording");
    downloadVideoBtn.disabled = true;
  });
}

document.getElementById("flip-camera").addEventListener("click", () => {
  if (recorder?.recording) return;
  facingMode = facingMode === "user" ? "environment" : "user";
  startCamera();
});

document.getElementById("retry-camera").addEventListener("click", startCamera);

document.querySelectorAll(".preset").forEach((btn) => {
  btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
});

window.addEventListener("resize", () => {
  if (renderer) resizeViewport();
});

bindSliders();
setupCompare();
setupCapture();
applyPreset("classic");
startCamera();