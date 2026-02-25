## Packages
framer-motion | Page transitions and sleek interactive animations
date-fns | Formatting capture timestamps nicely

## Notes
- Camera capture is simulated using navigator.mediaDevices.getUserMedia if available.
- If no camera is available, a static placeholder UI is shown.
- Uploads are simulated by passing mock URLs to the backend.
- The dual-preview is achieved visually by rendering the same stream in two containers with different aspect ratios and object-fit: cover.
