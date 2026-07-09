// compression-worker.js
// Runs in Web Worker context (no document available)
// Uses OffscreenCanvas if available, otherwise main-thread fallback is used.

self.onmessage = function (e) {
  var data = e.data;
  var file = data.file;
  var maxWidth = data.maxWidth || 1200;
  var maxHeight = data.maxHeight || 1200;
  var quality = data.quality || 0.8;

  // OffscreenCanvas support check
  if (typeof OffscreenCanvas === 'undefined') {
    // Cannot compress in worker without canvas; signal fallback
    self.postMessage({ error: 'no-offscreen' });
    return;
  }

  var img = new Image();
  img.onload = function () {
    try {
      var w = img.width;
      var h = img.height;
      var tw = w;
      var th = h;
      if (w > maxWidth || h > maxHeight) {
        var ratio = Math.min(maxWidth / w, maxHeight / h);
        tw = Math.round(w * ratio);
        th = Math.round(h * ratio);
      }
      var canvas = new OffscreenCanvas(tw, th);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, tw, th);
      canvas.convertToBlob({ type: 'image/jpeg', quality: quality }).then(function (blob) {
        var compressed = new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() });
        self.postMessage({ file: compressed });
      }).catch(function () {
        self.postMessage({ error: 'convert-failed' });
      });
    } catch (err) {
      self.postMessage({ error: 'exception' });
    }
  };
  img.onerror = function () {
    self.postMessage({ error: 'img-load-failed' });
  };
  img.src = URL.createObjectURL(file);
};