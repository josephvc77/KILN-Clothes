// "Fired" reveal: garments burn in/out from the hem upward with a
// glowing ember edge. Injected into the standard PBR shader so the
// fabric keeps its physically-based lighting.

import { Color, Material } from 'three';

export interface DissolveUniforms {
  uDissolve: { value: number };
  uEdge: { value: Color };
}

export function createDissolveUniforms(): DissolveUniforms {
  return { uDissolve: { value: 0 }, uEdge: { value: new Color('#ff5a1f') } };
}

const NOISE = /* glsl */ `
varying vec3 vKPos;
uniform float uDissolve;
uniform vec3 uEdge;
float kHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float kNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(kHash(i), kHash(i + vec3(1,0,0)), f.x), mix(kHash(i + vec3(0,1,0)), kHash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(kHash(i + vec3(0,0,1)), kHash(i + vec3(1,0,1)), f.x), mix(kHash(i + vec3(0,1,1)), kHash(i + vec3(1,1,1)), f.x), f.y),
    f.z);
}
float kilnField(vec3 p) {
  float n = kNoise(p * 5.0) * 0.55 + kNoise(p * 11.0) * 0.3 + kNoise(p * 27.0) * 0.15;
  float rise = clamp((p.y + 0.75) / 1.8, 0.0, 1.0);
  return n * 0.45 + rise * 0.55;
}
`;

export function applyEmberDissolve(material: Material, uniforms: DissolveUniforms): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms['uDissolve'] = uniforms.uDissolve;
    shader.uniforms['uEdge'] = uniforms.uEdge;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vKPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvKPos = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${NOISE}`)
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float kThreshold = mix(-0.08, 1.08, uDissolve);
        float kField = kilnField(vKPos);
        if (kField < kThreshold) discard;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float kEdge = (1.0 - smoothstep(0.0, 0.055, kField - kThreshold)) * step(0.001, uDissolve) * step(uDissolve, 0.999);
        totalEmissiveRadiance += uEdge * kEdge * 5.0;
        diffuseColor.rgb *= 1.0 - kEdge * 0.85;`,
      );
  };
  material.customProgramCacheKey = () => 'kiln-ember-dissolve';
}
