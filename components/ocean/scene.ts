/** A single-pass, texture-free ocean. No render targets, engine, or network assets. */
const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const fragmentSource = `
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_dive;
uniform float u_night;
uniform float u_detail;
uniform float u_motion;

const vec3 SUN = vec3(0.58, 0.24, -0.78);

// Four directional swells. Smaller harmonics add ripples only to the normal,
// so the surface intersection stays cheap, especially near the horizon.
vec3 swell(vec2 p, float t) {
  vec4 phase = vec4(
    dot(p, vec2(0.79, 0.61)) * 0.57 + t * 0.72,
    dot(p, vec2(-0.36, 0.93)) * 0.91 - t * 0.89,
    dot(p, vec2(0.94, -0.34)) * 1.73 + t * 1.21,
    dot(p, vec2(-0.71, -0.70)) * 2.61 - t * 1.54
  );
  vec4 a = vec4(0.30, 0.16, 0.075, 0.035);
  vec4 s = sin(phase);
  vec4 c = cos(phase) * a;
  // A second harmonic makes crests sharper and troughs wider.
  float height = dot(a, s + 0.19 * sin(phase * 2.0));
  c += a * 0.38 * cos(phase * 2.0);
  return vec3(height,
    dot(c, vec4(0.4503, -0.3276, 1.6262, -1.8531)),
    dot(c, vec4(0.3477, 0.8463, -0.5882, -1.827)));
}

vec3 waterNormal(vec2 p, float t, float distanceToCamera) {
  vec3 w = swell(p, t);
  float fade = exp(-distanceToCamera * 0.012);
  // Crossed capillary waves, with phase modulation to avoid a repeating grid.
  float a = dot(p, vec2(4.2, 3.1)) - t * 2.0;
  float b = dot(p, vec2(-6.1, 4.8)) + t * 2.6;
  float c = dot(p, vec2(10.4, 7.7)) - t * 3.1 + sin(a) * 0.8;
  vec2 ripple = vec2(4.2, 3.1) * cos(a + sin(b) * 0.4) * 0.026;
  ripple += vec2(-6.1, 4.8) * cos(b) * 0.015;
  ripple += vec2(10.4, 7.7) * cos(c) * 0.006 * u_detail;
  return normalize(vec3(-(w.yz + ripple * fade), 1.0).xzy);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + 1.0), f.x), f.y);
}

// Beads stay attached to the screen plane. Their curved faces bend the view,
// while a narrow highlight and shadow reveal the glass rather than painting dots.
vec4 glassBeads(vec2 p, float age, float seed, float scale, float threshold) {
  vec2 grid = p * scale;
  float column = floor(grid.x);
  float fall = max(age - 2.4, 0.0);
  grid.y += fall * (0.12 + hash(vec2(column, seed)) * 0.22);
  vec2 cell = floor(grid);
  vec2 local = fract(grid);
  float random = hash(cell + seed);
  float active = smoothstep(threshold, threshold + 0.08, random);
  vec2 center = vec2(0.25 + 0.5 * hash(cell + seed + 2.1),
    0.28 + 0.24 * hash(cell + seed + 5.7));
  float radius = 0.11 + 0.085 * hash(cell + seed + 9.2);
  vec2 delta = local - center;
  vec2 q = delta / vec2(radius, radius * 1.16);
  float r2 = dot(q, q);
  float body = 1.0 - smoothstep(0.78, 1.0, r2);
  float rimWidth = max(1.0 / 21.0, scale / (radius * u_resolution.y) * 1.2);
  float rim = exp(-abs(r2 - 0.83) / rimWidth);
  vec2 direction = q / max(length(q), 0.001);
  float light = dot(direction, normalize(vec2(-0.55, 0.83)));
  float glint = rim * (max(light, 0.0) * 0.85 - max(-light, 0.0) * 0.42);
  glint += exp(-dot(q - vec2(-0.30, 0.40), q - vec2(-0.30, 0.40)) * 95.0) * body * 0.38;
  // A thin draining trail remains above each falling bead.
  float tailX = delta.x + sin(delta.y * 14.0 + random * 6.0) * 0.012;
  float tail = (1.0 - smoothstep(0.014, 0.045, abs(tailX)))
    * smoothstep(0.03, 0.16, delta.y) * (1.0 - smoothstep(0.24, 0.46, delta.y));
  tail *= smoothstep(1.8, 3.2, age) * 0.35;
  vec2 bend = -q * body * (radius / scale) * 0.78;
  bend.x -= tailX * tail * 0.09;
  return vec4(bend, body + tail, glint + tail * 0.08) * active;
}

// An incoming wave hits the outside of a fixed glass plane, then drains away.
// This only warps the ONE scene ray below: no second ocean pass or texture reads.
vec4 glassLens(vec2 p, float seconds, float surface, out float impact) {
  impact = 0.0;
  if (surface < 0.001) return vec4(0.0);
  float cycle = floor(seconds / 11.8);
  float age = mod(seconds, 11.8);
  if (age < 1.0 || age > 11.3) return vec4(0.0);
  float seed = hash(vec2(cycle, 8.2));
  float rise = smoothstep(1.05, 1.60, age);
  float drain = 1.0 - smoothstep(2.05, 6.5, age);
  float surge = rise * drain;
  impact = smoothstep(1.15, 1.5, age) * exp(-max(age - 1.5, 0.0) * 8.0) * surface;
  float width = u_resolution.x / u_resolution.y * 0.55 + 0.15;
  float focus = (p.x - u_resolution.x / u_resolution.y * (0.55 + seed * 0.12)) / width;
  float fan = exp(-focus * focus * 1.2);
  float front = -0.12 + surge * (0.53 + seed * 0.07 + fan * 0.43);
  front += surge * (sin(p.x * 7.0 + seed * 9.0) * 0.035
    + sin(p.x * 18.0 - seconds * 0.8) * 0.018);
  front += impact * sin(p.x * 31.0 + seed * 12.0) * 0.045;
  float slope = surge * (cos(p.x * 7.0 + seed * 9.0) * 0.245
    + cos(p.x * 18.0 - seconds * 0.8) * 0.324);
  slope -= surge * fan * focus * 1.032 / width;
  slope += impact * cos(p.x * 31.0 + seed * 12.0) * 1.395;
  float distanceToFront = p.y - front;
  float feather = max(0.003, 1.8 / u_resolution.y);
  float film = (1.0 - smoothstep(-feather, feather, distanceToFront)) * rise;
  float meniscus = exp(-abs(distanceToFront) * 100.0) * surge;
  float a = p.x * 18.0 + p.y * 8.0 - seconds * 2.6;
  float b = p.x * 31.0 - p.y * 12.0 + seconds * 3.3;
  vec2 flow = vec2(cos(a) * 0.012 + cos(b) * 0.008,
    cos(a) * 0.008 - cos(b) * 0.006) * film;
  vec2 bend = flow + vec2(-slope, 1.0) * meniscus * 0.044;
  float rim = meniscus * (0.35 + 0.12 * sin(p.x * 97.0 + sin(p.x * 23.0) * 3.0));
  rim -= exp(-abs(distanceToFront + 0.022) * 90.0) * surge * 0.16;
  float residue = smoothstep(1.35, 1.75, age) * (1.0 - smoothstep(8.0, 11.3, age));
  vec4 beads = vec4(0.0);
  if (residue > 0.001) {
    residue *= (1.0 - film * 0.85) * (1.0 - smoothstep(0.83, 1.02, p.y));
    beads = glassBeads(p, age, cycle * 7.1 + 1.4, 7.0, 0.66);
    if (u_detail > 0.5) beads += glassBeads(p, age, cycle * 9.3 + 18.7, 13.0, 0.78) * 0.65;
    bend += beads.xy * residue;
  }
  // A bounded offset prevents a large drop from throwing rays across the horizon.
  bend = clamp(bend, vec2(-0.055), vec2(0.055));
  return vec4(bend, film * 0.85 + beads.z * residue * 0.22, rim + beads.w * residue) * surface;
}

vec3 sky(vec3 rd) {
  float up = max(rd.y, 0.0);
  vec3 horizon = mix(vec3(0.66, 0.76, 0.77), vec3(0.12, 0.22, 0.30), u_night);
  vec3 zenith = mix(vec3(0.23, 0.45, 0.58), vec3(0.018, 0.055, 0.11), u_night);
  vec3 color = mix(horizon, zenith, pow(up, 0.48));
  float sun = max(dot(rd, normalize(SUN)), 0.0);
  color += vec3(1.0, 0.85, 0.61) * pow(sun, 48.0) * mix(0.22, 0.045, u_night);
  color += vec3(1.0, 0.91, 0.76) * pow(sun, 900.0) * mix(1.15, 0.08, u_night);
  // A soft band of distant sea haze; clouds never require another pass.
  vec2 cp = rd.xz / max(up + 0.12, 0.12) * 2.8;
  float cloud = noise(cp + vec2(u_time * 0.006, 0.0));
  cloud = smoothstep(0.43, 0.82, cloud + noise(cp * 2.1) * 0.18);
  color = mix(color, mix(vec3(0.84, 0.85, 0.81), vec3(0.15, 0.23, 0.29), u_night),
    cloud * 0.36 * smoothstep(0.0, 0.18, up));
  return color;
}

// Bracket the finite-height ocean, then use a safeguarded secant search.
// Rays beyond 180 m blend into haze instead of marching to infinity.
float intersectOcean(vec3 ro, vec3 rd, float t) {
  if (abs(rd.y) < 0.001) return -1.0;
  float nearT = max(0.0, min((0.67 - ro.y) / rd.y, (-0.67 - ro.y) / rd.y));
  float farT = max((0.67 - ro.y) / rd.y, (-0.67 - ro.y) / rd.y);
  if (farT <= 0.0 || nearT > 180.0) return -1.0;
  farT = min(farT, 180.0);
  float nearH = (ro + rd * nearT).y - swell((ro + rd * nearT).xz, t).x;
  float farH = (ro + rd * farT).y - swell((ro + rd * farT).xz, t).x;
  // At the waterline a ray may cross several crests. Use the local gradient
  // and short steps to bracket a nearby crossing before the slab-wide solve.
  if (abs(ro.y) < 0.75) {
    float probeT = nearT;
    float previousT = nearT;
    float previousH = nearH;
    float initialSign = nearH >= 0.0 ? 1.0 : -1.0;
    bool found = false;
    for (int i = 0; i < 16; i++) {
      vec3 p = ro + rd * probeT;
      vec3 w = swell(p.xz, t);
      float h = p.y - w.x;
      float f = initialSign * h;
      // Require an actual crossing: a small residual can also be a grazing ray.
      if (f < 0.0) {
        nearT = previousT; nearH = previousH;
        farT = probeT; farH = h;
        found = true;
        break;
      }
      float slope = initialSign * (rd.y - dot(w.yz, rd.xz));
      float stepT = clamp(f / max(-slope, 0.05), 0.08, 2.0);
      if (slope >= 0.0) stepT = max(stepT, 1.0);
      previousT = probeT; previousH = h;
      probeT += stepT;
      if (probeT > farT) break;
    }
    // Retain the slab bracket for distant crossings beyond the local probes.
    if (!found && nearH * farH > 0.0) return -1.0;
  } else if (nearH * farH > 0.0) return -1.0;
  float result = nearT;
  for (int i = 0; i < 7; i++) {
    float ratio = clamp(nearH / (nearH - farH), 0.08, 0.92);
    result = mix(nearT, farT, ratio);
    vec3 p = ro + rd * result;
    float h = p.y - swell(p.xz, t).x;
    if (h * nearH > 0.0) { nearT = result; nearH = h; }
    else { farT = result; farH = h; }
  }
  return result;
}

vec3 belowWater(vec3 ro, vec3 rd, float t, float hit) {
  vec3 deep = mix(vec3(0.012, 0.105, 0.16), vec3(0.004, 0.032, 0.075), u_night);
  float up = smoothstep(-0.45, 0.9, rd.y);
  vec3 color = mix(deep * 0.52, vec3(0.035, 0.28, 0.35) * mix(1.0, 0.4, u_night), up);
  if (hit > 0.0) {
    vec3 p = ro + rd * hit;
    vec3 n = waterNormal(p.xz, t, hit);
    float window = smoothstep(0.61, 0.85, dot(rd, n));
    vec3 reflection = mix(deep, vec3(0.10, 0.38, 0.42), pow(max(dot(reflect(rd, -n), normalize(SUN)), 0.0), 4.0));
    color = mix(reflection, sky(refract(rd, -n, 1.333)) * vec3(0.48, 0.88, 0.85), window);
    color = mix(color, deep, 1.0 - exp(-hit * 0.035));
  }
  // Faint crepuscular beams and drifting marine particles.
  float beamPos = (rd.x + 0.22) / max(rd.y + 1.15, 0.3);
  float beams = pow(0.5 + 0.5 * sin(beamPos * 31.0 + sin(beamPos * 12.0 + t * 0.08)), 12.0);
  beams += pow(0.5 + 0.5 * sin(beamPos * 51.0 - t * 0.04), 18.0) * 0.35;
  color += vec3(0.08, 0.28, 0.29) * beams * 0.11 * up * mix(1.0, 0.35, u_night);
  vec2 particles = v_uv * vec2(u_resolution.x / u_resolution.y, 1.0) * 95.0 + vec2(t * 0.17, -t * 0.37);
  vec2 cell = floor(particles);
  float speck = (1.0 - smoothstep(0.025, 0.11, length(fract(particles) - vec2(hash(cell), hash(cell + 3.7)))))
    * step(0.975, hash(cell + 7.9));
  color += vec3(0.18, 0.38, 0.40) * speck * 0.35;
  return color;
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = (v_uv * 2.0 - 1.0) * vec2(aspect, 1.0);
  float dive = smoothstep(0.04, 0.96, u_dive);
  float t = u_time * 0.72;
  float descent = smoothstep(0.08, 0.96, dive);
  vec3 ro = vec3(0.0, mix(1.15, -1.75, descent), t * -0.13);
  ro.y += sin(t * 0.56) * 0.065;
  float cameraWater = swell(ro.xz, t).x;
  float wet = 1.0 - smoothstep(-0.10, 0.10, ro.y - cameraWater);
  float glassSurface = (1.0 - smoothstep(0.27, 0.62, u_dive)) * (1.0 - wet) * u_motion;
  float impact;
  vec4 glass = glassLens(v_uv * vec2(aspect, 1.0), max(u_time - 12.0, 0.0), glassSurface, impact);
  uv += glass.xy * 2.0;
  uv += vec2(sin(u_time * 43.0), cos(u_time * 37.0)) * impact * 0.0015;
  ro.y -= impact * 0.10;
  wet = 1.0 - smoothstep(-0.10, 0.10, ro.y - cameraWater);
  float pitch = mix(-0.09, 0.24, dive);
  vec3 forward = normalize(vec3(0.0, pitch, -1.0));
  vec3 right = vec3(1.0, 0.0, 0.0);
  vec3 up = cross(right, forward);
  vec3 rd = normalize(forward * 1.65 + right * uv.x + up * uv.y);
  vec3 color = sky(rd);
  float hit = intersectOcean(ro, rd, t);
  if (hit > 0.0 && wet < 1.0) {
    vec3 p = ro + rd * hit;
    vec3 n = waterNormal(p.xz, t, hit);
    float facing = max(dot(n, -rd), 0.0);
    float fresnel = 0.0204 + 0.9796 * pow(1.0 - facing, 5.0);
    vec3 reflected = sky(reflect(rd, n));
    vec3 body = mix(vec3(0.015, 0.19, 0.22), vec3(0.004, 0.065, 0.12), u_night);
    float scatter = pow(max(dot(rd, -normalize(SUN)), 0.0), 4.0) * max(p.y + 0.35, 0.0);
    body += vec3(0.015, 0.13, 0.12) * scatter;
    color = mix(body, reflected, fresnel);
    float sun = pow(max(dot(reflect(rd, n), normalize(SUN)), 0.0), 420.0);
    color += vec3(1.0, 0.84, 0.60) * sun * mix(1.7, 0.08, u_night);
    float haze = 1.0 - exp(-hit * hit * 0.000035);
    color = mix(color, sky(vec3(rd.x, 0.005, rd.z)), haze * 0.85);
  }
  if (wet > 0.0) color = mix(color, belowWater(ro, rd, t, hit), wet);
  // A gentle lens tint softens the waterline transition without a flash.
  float waterline = exp(-abs(ro.y - cameraWater) * 8.0);
  color = mix(color, color * vec3(0.64, 0.91, 0.91), waterline * 0.35);
  // Mostly clear water: curvature does the work; only the rims catch the light.
  color *= mix(vec3(1.0), vec3(0.70, 0.92, 0.94), clamp(glass.z, 0.0, 1.0) * 0.48);
  color *= 1.0 - max(-glass.w, 0.0) * 0.28;
  color += vec3(0.64, 0.85, 0.90) * max(glass.w, 0.0) * mix(0.55, 0.25, u_night);
  color *= 1.0 - 0.14 * dot(v_uv - 0.5, v_uv - 0.5);
  color = pow(max(color, 0.0), vec3(0.92));
  gl_FragColor = vec4(color, 1.0);
}`;

export interface OceanScene {
  resize: (width: number, height: number, scale: number) => void;
  render: (time: number, dive: number, night: number, motion: number) => void;
  dispose: () => void;
}

export function createOceanScene(canvas: HTMLCanvasElement, compact: boolean): OceanScene | null {
  const gl = canvas.getContext('webgl', {
    alpha: false, antialias: false, depth: false, stencil: false,
    powerPreference: 'low-power', preserveDrawingBuffer: false,
  });
  if (!gl) return null;

  const shaders: WebGLShader[] = [];
  let program: WebGLProgram | null = null;
  let buffer: WebGLBuffer | null = null;
  const dispose = () => {
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));
  };
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw new Error('Shader unavailable');
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Ocean shader compilation failed');
    }
    program = gl.createProgram();
    if (!program) throw new Error('Program unavailable');
    shaders.forEach((shader) => gl.attachShader(program!, shader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Ocean shader linking failed');
    gl.useProgram(program);
    buffer = gl.createBuffer();
    if (!buffer) throw new Error('Buffer unavailable');
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, 'u_resolution');
    const time = gl.getUniformLocation(program, 'u_time');
    const dive = gl.getUniformLocation(program, 'u_dive');
    const night = gl.getUniformLocation(program, 'u_night');
    const motion = gl.getUniformLocation(program, 'u_motion');
    gl.uniform1f(gl.getUniformLocation(program, 'u_detail'), compact ? 0 : 1);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    return {
      resize(width, height, scale) {
        // Hard pixel budgets matter more than devicePixelRatio on Retina displays.
        const pixels = compact ? 380_000 : 950_000;
        const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1 : 1.35);
        const ratio = Math.min(dpr, Math.sqrt(pixels / Math.max(width * height, 1))) * scale;
        canvas.width = Math.max(1, Math.round(width * ratio));
        canvas.height = Math.max(1, Math.round(height * ratio));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resolution, canvas.width, canvas.height);
      },
      render(seconds, progress, dark, animate) {
        gl.uniform1f(time, seconds);
        gl.uniform1f(dive, progress);
        gl.uniform1f(night, dark);
        gl.uniform1f(motion, animate);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}
