# MOTION DESIGN SKILL

Motion must communicate hierarchy.

Create a motion language before implementing animations.

---

# MOTION LEVELS

LEVEL 1
Micro interaction

- button hover
- icon movement
- card hover
- cursor interaction

LEVEL 2
Component animation

- cards entering
- modals
- menus
- tabs

LEVEL 3
Section animation

- hero reveal
- text reveal
- image reveal
- parallax

LEVEL 4
Experience animation

- pinned sections
- horizontal scrolling
- cinematic transitions
- 3D scenes

---

# GSAP

Use GSAP for complex animation.

Use timelines for sequences.

Use ScrollTrigger for scroll-based interactions.

Prefer:

transform
opacity

over:

top
left
width
height

---

# SCROLL EXPERIENCE

Use scroll as an interaction mechanism.

Possible patterns:

- pinned hero
- text morph
- image reveal
- horizontal galleries
- layered transitions
- scale transitions
- depth effects

Never make the user scroll excessively just
to see an animation.

---

# MICROINTERACTIONS

Buttons should respond.

Cards may:

- translate
- rotate
- glow
- change surface
- reveal content

Keep movement subtle.

---

# REDUCED MOTION

Always support:

prefers-reduced-motion

When enabled:

- remove parallax
- reduce transitions
- disable unnecessary motion
- preserve usability