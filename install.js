/** Multi-platform install + service worker registration */
export function initInstallPrompt() {
  const root = document.getElementById("installPrompt");
  if (!root) return;
  const textEl = root.querySelector("[data-install-text]");
  const installBtn = root.querySelector("[data-install]");
  const dismissBtn = root.querySelector("[data-dismiss]");
  let deferred = null;

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (standalone || sessionStorage.getItem("pwa-dismiss") === "1") {
    root.hidden = true;
    return;
  }

  const isIos =
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(navigator.userAgent);

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    root.hidden = false;
    if (installBtn) installBtn.hidden = false;
    if (textEl)
      textEl.textContent =
        "Install this app on your device for offline use and a full-screen experience.";
  });

  window.addEventListener("appinstalled", () => {
    root.hidden = true;
    deferred = null;
  });

  if (isIos) {
    setTimeout(() => {
      if (sessionStorage.getItem("pwa-dismiss") === "1") return;
      root.hidden = false;
      if (installBtn) installBtn.hidden = true;
      if (textEl)
        textEl.innerHTML =
          "On <strong>iPhone / iPad</strong>: Share → <em>Add to Home Screen</em>.";
    }, 1800);
  } else if (isAndroid) {
    setTimeout(() => {
      if (deferred || sessionStorage.getItem("pwa-dismiss") === "1") return;
      root.hidden = false;
      if (installBtn) installBtn.hidden = true;
      if (textEl)
        textEl.textContent = "On Android Chrome: menu ⋮ → Install app / Add to Home screen.";
    }, 2200);
  } else {
    setTimeout(() => {
      if (deferred || sessionStorage.getItem("pwa-dismiss") === "1") return;
      root.hidden = false;
      if (installBtn) installBtn.hidden = true;
      if (textEl)
        textEl.textContent =
          "On Windows, Mac, or Linux: Chrome/Edge → install icon or Install app.";
    }, 3500);
  }

  installBtn?.addEventListener("click", async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch (_) {}
    deferred = null;
    root.hidden = true;
  });

  dismissBtn?.addEventListener("click", () => {
    sessionStorage.setItem("pwa-dismiss", "1");
    root.hidden = true;
  });
}

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!/^https?:$/i.test(location.protocol)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.warn("SW failed", err));
  });
}

// Auto-init when loaded as classic or module
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      registerServiceWorker();
      initInstallPrompt();
    });
  } else {
    registerServiceWorker();
    initInstallPrompt();
  }
}
