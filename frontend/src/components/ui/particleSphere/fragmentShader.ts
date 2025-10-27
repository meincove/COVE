// export default /* glsl */ `
//   precision highp float;

//   uniform float uTime;

//   void main() {
//     float alpha = 1.0;
//     float strength = distance(gl_PointCoord, vec2(0.5));
//     strength = 1.0 - strength;
//     strength = pow(strength, 6.0);

//     gl_FragColor = vec4(vec3(0.2, 0.6, 1.0) * strength, alpha * strength);
//   }
// `;


export default /* glsl */ `
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    gl_FragColor = vec4(1.0, 0.8, 0.5, alpha);
  }
`;
