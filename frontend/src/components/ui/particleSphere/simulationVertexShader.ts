// export default /* glsl */ `
//   precision highp float;

//   attribute vec2 position;
//   varying vec2 vUv;

//   void main() {
//     vUv = position * 0.5 + 0.5;
//     gl_Position = vec4(position, 0.0, 1.0);
//   }
// `;


export default /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  void main() {
    // position is a vec3 injected by R3F, we take x/y for 2D plane
    vUv = position.xy * 0.5 + 0.5; // map from [-1,1] to [0,1]
    gl_Position = vec4(position, 1.0); // keep plane unchanged
  }
`;
