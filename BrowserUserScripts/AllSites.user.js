// ==UserScript==
// @name        Stig's user scripts for all sites
// @namespace   Violentmonkey Scripts
// @match       *://*/*
// @grant       none
// @version     1.0.2+2024-12-30-140900
// @author      Stig Schmidt Nielsson
// @description Stig's user scripts for all sites.
// @description Features:
// @description UI controls add to animated gifs and webp to control playback.
// ==/UserScript==

(function () {
  "use strict";

  const log = (message, level = 'info', data = null) => {
    const timestamp = new Date().toISOString();
    const prefix = `[AllSites ${timestamp}]`;
    
    switch (level.toLowerCase()) {
      case 'error':
        console.error(prefix, message, data || '');
        break;
      case 'warn':
        console.warn(prefix, message, data || '');
        break;
      case 'debug':
        console.debug(prefix, message, data || '');
        break;
      default:
        console.info(prefix, message, data || '');
    }
  };

  const MIN_SIZE = 50;
  
  const isAnimatedImage = async (url) => {
    try {
      log('Checking if image is animated', 'debug', url);
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const view = new Uint8Array(buffer);
      
      if (url.toLowerCase().endsWith('.gif')) {
        // Check for GIF87a or GIF89a header
        if (view[0] !== 0x47 || view[1] !== 0x49 || view[2] !== 0x46) {
          log('Not a GIF file', 'debug', url);
          return false;
        }
        
        // Look for animation blocks
        for (let i = 0; i < view.length - 3; i++) {
          if (view[i] === 0x21 && view[i + 1] === 0xf9 && view[i + 2] === 0x04) {
            log('Animated GIF detected', 'debug', url);
            return true;
          }
        }
      } else if (url.toLowerCase().endsWith('.webp')) {
        // Check for WEBP header
        const webpHeader = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
        if (!webpHeader.every((byte, i) => view[i + 8] === byte)) {
          log('Not a WebP file', 'debug', url);
          return false;
        }
        
        // Check for animation chunk
        const animated = view.slice(0, view.length - 8).findIndex((byte, i, arr) => {
          return byte === 0x41 && // 'A'
                 arr[i + 1] === 0x4E && // 'N'
                 arr[i + 2] === 0x49 && // 'I'
                 arr[i + 3] === 0x4D; // 'M'
        }) !== -1;
        
        log(animated ? 'Animated WebP detected' : 'Static WebP detected', 'debug', url);
        return animated;
      }
      
      return false;
    } catch (error) {
      log('Error checking image animation', 'error', { url, error: error.message });
      return false;
    }
  };

  const addControls = (element) => {
    // Skip if controls already added
    if (element.parentNode?.classList?.contains('media-controls-wrapper')) {
      return;
    }

    log('Adding controls to element', 'debug', {
      type: element.nodeName,
      src: element.src,
      dimensions: `${element.width}x${element.height}`
    });

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
          display: none;
      `;

    const playPause = document.createElement("button");
    playPause.textContent = "⏸️";
    playPause.onclick = () => {
      if (element.paused) {
        element.play();
        playPause.textContent = "⏸️";
        log('Media playback resumed', 'debug', { src: element.src });
      } else {
        element.pause();
        playPause.textContent = "▶️";
        log('Media playback paused', 'debug', { src: element.src });
      }
    };

    controls.appendChild(playPause);
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);
    wrapper.appendChild(controls);

    wrapper.addEventListener("mouseenter", () => (controls.style.display = "block"));
    wrapper.addEventListener("mouseleave", () => (controls.style.display = "none"));

    log('Controls added successfully', 'info', {
      type: element.nodeName,
      src: element.src
    });
  };

  const handleMedia = async (element) => {
    const startTime = performance.now();
    log('Processing media element', 'debug', {
      type: element.nodeName,
      src: element.src,
      dimensions: `${element.width}x${element.height}`
    });

    try {
      if (
        element.nodeName === "IMG" &&
        (element.src.toLowerCase().endsWith(".gif") || element.src.toLowerCase().endsWith(".webp"))
      ) {
        if (
          (await isAnimatedImage(element.src)) &&
          element.width >= MIN_SIZE &&
          element.height >= MIN_SIZE
        ) {
          addControls(element);
        }
      } else if (
        element.nodeName === "VIDEO" &&
        !element.hasAttribute("controls") &&
        element.videoWidth >= MIN_SIZE &&
        element.videoHeight >= MIN_SIZE
      ) {
        addControls(element);
      }

      const processingTime = performance.now() - startTime;
      log('Media processing completed', 'debug', {
        type: element.nodeName,
        src: element.src,
        processingTime: `${processingTime.toFixed(2)}ms`
      });
    } catch (error) {
      log('Error processing media element', 'error', {
        type: element.nodeName,
        src: element.src,
        error: error.message
      });
    }
  };

  const observeDocument = () => {
    log('Starting document observation', 'info');
    const startTime = performance.now();

    document.querySelectorAll('img[src$=".gif"], img[src$=".webp"], video').forEach(handleMedia);
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (
            (node.nodeName === "IMG" && (node.src?.endsWith(".gif") || node.src?.endsWith(".webp"))) ||
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
    log('Document observation initialized', 'info', {
      setupTime: `${initTime.toFixed(2)}ms`
    });
  };

  if (document.readyState === "loading") {
    log('Document loading, waiting for DOMContentLoaded', 'info');
    document.addEventListener("DOMContentLoaded", observeDocument);
  } else {
    log('Document already loaded, starting immediately', 'info');
    observeDocument();
  }
})();