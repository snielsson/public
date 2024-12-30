// ==UserScript==
// @name        Stig's user scripts for all sites
// @namespace   Violentmonkey Scripts
// @match       *://*/*
// @grant       none
// @version     1.0.5+2024-12-30
// @author      Stig Schmidt Nielsson
// @description Stig's user scripts for all sites.
// @description Features:
// @description UI controls add to animated gifs and webp to control playback.
// ==/UserScript==

(function () {
  "use strict";

  const log = (message, level = "info", data = null) => {
    const timestamp = new Date().toISOString();
    const prefix = `[AllSites ${timestamp}]`;

    switch (level.toLowerCase()) {
      case "error":
        console.error(prefix, message, data || "");
        break;
      case "warn":
        console.warn(prefix, message, data || "");
        break;
      case "debug":
        console.debug(prefix, message, data || "");
        break;
      default:
        console.info(prefix, message, data || "");
    }
  };

  const MIN_SIZE = 50;

  const isAnimatedImage = async (element) => {
    try {
      const absoluteUrl = new URL(element.src, window.location.origin).href;
      log("Checking if image is animated", "debug", absoluteUrl);
      const response = await fetch(absoluteUrl);
      const buffer = await response.arrayBuffer();
      const view = new Uint8Array(buffer);

      if (absoluteUrl.toLowerCase().endsWith(".gif")) {
        if (view[0] !== 0x47 || view[1] !== 0x49 || view[2] !== 0x46) {
          return false;
        }
        for (let i = 0; i < view.length - 3; i++) {
          if (
            view[i] === 0x21 &&
            view[i + 1] === 0xf9 &&
            view[i + 2] === 0x04
          ) {
            return true;
          }
        }
      } else if (absoluteUrl.toLowerCase().endsWith(".webp")) {
        const webpHeader = [0x57, 0x45, 0x42, 0x50];
        if (!webpHeader.every((byte, i) => view[i + 8] === byte)) {
          return false;
        }
        return (
          view.slice(0, view.length - 8).findIndex((byte, i, arr) => {
            return (
              byte === 0x41 &&
              arr[i + 1] === 0x4e &&
              arr[i + 2] === 0x49 &&
              arr[i + 3] === 0x4d
            );
          }) !== -1
        );
      }
      return false;
    } catch (error) {
      log("Error checking image animation", "error", {
        url: element.src,
        error: error.message,
      });
      return false;
    }
  };

  const handleMedia = async (element) => {
    const checkSize = () => {
      return element.width >= MIN_SIZE && element.height >= MIN_SIZE;
    };

    try {
      if (
        element.nodeName === "IMG" &&
        (element.src.toLowerCase().endsWith(".gif") ||
          element.src.toLowerCase().endsWith(".webp"))
      ) {
        if (!element.complete) {
          await new Promise((resolve) => (element.onload = resolve));
        }

        if (checkSize() && (await isAnimatedImage(element))) {
          addControls(element);
        }
      } else if (
        element.nodeName === "VIDEO" &&
        !element.hasAttribute("controls")
      ) {
        if (!element.videoWidth) {
          await new Promise((resolve) => (element.onloadedmetadata = resolve));
        }
        if (element.videoWidth >= MIN_SIZE && element.videoHeight >= MIN_SIZE) {
          addControls(element);
        }
      }
    } catch (error) {
      log("Error processing media element", "error", {
        type: element.nodeName,
        src: element.src,
        error: error.message,
      });
    }
  };

  const addControls = (element) => {
    if (element.parentNode?.classList?.contains('media-controls-wrapper')) return;

    const wrapper = document.createElement("div");
    wrapper.classList.add('media-controls-wrapper');
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";

    const controls = document.createElement("div");
    controls.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0,0,0,0.5);
        padding: 5px;
        display: block;
        z-index: 1000;
    `;

    const playPause = document.createElement("button");
    playPause.textContent = "⏸️";
    playPause.style.cssText = "cursor: pointer; border: none; background: none; color: white;";
    
    let isPaused = false;
    
    const handlePause = {
        'gif': (el) => {
            el.style.animationPlayState = isPaused ? 'paused' : 'running';
        },
        'webp': (el) => {
            const clone = el.cloneNode(true);
            clone.style.cssText = isPaused ? 
                '-webkit-animation: none !important; animation: none !important;' : '';
            el.parentNode.replaceChild(clone, el);
            return clone;
        },
        'video': (el) => {
            isPaused ? el.pause() : el.play();
        }
    };

    playPause.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        isPaused = !isPaused;
        log('Play/Pause clicked', 'debug', { 
            isPaused, 
            type: element.tagName,
            src: element.src 
        });

        if (element.tagName === "VIDEO") {
            handlePause.video(element);
        } else if (element.src.toLowerCase().endsWith('.gif')) {
            handlePause.gif(element);
        } else if (element.src.toLowerCase().endsWith('.webp')) {
            element = handlePause.webp(element);
        }
        
        playPause.textContent = isPaused ? "▶️" : "⏸️";
    };

    controls.appendChild(playPause);
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    wrapper.appendChild(controls);
};  const observeDocument = () => {
    log("Starting document observation", "info");
    const startTime = performance.now();

    document
      .querySelectorAll('img[src$=".gif"], img[src$=".webp"], video')
      .forEach(handleMedia);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (
            (node.nodeName === "IMG" &&
              (node.src?.endsWith(".gif") || node.src?.endsWith(".webp"))) ||
            node.nodeName === "VIDEO"
          ) {
            handleMedia(node);
          }
          if (node.querySelectorAll) {
            node
              .querySelectorAll('img[src$=".gif"], img[src$=".webp"], video')
              .forEach(handleMedia);
          }
        });
      });
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    const initTime = performance.now() - startTime;
    log("Document observation initialized", "info", {
      setupTime: `${initTime.toFixed(2)}ms`,
    });
  };

  if (document.readyState === "loading") {
    log("Document loading, waiting for DOMContentLoaded", "info");
    document.addEventListener("DOMContentLoaded", observeDocument);
  } else {
    log("Document already loaded, starting immediately", "info");
    observeDocument();
  }
})();
