



"use client";

import { useEffect, useRef } from "react";
import { Renderer, Program, Mesh, Color, Triangle } from "ogl";

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  speed?: number;
  /** 0 = top, 1 = bottom (controls vertical position of the blob) */
  centerY?: number;
  /** 1 = default size, >1 = bigger blob */
  scale?: number;
}

const VERTEX_SHADER = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float uCenterY;
uniform float uScale;
uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform vec2 uMouse;   // kept but not used now (no parallax)

out vec4 fragColor;

vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x,289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(
    0.211324865405187,
    0.366025403784439,
   -0.577350269189626,
    0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  i = mod(i, 289.0);
  vec3 p = permute(
              permute(i.y + vec3(0.0, i1.y, 1.0))
            + i.x + vec3(0.0, i1.x, 1.0)
          );

  vec3 m = max(
    0.5 - vec3(
      dot(x0,x0),
      dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)
    ), 0.0
  );
  m = m*m;
  m = m*m;

  vec3 x = 2.0*fract(p*C.www)-1.0;
  vec3 h = abs(x)-0.5;
  vec3 ox = floor(x+0.5);
  vec3 a0 = x-ox;

  m *= 1.79284291400159 - 0.85373472095314*(a0*a0+h*h);

  vec3 g;
  g.x  = a0.x * x0.x    + h.x  * x0.y;
  g.yz = a0.yz*x12.xz + h.yz*x12.yw;

  return 130.0 * dot(m, g);
}

struct ColorStop { vec3 color; float position; };
#define COLOR_RAMP(colors,factor,finalColor){ \
  int index = 0; \
  for (int i = 0; i < 2; i++) { \
    ColorStop currentColor = colors[i]; \
    bool inBetween = currentColor.position <= factor; \
    index = int(mix(float(index), float(i), float(inBetween))); \
  } \
  ColorStop currentColor = colors[index]; \
  ColorStop nextColor    = colors[index+1]; \
  float range      = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;

  // ---- base gradient along X (for multi-color look) ----
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);

  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);

  // ---- position the "smoke blob" ----
  // centerX fixed in the middle, vertical position controlled via uCenterY
  vec2 center = vec2(0.5, uCenterY);

  // base half-extents (≈40% width, 30% height) scaled up/down
  vec2 stretch = vec2(0.2, 0.15) * uScale;

  // normalised shape space (ellipse)
  vec2 q = (uv - center) / stretch;

  float t = uTime * 0.12;

  // large-scale flow noise to bend / wobble the blob
  float flow1 = snoise(vec2(q.x * 1.4 + t,     q.y * 0.8 - t * 0.7));
  float flow2 = snoise(vec2(q.x * 3.2 - t*1.3, q.y * 2.1 + t * 0.9));

  float flow = flow1 * 0.7 + flow2 * 0.3;

  // distort the shape by noise so edges feel "flame-like"
  vec2 warped = q + vec2(flow * 0.35 * uAmplitude, flow * 0.55 * uAmplitude);

  float dist = length(warped);

  // radius=1.0 in this space; softness controls feather
  float radius   = 1.0;
  float softness = 0.45;

  float mask = smoothstep(radius + softness, radius - softness, dist);

  // internal turbulence so interior isn't flat
  float innerN = snoise(uv * vec2(6.0, 4.0) + vec2(t * 1.3, -t * 0.8));
  float inner  = 0.5 + 0.5 * innerN;
  mask *= mix(0.7, 1.25, inner);

  mask = clamp(mask, 0.0, 1.0);

  // alpha & brightness – a bit brighter in the hot core
  float alpha = pow(mask, 1.5) * uBlend;
  vec3 color  = rampColor * (0.4 + 0.6 * mask);

  fragColor = vec4(color, alpha);
}
`;

export default function AuroraShader({
  colorStops = ["#5227FF", "#7cff67", "#5227FF"],
  amplitude = 1.0,
  blend = 0.5,
  speed = 1.0,
  centerY = 0.2,  // closer to top so it feels like it's coming from above
  scale = 1.5,    // 1.5x the previous size
}: AuroraProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new Renderer({ alpha: true, antialias: true });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    // normal “layer over white” blending
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const geometry = new Triangle(gl);
    if (geometry.attributes.uv) delete geometry.attributes.uv;

    const program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms: {
        uTime:       { value: 0 },
        uAmplitude:  { value: amplitude },
        uBlend:      { value: blend },
        uResolution: { value: [container.offsetWidth, container.offsetHeight] },
        uCenterY:    { value: centerY },
        uScale:      { value: scale },
        uColorStops: {
          value: colorStops.map((hex) => {
            const c = new Color(hex);
            return [c.r, c.g, c.b];
          }),
        },
        uMouse: { value: [0, 0] },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    container.appendChild(gl.canvas);

    const resize = () => {
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [width, height];
    };
    window.addEventListener("resize", resize);
    resize();

    let animationId: number;

    const animate = (t: number) => {
      animationId = requestAnimationFrame(animate);

      program.uniforms.uTime.value = t * 0.001 * speed;
      program.uniforms.uAmplitude.value = amplitude;
      program.uniforms.uBlend.value = blend;
      program.uniforms.uCenterY.value = centerY;
      program.uniforms.uScale.value = scale;

      renderer.render({ scene: mesh });
    };
    animate(0);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_CONTEXT")?.loseContext();
    };
  }, [amplitude, blend, colorStops, speed, centerY, scale]);

  // This sits behind the hero; the <section> should be `relative`
  return (
    <div
      ref={containerRef}
      className="absolute inset-0 -z-10 pointer-events-none"
    />
  );
}
