declare module '*.glsl' {
  const value: string;
  export default value;
}

declare module '*.glsl?raw' {
  const content: string;
  export default content;
}

declare module 'glslify';
