# 45. Animation Guidelines

## Framer Motion Over MP4
We chose `framer-motion` + SVG over GIF/MP4 because:
1. **Crispness**: SVGs scale infinitely and remain razor sharp on high-DPI displays.
2. **Dynamic Colors**: We can dynamically animate the `stroke` and `fill` of the SVG based on the `EmotionEngine` without loading multiple video files.
3. **File Size**: Negligible compared to binary assets.

## Anti-Patterns
- **Do not use spring physics for ambient states**: Springs are great for clicks, but terrible for infinite loops. Use `ease: "easeInOut"` for breathing.
- **Do not cause reflows**: Animate `transform` (scale, rotate, x, y) and `opacity`. Never animate `width`, `height`, or `margin` in the presence loops to avoid layout thrashing.
