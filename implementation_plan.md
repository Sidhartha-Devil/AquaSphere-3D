# Convert Ocean Particles to Flowing Streaks

We will update the particle system to use flowing streak trails instead of dots, closely matching the aesthetic of earth.nullschool.net.

## User Review Required

Please review the proposed changes. The new particle system will use `THREE.LineSegments` to draw trails with a fade-out effect instead of individual dots. It will maintain a short history of positions for each particle to create the flowing streak effect. 

## Open Questions

None at this moment.

## Proposed Changes

### [MODIFY] src/components/DataDrivenCurrents.jsx

- **Geometry Change**: Switch from `THREE.BufferGeometry` configured for `THREE.Points` to one configured for `THREE.LineSegments`.
- **Trail History**: Add an array of historical `(lat, lon)` positions to each particle.
- **Vertex Management**: For each particle (5,000 count), manage a set of line segments connecting the historical points. A trail length of around 8-10 will provide a good streak effect.
- **Fading Effect**: Use `vertexColors` and `THREE.AdditiveBlending`. The head of the trail will be fully colored (based on velocity), and the older historical points will fade to black. With additive blending, black renders as completely transparent, creating a perfect fade-out effect.
- **Performance**: We will use a flat array structure for positions and colors to ensure the geometry updates remain very fast (O(1) memory allocation per frame).

## Verification Plan

- After making the changes, we will check if the visual output renders lines instead of dots.
- We'll ensure the lines follow the current fields properly and have a visible gradient (bright head fading to black tail).
- We'll confirm the globe can still morph between 3D and 2D mode without breaking the trails.
