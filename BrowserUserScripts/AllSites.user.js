// ==UserScript==
// @name        Stig's user scripts for all sites
// @namespace   Violentmonkey Scripts
// @match       *://*/*
// @grant       none
// @version     1.0.6+2024-12-30-140900
// @author      Stig Schmidt Nielsson
// @require     https://raw.githubusercontent.com/snielsson/public/BrowserUserScripts/freezeframe.5.0.2.min.js
// @description Stig's user scripts for all sites.
// @description Features:
// @description UI controls add to pause gifs and webp. Uses FreezeFrame 5.0.2.
// ==/UserScript==

(function() {
  "use strict";
  
  const log = (message, level = 'info', data = null) => {
    const timestamp = new Date().toISOString();
    const prefix = `[AllSites ${timestamp}]`;
    switch (level.toLowerCase()) {
      case 'error': console.error(prefix, message, data || ''); break;
      case 'warn': console.warn(prefix, message, data || ''); break;
      case 'debug': console.debug(prefix, message, data || ''); break;
      default: console.info(prefix, message, data || '');
    }
  };

  const handleMedia = (element) => {
    try {
      if (!element.classList.contains('freezeframe-processed')) {
        log('Processing media element', 'debug', {
          type: element.nodeName,
          src: element.src
        });

        element.classList.add('freezeframe-processed');
        new Freezeframe(element, {
          trigger: 'click',
          overlay: true
        });

        log('Added Freezeframe controls', 'info', {
          type: element.nodeName,
          src: element.src
        });
      }
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

    document.querySelectorAll('img[src$=".gif"], img[src$=".webp"]').forEach(handleMedia);
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === "IMG" && 
              (node.src?.endsWith(".gif") || node.src?.endsWith(".webp"))) {
            handleMedia(node);
          }
          if (node.querySelectorAll) {
            node.querySelectorAll('img[src$=".gif"], img[src$=".webp"]')
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
    document.addEventListener("DOMContentLoaded", observeDocument);
  } else {
    observeDocument();
  }
})();
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