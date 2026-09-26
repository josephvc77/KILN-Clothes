# PERFORMANCE SKILL

Premium visuals must remain performant.

Prioritize:

60 FPS interactions where practical.

Use GPU-friendly properties:

transform
opacity

Avoid continuous animation of:

width
height
top
left
margin
box-shadow
filter

Limit:

particle count
WebGL resolution
texture size
DOM complexity

Lazy load:

Three.js
3D models
large images
videos

Use IntersectionObserver when appropriate.

Disable expensive effects when:

prefers-reduced-motion

or device capability indicates
the effect would harm usability.