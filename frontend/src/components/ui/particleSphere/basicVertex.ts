export default /* glsl */ `
  precision highp float;

//   attribute vec2 uv;
  varying vec2 vUv;

  uniform sampler2D uPositions;

  void main() {
    vUv = uv;
    vec3 pos = texture2D(uPositions, vUv).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 3.0;
  }
`;
