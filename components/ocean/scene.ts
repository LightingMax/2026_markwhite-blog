/** A ray-traced water volume behind a clear fixed pane; no external assets. */
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
  vec4 a = vec4(0.14, 0.075, 0.035, 0.018);
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
  vec2 ripple = vec2(4.2, 3.1) * cos(a + sin(b) * 0.4) * 0.012;
  ripple += vec2(-6.1, 4.8) * cos(b) * 0.007;
  ripple += vec2(10.4, 7.7) * cos(c) * 0.003 * u_detail;
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

// The viewer stays in AIR behind the fixed, optically unobtrusive front pane
// (z = 0). Water occupies z < 0, between its moving surface and a stone bed.
// Geometry, not a screen overlay, determines which medium each ray enters.
const float BED = -3.2;
const vec3 ABSORPTION = vec3(0.32, 0.085, 0.055);

vec3 waterFog(vec3 color, float distanceInWater) {
  vec3 transmission = exp(-ABSORPTION * max(distanceInWater, 0.0));
  vec3 scattering = mix(vec3(0.025, 0.27, 0.32), vec3(0.004, 0.055, 0.095), u_night);
  return color * transmission + scattering * (1.0 - transmission);
}

// A refracted sunlight footprint. The local area change concentrates light
// into caustics; derivative samples keep the footprint in world space.
vec2 lightFootprint(vec2 surface, float t) {
  vec3 wave = swell(surface, t);
  // Filter capillary detail out of the light map to prevent subpixel flicker.
  vec3 n = normalize(vec3(-wave.y, 1.0, -wave.z));
  vec3 lightRay = refract(-normalize(SUN), n, 1.0 / 1.333);
  return surface + lightRay.xz * ((BED - swell(surface, t).x) / min(lightRay.y, -0.05));
}

float caustic(vec2 bed, float t) {
  vec3 flatRay = refract(-normalize(SUN), vec3(0.0, 1.0, 0.0), 1.0 / 1.333);
  vec2 surface = bed - flatRay.xz * (BED / flatRay.y);
  // Invert the light map locally rather than attach an animated texture to the bed.
  for (int i = 0; i < 3; i++) surface += clamp(bed - lightFootprint(surface, t), vec2(-0.3), vec2(0.3)) * 0.65;
  vec2 center = lightFootprint(surface, t);
  vec2 dx = (lightFootprint(surface + vec2(0.04, 0.0), t) - center) / 0.04;
  vec2 dz = (lightFootprint(surface + vec2(0.0, 0.04), t) - center) / 0.04;
  float area = abs(dx.x * dz.y - dx.y * dz.x);
  return clamp(0.65 / max(area, 0.30), 0.40, 1.65);
}

vec3 bedColor(vec3 p, float t, float distanceToCamera) {
  // Quiet limestone slabs provide stable depth and refraction cues, as in a
  // water tank. Thin joints recede with perspective; no screen-space pattern.
  vec2 tile = p.xz * 0.85;
  vec2 edge = abs(fract(tile) - 0.5);
  float jointWidth = clamp(distanceToCamera * 0.0008, 0.006, 0.045);
  float joints = smoothstep(0.49 - jointWidth, 0.495, max(edge.x, edge.y));
  float grain = noise(p.xz * 6.0) * 0.035 + noise(floor(tile) + 7.1) * 0.035;
  vec3 stone = vec3(0.43, 0.57, 0.52) + grain;
  stone *= 1.0 - joints * 0.30;
  float light = caustic(p.xz, t);
  stone *= (0.65 + light * 0.35) * mix(1.0, 0.24, u_night);
  return stone;
}

vec3 traceBed(vec3 ro, vec3 rd, float t) {
  float hit = rd.y < -0.001 ? (BED - ro.y) / rd.y : 100.0;
  if (hit <= 0.0 || hit > 65.0) return waterFog(vec3(0.0), 65.0);
  vec3 p = ro + rd * hit;
  return waterFog(bedColor(p, t, hit), hit);
}

float fresnelWater(float cosine) {
  return 0.0204 + 0.9796 * pow(1.0 - clamp(cosine, 0.0, 1.0), 5.0);
}

// Restore the original open-ocean atmosphere below the surface: no floor or
// reflected floor, only distant blue water, dim overhead light and particles.
vec3 deepWater(vec3 ro, vec3 rd, float t, float hit) {
  vec3 deep = mix(vec3(0.012, 0.105, 0.16), vec3(0.004, 0.032, 0.075), u_night);
  float depth = max(-ro.y, 0.0);
  float daylight = exp(-depth * 0.14);
  float up = smoothstep(-0.45, 0.9, rd.y);
  vec3 color = mix(deep * 0.52, vec3(0.035, 0.28, 0.35) * mix(1.0, 0.4, u_night), up);
  if (hit > 0.0) {
    vec3 p = ro + rd * hit;
    vec3 n = waterNormal(p.xz, t, hit);
    vec3 transmitted = refract(rd, -n, 1.333);
    float window = smoothstep(0.61, 0.85, dot(rd, n));
    vec3 reflection = mix(deep, vec3(0.10, 0.38, 0.42) * mix(1.0, 0.3, u_night),
      pow(max(dot(reflect(rd, -n), normalize(SUN)), 0.0), 4.0));
    color = reflection;
    if (dot(transmitted, transmitted) > 0.01) {
      color = mix(reflection, sky(transmitted) * vec3(0.48, 0.88, 0.85), window);
    }
    color = mix(color, deep, 1.0 - exp(-hit * 0.07));
  }
  color *= daylight;
  float beamPos = (rd.x + 0.22) / max(rd.y + 1.15, 0.3);
  float beams = pow(0.5 + 0.5 * sin(beamPos * 31.0 + sin(beamPos * 12.0 + t * 0.08)), 12.0);
  beams += pow(0.5 + 0.5 * sin(beamPos * 51.0 - t * 0.04), 18.0) * 0.35;
  color += vec3(0.08, 0.28, 0.29) * beams * 0.11 * up * daylight * mix(1.0, 0.35, u_night);
  vec2 particles = v_uv * vec2(u_resolution.x / u_resolution.y, 1.0) * 95.0 + vec2(t * 0.17, -t * 0.37);
  vec2 cell = floor(particles);
  float speck = (1.0 - smoothstep(0.025, 0.11, length(fract(particles) - vec2(hash(cell), hash(cell + 3.7)))))
    * step(0.975, hash(cell + 7.9));
  color += vec3(0.18, 0.38, 0.40) * speck * 0.35 * daylight;
  return color;
}

float abyssBlend() {
  return smoothstep(0.08, 0.55, u_dive);
}

vec3 fromAir(vec3 ro, vec3 rd, float t) {
  float hit = intersectOcean(ro, rd, t);
  if (hit < 0.0) return sky(rd);
  vec3 p = ro + rd * hit;
  vec3 n = waterNormal(p.xz, t, hit);
  vec3 transmittedRay = refract(rd, n, 1.0 / 1.333);
  float abyss = abyssBlend();
  vec3 transmitted = deepWater(p, transmittedRay, t, -1.0);
  if (abyss < 0.999) {
    transmitted = mix(traceBed(p + transmittedRay * 0.012, transmittedRay, t), transmitted, abyss);
  }
  vec3 reflected = sky(reflect(rd, n));
  float sun = pow(max(dot(reflect(rd, n), normalize(SUN)), 0.0), 480.0);
  reflected += vec3(1.0, 0.87, 0.67) * sun * mix(1.5, 0.05, u_night);
  vec3 color = mix(transmitted, reflected, fresnelWater(dot(-rd, n)));
  float haze = 1.0 - exp(-hit * 0.012);
  return mix(color, sky(vec3(rd.x, 0.005, rd.z)), haze * 0.75);
}

vec3 fromShallowWater(vec3 ro, vec3 rd, float t) {
  float surfaceHit = intersectOcean(ro, rd, t);
  float bedHit = rd.y < -0.001 ? (BED - ro.y) / rd.y : 1000.0;
  if (surfaceHit < 0.0 || bedHit < surfaceHit) return traceBed(ro, rd, t);
  vec3 p = ro + rd * surfaceHit;
  vec3 n = waterNormal(p.xz, t, surfaceHit);
  vec3 transmittedRay = refract(rd, -n, 1.333);
  vec3 reflectedRay = reflect(rd, -n);
  vec3 reflected = traceBed(p + reflectedRay * 0.012, reflectedRay, t);
  // Snell's window and total internal reflection are consequences of the same
  // surface normals that distort the floor when viewed from above.
  float reflectance = fresnelWater(dot(rd, n));
  vec3 color = reflected;
  if (dot(transmittedRay, transmittedRay) > 0.01) {
    color = mix(sky(transmittedRay), reflected, reflectance);
  }
  return waterFog(color, surfaceHit);
}

vec3 fromWater(vec3 ro, vec3 rd, float t) {
  float abyss = abyssBlend();
  if (abyss < 0.001) return fromShallowWater(ro, rd, t);
  vec3 deep = deepWater(ro, rd, t, intersectOcean(ro, rd, t));
  if (abyss > 0.999) return deep;
  return mix(fromShallowWater(ro, rd, t), deep, abyss);
}

void main() {
  float aspect = u_resolution.x / u_resolution.y;
  vec2 uv = (v_uv * 2.0 - 1.0) * vec2(aspect, 1.0);
  float dive = smoothstep(0.04, 0.96, u_dive);
  float t = u_time * 0.55;
  // Scroll moves the observer along the dry side of the pane. The pane and
  // water volume never move with the camera or rise as a screen-space mask.
  vec3 ro = vec3(0.0, mix(0.68, -1.65, dive), 2.8);
  // Continue descending into open water after leaving the bright surface.
  ro.y -= smoothstep(0.25, 1.0, dive) * 3.0;
  float pitch = mix(-0.045, 0.20, dive);
  vec3 forward = normalize(vec3(0.0, pitch, -1.0));
  vec3 right = vec3(1.0, 0.0, 0.0);
  vec3 up = cross(right, forward);
  vec3 rd = normalize(forward * 1.85 + right * uv.x + up * uv.y);
  vec3 pane = ro + rd * (-ro.z / rd.z);
  float surface = swell(pane.xz, t).x;
  float pixel = max(0.003, 3.0 / u_resolution.y);
  float submerged = 1.0 - smoothstep(-pixel, pixel, pane.y - surface);
  vec3 color;
  // Only evaluate both optical paths in the antialiased water contact band.
  if (submerged < 0.999) color = fromAir(pane, rd, t);
  else color = vec3(0.0);
  if (submerged > 0.001) {
    // Air -> plane parallel glass -> water. For the parallel interfaces the
    // emergent direction depends on air/water IOR; the glass stays invisible.
    vec3 inside = refract(rd, vec3(0.0, 0.0, 1.0), 1.0 / 1.333);
    vec3 water = fromWater(pane + inside * 0.012, inside, t);
    color = mix(color, water, submerged);
  }
  // A restrained meniscus makes contact visible without glass glare or drops.
  float contact = exp(-abs(pane.y - surface) / (pixel * 1.3));
  color *= 1.0 - contact * 0.12;
  color *= 1.0 - 0.09 * dot(v_uv - 0.5, v_uv - 0.5);
  color = pow(max(color, 0.0), vec3(0.92));
  gl_FragColor = vec4(color, 1.0);
}`;

export interface OceanScene {
  resize: (width: number, height: number, scale: number) => void;
  render: (time: number, dive: number, night: number) => void;
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
      render(seconds, progress, dark) {
        gl.uniform1f(time, seconds);
        gl.uniform1f(dive, progress);
        gl.uniform1f(night, dark);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      },
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}
