class CanvasRecorder {
  constructor(canvas) {
    this.canvas = canvas;
    this.mediaRecorder = null;
    this.chunks = [];
    this.stream = null;
    this.startTime = 0;
    this.timerId = null;
    this.onTick = null;
    this.onStop = null;
  }

  static isSupported() {
    return (
      typeof HTMLCanvasElement !== "undefined" &&
      "captureStream" in HTMLCanvasElement.prototype &&
      typeof MediaRecorder !== "undefined"
    );
  }

  _pickMimeType() {
    const types = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];
    return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  start(fps = 30) {
    if (this.mediaRecorder?.state === "recording") return false;
    if (!CanvasRecorder.isSupported()) return false;

    this.chunks = [];
    this.stream = this.canvas.captureStream(fps);
    const mimeType = this._pickMimeType();
    const options = mimeType ? { mimeType, videoBitsPerSecond: 4_000_000 } : undefined;

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, options);
    } catch {
      this.mediaRecorder = new MediaRecorder(this.stream);
    }

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };

    this.mediaRecorder.onstop = () => {
      const type = this.mediaRecorder.mimeType || "video/webm";
      const blob = new Blob(this.chunks, { type });
      if (this.onStop) this.onStop(blob, type);
      this.chunks = [];
    };

    this.mediaRecorder.start(200);
    this.startTime = Date.now();
    this.timerId = window.setInterval(() => {
      if (this.onTick) {
        this.onTick(Math.floor((Date.now() - this.startTime) / 1000));
      }
    }, 250);

    return true;
  }

  stop() {
    if (!this.mediaRecorder || this.mediaRecorder.state !== "recording") return;

    window.clearInterval(this.timerId);
    this.timerId = null;
    this.mediaRecorder.stop();
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  get recording() {
    return this.mediaRecorder?.state === "recording";
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function extensionForMime(mime) {
  if (mime.includes("mp4")) return "mp4";
  return "webm";
}