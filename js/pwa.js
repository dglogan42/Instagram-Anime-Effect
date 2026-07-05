let deferredInstallPrompt = null;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

function setupInstallUI() {
  const installBtn = document.getElementById("install-app");
  const iosGuide = document.getElementById("ios-install-guide");
  const dismissIos = document.getElementById("dismiss-ios-guide");

  if (!installBtn) return;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installBtn.hidden = false;
  });

  installBtn.addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installBtn.hidden = true;
      return;
    }

    if (isIOS() && !isStandalone() && iosGuide) {
      iosGuide.hidden = false;
    }
  });

  dismissIos?.addEventListener("click", () => {
    if (iosGuide) iosGuide.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    installBtn.hidden = true;
    if (iosGuide) iosGuide.hidden = true;
  });

  if (isStandalone()) {
    installBtn.hidden = true;
  } else if (isIOS()) {
    installBtn.hidden = false;
    installBtn.textContent = "Add to Home";
  }
}

registerServiceWorker();
setupInstallUI();