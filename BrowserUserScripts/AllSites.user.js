// ==UserScript==
// @name        Stig's user scripts for all sites
// @namespace   Violentmonkey Scripts
// @match       *://*/*
// @grant       none
// @version     1.0.6+2024-12-30-140900
// @author      Stig Schmidt Nielsson
// @require     freezeframe.5.0.2.min.js
// @description Stig's user scripts for all sites.
// @description Features:
// @description Adds pause/play controls to animated GIFs, WebP images and videos
// ==/UserScript==

(function () {
  "use strict";

  // Styles for the pause button
  const styles = `
      .pause-overlay {
          position: absolute;
          top: 10px;
          left: 10px;
          background: rgba(0, 0, 0, 0.6);
          color: white;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          z-index: 9999;
          font-size: 12px;
          user-select: none;
      }
      .media-wrapper {
          position: relative;
          display: inline-block;
      }
  `;

  // Add styles to document
  const styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  // Track paused state for each media element
  const pausedStates = new WeakMap();

  // Create pause button for an element
  function createPauseButton(mediaElement, isVideo = false) {
    const wrapper = document.createElement("div");
    wrapper.className = "media-wrapper";

    const pauseBtn = document.createElement("div");
    pauseBtn.className = "pause-overlay";
    pauseBtn.textContent = "Pause";

    // Set initial state
    pausedStates.set(mediaElement, false);

    // Handle click events
    pauseBtn.addEventListener("click", () => {
      const isPaused = pausedStates.get(mediaElement);

      if (isVideo) {
        if (isPaused) {
          mediaElement.play();
        } else {
          mediaElement.pause();
        }
      } else {
        // For GIF/WebP, use framefreeze
        if (isPaused) {
          framefreeze.unfreeze(mediaElement);
        } else {
          framefreeze.freeze(mediaElement);
        }
      }
      pausedStates.set(mediaElement, !isPaused);
      pauseBtn.textContent = isPaused ? "Pause" : "Play";
    });

    // Insert elements into DOM
    mediaElement.parentNode.insertBefore(wrapper, mediaElement);
    wrapper.appendChild(mediaElement);
    wrapper.appendChild(pauseBtn);
  }

  // Process all media elements on the page
  function processMediaElements() {
    // Handle videos
    document.querySelectorAll("video").forEach((video) => {
      if (!video.parentNode.classList.contains("media-wrapper")) {
        createPauseButton(video, true);
      }
    });

    // Handle GIFs and animated WebPs
    document.querySelectorAll("img").forEach((img) => {
      if (!img.parentNode.classList.contains("media-wrapper")) {
        const isAnimated =
          img.src.toLowerCase().endsWith(".gif") ||
          (img.src.toLowerCase().endsWith(".webp") &&
            framefreeze.isAnimated(img));

        if (isAnimated) {
          createPauseButton(img, false);
        }
      }
    });
  }

  // Process existing media elements
  processMediaElements();

  // Watch for new media elements being added to the page
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length) {
        processMediaElements();
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
})();
