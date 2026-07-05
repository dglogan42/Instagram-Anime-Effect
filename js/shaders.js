const ANIME_VERTEX_SHADER = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

const ANIME_FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_edgeStrength;
uniform float u_colorLevels;
uniform float u_smoothness;
uniform float u_saturation;
uniform float u_warmth;
uniform float u_contrast;
uniform float u_monochrome;
uniform float u_paperTone;
uniform float u_halftone;
uniform float u_compareSplit;
uniform float u_mirror;

in vec2 v_texCoord;
out vec4 fragColor;

float luminance(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 posterize(vec3 color, float levels) {
  float l = max(levels, 2.0);
  return floor(color * l + 0.0001) / (l - 1.0);
}

vec3 sampleMirrored(vec2 uv) {
  vec2 coord = uv;
  if (u_mirror > 0.5) {
    coord.x = 1.0 - coord.x;
  }
  return texture(u_image, coord).rgb;
}

vec3 applyAnime(vec2 uv) {
  vec2 texel = 1.0 / u_resolution;

  vec3 center = sampleMirrored(uv);

  float tl = luminance(sampleMirrored(uv + vec2(-texel.x, -texel.y)));
  float t  = luminance(sampleMirrored(uv + vec2(0.0, -texel.y)));
  float tr = luminance(sampleMirrored(uv + vec2(texel.x, -texel.y)));
  float l  = luminance(sampleMirrored(uv + vec2(-texel.x, 0.0)));
  float r  = luminance(sampleMirrored(uv + vec2(texel.x, 0.0)));
  float bl = luminance(sampleMirrored(uv + vec2(-texel.x, texel.y)));
  float b  = luminance(sampleMirrored(uv + vec2(0.0, texel.y)));
  float br = luminance(sampleMirrored(uv + vec2(texel.x, texel.y)));

  float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br;
  float gy = -tl - 2.0 * t - tr + bl + 2.0 * b + br;
  float edge = sqrt(gx * gx + gy * gy);

  vec3 blurred = vec3(0.0);
  float wsum = 0.0;
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      float wx = float(x);
      float wy = float(y);
      float w = exp(-(wx * wx + wy * wy) * 0.35);
      blurred += sampleMirrored(uv + vec2(wx, wy) * texel) * w;
      wsum += w;
    }
  }
  blurred /= wsum;

  vec3 color = mix(center, blurred, u_smoothness);

  if (u_monochrome > 0.5) {
    float gray = luminance(color);
    gray = clamp((gray - 0.5) * u_contrast + 0.5, 0.0, 1.0);
    color = vec3(gray);
    vec3 paper = vec3(0.97, 0.94, 0.86);
    color = mix(color, paper * (0.65 + gray * 0.35), u_paperTone);
  } else {
    vec3 hsv = rgb2hsv(color);
    hsv.y = clamp(hsv.y * u_saturation, 0.0, 1.0);
    color = hsv2rgb(hsv);
    color = clamp((color - 0.5) * u_contrast + 0.5, 0.0, 1.0);
    color.r += u_warmth * 0.06;
    color.g += u_warmth * 0.02;
    color.b -= u_warmth * 0.04;
  }

  color = posterize(color, u_colorLevels);

  if (u_halftone > 0.01) {
    float dots = sin(uv.x * u_resolution.x * 0.65) * sin(uv.y * u_resolution.y * 0.65);
    float tone = luminance(color);
    float screen = step(0.0, dots) * 0.08 + 0.92;
    color *= mix(1.0, screen, u_halftone * (1.0 - tone));
  }

  float outline = smoothstep(0.08, 0.55, edge) * u_edgeStrength;
  vec3 ink = u_monochrome > 0.5 ? vec3(0.02, 0.02, 0.05) : vec3(0.04, 0.03, 0.1);
  color = mix(color, ink, clamp(outline, 0.0, 0.95));

  float vignette = 1.0 - length((uv - 0.5) * vec2(1.1, 1.4)) * 0.35;
  color *= clamp(vignette, 0.75, 1.0);

  return clamp(color, 0.0, 1.0);
}

void main() {
  vec2 uv = v_texCoord;
  float split = clamp(u_compareSplit, 0.0, 1.0);

  if (split > 0.001 && uv.x < split) {
    fragColor = vec4(sampleMirrored(uv), 1.0);
  } else {
    fragColor = vec4(applyAnime(uv), 1.0);
  }
}
`;