// export default /* glsl */ `
// precision highp float;

// varying vec2 vUv;

// uniform sampler2D uPositions;
// uniform float uTime;

// vec3 curl(vec3 p) {
//   float x = sin(p.y * 5.0 + uTime) * 0.01;
//   float y = cos(p.z * 5.0 + uTime) * 0.01;
//   float z = sin(p.x * 5.0 + uTime) * 0.01;
//   return vec3(x, y, z);
// }

// void main() {
//   vec3 pos = texture2D(uPositions, vUv).xyz;

//   vec3 velocity = curl(pos);
//   pos += 0.02 * velocity; // adjust motion strength

//   pos = clamp(pos, vec3(-1.0), vec3(1.0));

//   gl_FragColor = vec4(pos, 1.0);
// }
// `;

export default /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform sampler2D uPositions;
  uniform float uTime;

  // Simple fake curl-like motion
  vec3 curl(vec3 p) {
    float x = sin(p.y * 10.0 + uTime) * 0.01;
    float y = cos(p.z * 10.0 + uTime) * 0.01;
    float z = sin(p.x * 10.0 + uTime) * 0.01;
    return vec3(x, y, z);
  }

  void main() {
    vec3 pos = texture2D(uPositions, vUv).xyz;
    vec3 velocity = curl(pos);
    pos += velocity;

    // optional: prevent going out of view
    pos = clamp(pos, vec3(-1.0), vec3(1.0));

    gl_FragColor = vec4(pos, 1.0);
  }
`;

