# Anime Filter

Real-time cel-shaded anime camera effect for Instagram Stories, posts, and Reels. Runs in the browser and installs as a PWA on mobile.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Overview

Anime Filter turns your webcam feed into a stylized anime look using WebGL shaders — ink outlines, flat color bands, and optional manga halftone. Capture stills or record video, then upload directly to Instagram.

> **Note:** Meta shut down [Spark AR](https://spark.meta.com/blog/meta-spark-announcement/) on January 14, 2025. Third-party AR filters can no longer be published to Instagram. This app delivers the same visual style through exported photos and videos instead.

## Features

- **8 presets** — Classic, Soft, Bold, Pastel, Manga (B&W), Cyber, Noir, Watercolor
- **Manual tuning** — outline strength, color levels, smoothing, saturation, warmth, contrast
- **Photo capture** — save PNG snapshots
- **Video recording** — record filtered output (WebM/MP4) for Reels
- **Before/after compare** — drag a split slider over the live preview
- **PWA** — install to your home screen for one-tap, full-screen access
- **No dependencies** — static HTML, CSS, and JavaScript only

## Quick start

```bash
git clone <your-repo-url>
cd anime-filter
python3 scripts/generate-icons.py   # first run only — creates PWA icons
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in Chrome, Edge, Firefox, or Safari.

### Mobile / HTTPS

Camera access on phones requires HTTPS. Options:

- [ngrok](https://ngrok.com/) — `ngrok http 8080`
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- Deploy to [Netlify](https://www.netlify.com/), [Vercel](https://vercel.com/), or [GitHub Pages](https://pages.github.com/)

## Usage

### Instagram Stories & Posts

1. Allow camera access when prompted.
2. Pick a preset or adjust sliders.
3. Tap the **shutter** button.
4. Tap **Save** to download the PNG.
5. Upload the image in Instagram.

### Instagram Reels

1. Tap **Record** to start capturing the filtered feed.
2. Tap **Stop** when finished.
3. Tap **Save video** to download the file.
4. Upload the video to Reels.

### Install as an app (PWA)

| Platform | Steps |
|----------|-------|
| **Android / Chrome** | Tap **Install app** when the prompt appears |
| **iOS Safari** | Share → **Add to Home Screen** (or tap **Install app** for in-app instructions) |

Installed copies open full-screen and cache assets offline. Camera permission is still required on each session.

## Presets

| Preset | Description |
|--------|-------------|
| **Classic** | Balanced everyday anime look |
| **Soft** | Gentle, Ghibli-inspired pastels |
| **Bold** | High-contrast shonen style |
| **Pastel** | Light, dreamy color palette |
| **Manga** | Black-and-white ink lines with halftone screentone |
| **Cyber** | Neon-saturated sci-fi tones |
| **Noir** | Desaturated, cinematic contrast |
| **Watercolor** | Soft edges with a painterly blend |

## Project structure

```
anime-filter/
├── index.html          # App shell
├── manifest.json       # PWA manifest
├── sw.js               # Service worker (offline caching)
├── LICENSE
├── README.md
├── assets/
│   ├── icon-192.png
│   └── icon-512.png
├── css/
│   └── styles.css
├── js/
│   ├── shaders.js      # GLSL vertex/fragment shaders
│   ├── anime-filter.js # WebGL renderer
│   ├── recorder.js     # Canvas video recording
│   ├── pwa.js          # Install prompt & service worker registration
│   └── main.js         # UI, camera, presets
└── scripts/
    └── generate-icons.py
```

## How it works

The effect runs entirely on the GPU via a WebGL2 fragment shader:

1. **Gaussian smoothing** — softens detail before quantization
2. **Sobel edge detection** — draws anime-style ink outlines
3. **Color posterization** — reduces tones into flat cel-shading bands
4. **HSV saturation** — boosts palette vibrancy
5. **Manga mode** — grayscale + contrast + paper tint + halftone dots

Video recording uses `canvas.captureStream()` and the `MediaRecorder` API to encode the filtered canvas output.

## Browser support

| Feature | Requirements |
|---------|----------------|
| Camera | `getUserMedia` + WebGL2 |
| Photo capture | All modern browsers |
| Video recording | Chrome, Edge, Firefox, Safari 17+ |
| PWA install | Chrome (Android/desktop), Safari (iOS 16.4+) |

## Development

No build step or package manager is required. Edit files and refresh the browser.

To regenerate PWA icons after changing the generator:

```bash
python3 scripts/generate-icons.py
```

## License

MIT License — see [LICENSE](LICENSE).

Copyright (c) 2026 David Logan