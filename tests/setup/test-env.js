import { vi } from 'vitest';

// Capture DOMContentLoaded listeners so tests can choose when to trigger app bootstrapping
const domContentLoadedListeners = [];
const originalAddEventListener = document.addEventListener.bind(document);

document.addEventListener = function addEventListenerPatched(type, listener, options) {
  if (type === 'DOMContentLoaded') {
    domContentLoadedListeners.push(listener);
    return;
  }
  return originalAddEventListener(type, listener, options);
};

globalThis.__triggerDOMContentLoaded = () => {
  domContentLoadedListeners.forEach(listener => {
    try {
      listener();
    } catch (error) {
      // Re-throw asynchronously so a single listener failure does not block others
      setTimeout(() => {
        throw error;
      });
    }
  });
};

// Provide lightweight canvas and Chart stubs for modules that expect them
if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn()
    })),
    getImageData: vi.fn(),
    putImageData: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    setTransform: vi.fn(),
    resetTransform: vi.fn()
  }));
}

if (!globalThis.Chart) {
  globalThis.Chart = class {
    constructor() {
      this.destroy = vi.fn();
      this.update = vi.fn();
    }
  };
}

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
}

if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
}
