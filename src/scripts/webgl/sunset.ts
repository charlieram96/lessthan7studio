/**
 * A slow, domain-warped sunset glow behind the hero mark. Raw WebGL, no dependencies.
 * Renders at reduced resolution (it's soft by nature) and sleeps when off-screen.
 */
const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform vec2 uAnchor;
uniform float uFade;

vec3 permute(vec3 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float fbm(vec2 p){
  float f = 0.0; float a = 0.5;
  for (int i = 0; i < 4; i++) { f += a * snoise(p); p *= 2.03; a *= 0.5; }
  return f;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.035;
  vec2 q = vec2(fbm(p * 1.1 + vec2(0.0, t)), fbm(p * 1.1 + vec2(5.2, -t)));
  vec2 r = vec2(fbm(p * 1.5 + 2.0 * q + vec2(1.7, 9.2) + t * 0.7), fbm(p * 1.5 + 2.0 * q + vec2(8.3, 2.8) - t * 0.6));
  float n = fbm(p * 1.3 + 2.4 * r);

  vec2 anchor = uAnchor + uPointer * vec2(0.08, -0.06);
  float d = length((p - anchor) * vec2(0.95, 1.2));
  float glow = smoothstep(1.05, 0.0, d);
  float field = clamp(glow * (0.5 + 0.7 * n) + glow * glow * 0.25, 0.0, 1.0);

  vec3 ink = vec3(0.051, 0.043, 0.078);
  vec3 c1 = vec3(1.0, 0.54, 0.118);
  vec3 c2 = vec3(1.0, 0.29, 0.227);
  vec3 c3 = vec3(0.941, 0.172, 0.431);
  vec3 c4 = vec3(0.784, 0.137, 0.561);
  vec3 c5 = vec3(0.30, 0.10, 0.50);
  float h = clamp(0.45 + 0.55 * n - (p.y - anchor.y) * 0.55 + (p.x - anchor.x) * 0.25, 0.0, 1.0);
  vec3 sun = mix(c1, c2, smoothstep(0.0, 0.3, h));
  sun = mix(sun, c3, smoothstep(0.3, 0.58, h));
  sun = mix(sun, c4, smoothstep(0.58, 0.82, h));
  sun = mix(sun, c5, smoothstep(0.82, 1.0, h));

  vec3 col = mix(ink, sun, field * 0.62 * uFade);
  col *= 1.0 - 0.32 * length(uv - vec2(0.55, 0.5));
  col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

export interface Sunset {
  setPointer(x: number, y: number): void;
  setActive(on: boolean): void;
}

export function startSunset(canvas: HTMLCanvasElement, opts: { still?: boolean } = {}): Sunset | null {
  const gl = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, 'uRes');
  const uTime = gl.getUniformLocation(prog, 'uTime');
  const uPointer = gl.getUniformLocation(prog, 'uPointer');
  const uAnchor = gl.getUniformLocation(prog, 'uAnchor');
  const uFade = gl.getUniformLocation(prog, 'uFade');

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  let fade = 0;
  let visible = true;
  let active = true;
  let raf = 0;
  const start = performance.now();

  const resize = () => {
    const scale = Math.min(window.devicePixelRatio, 1) * 0.5;
    const w = Math.max(2, Math.round(canvas.clientWidth * scale));
    const h = Math.max(2, Math.round(canvas.clientHeight * scale));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    const narrow = window.innerWidth <= 900;
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    // Matches the mark's CSS position (71% / 47% desktop, 76% / 30% mobile), in shader space.
    const ax = ((narrow ? 0.76 : 0.71) - 0.5) * aspect;
    const ay = 0.5 - (narrow ? 0.3 : 0.47);
    gl.uniform2f(uAnchor, ax, ay);
    gl.uniform2f(uRes, w, h);
  };

  const frame = (now: number) => {
    raf = 0;
    if (!visible || !active) return;
    pointer.x += (pointer.tx - pointer.x) * 0.04;
    pointer.y += (pointer.ty - pointer.y) * 0.04;
    fade = Math.min(1, fade + 0.012);
    gl.uniform1f(uTime, (now - start) / 1000);
    gl.uniform2f(uPointer, pointer.x, pointer.y);
    gl.uniform1f(uFade, opts.still ? 1 : fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!opts.still) raf = requestAnimationFrame(frame);
  };

  const kick = () => {
    if (!raf && visible && active) raf = requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener('resize', () => {
    resize();
    if (opts.still) kick();
  });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    kick();
  }).observe(canvas);

  document.addEventListener('visibilitychange', () => {
    visible = document.visibilityState === 'visible';
    kick();
  });

  canvas.classList.add('is-ready');
  kick();

  return {
    setPointer(x: number, y: number) {
      pointer.tx = x;
      pointer.ty = y;
    },
    setActive(on: boolean) {
      if (on === active) return;
      active = on;
      kick();
    },
  };
}
