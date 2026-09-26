# THREE.JS CREATIVE DEVELOPMENT SKILL

Use Three.js only when it creates meaningful visual value.

---

# POSSIBLE EXPERIENCES

Create:

- floating 3D objects
- interactive particles
- abstract sculptures
- holographic elements
- animated gradients
- liquid blobs
- glass spheres
- 3D product previews
- spatial interfaces

---

# SCENE ARCHITECTURE

Every scene should contain:

Scene
Camera
Renderer
Lights
Objects
Animation loop

---

# PERFORMANCE

Use:

- lazy initialization
- device pixel ratio limits
- object reuse
- instancing where appropriate
- low-poly geometry
- compressed textures
- disposal of resources

---

# RESPONSIVE

Adjust:

camera
resolution
particle count
effects

depending on viewport/device capability.

---

# FALLBACK

If WebGL is unavailable:

show an equivalent CSS/image experience.

Never leave an empty hero.

---

# ANGULAR

Three.js must be isolated inside dedicated Angular
components/services.

Never spread Three.js logic across unrelated components.

---

# CLEANUP

Always dispose:

geometry
materials
textures
renderer

when destroying the component.