class AnimeFilterRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
    });

    if (!this.gl) {
      throw new Error("WebGL2 is required for the anime filter.");
    }

    this.program = this._createProgram(ANIME_VERTEX_SHADER, ANIME_FRAGMENT_SHADER);
    this._initGeometry();

    this.uniforms = {
      image: this.gl.getUniformLocation(this.program, "u_image"),
      resolution: this.gl.getUniformLocation(this.program, "u_resolution"),
      edgeStrength: this.gl.getUniformLocation(this.program, "u_edgeStrength"),
      colorLevels: this.gl.getUniformLocation(this.program, "u_colorLevels"),
      smoothness: this.gl.getUniformLocation(this.program, "u_smoothness"),
      saturation: this.gl.getUniformLocation(this.program, "u_saturation"),
      warmth: this.gl.getUniformLocation(this.program, "u_warmth"),
      contrast: this.gl.getUniformLocation(this.program, "u_contrast"),
      monochrome: this.gl.getUniformLocation(this.program, "u_monochrome"),
      paperTone: this.gl.getUniformLocation(this.program, "u_paperTone"),
      halftone: this.gl.getUniformLocation(this.program, "u_halftone"),
      compareSplit: this.gl.getUniformLocation(this.program, "u_compareSplit"),
      mirror: this.gl.getUniformLocation(this.program, "u_mirror"),
    };

    this.texture = this._createTexture();
    this.params = {
      edgeStrength: 1.1,
      colorLevels: 10,
      smoothness: 0.65,
      saturation: 1.35,
      warmth: 0.25,
      contrast: 1.0,
      monochrome: 0.0,
      paperTone: 0.0,
      halftone: 0.0,
      compareSplit: 1.0,
      mirror: 1.0,
    };
  }

  _compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const log = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compile error: ${log}`);
    }

    return shader;
  }

  _createProgram(vertexSource, fragmentSource) {
    const gl = this.gl;
    const vs = this._compileShader(gl.VERTEX_SHADER, vertexSource);
    const fs = this._compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      throw new Error(`Program link error: ${log}`);
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }

  _initGeometry() {
    const gl = this.gl;
    const positions = new Float32Array([
      -1, -1, 0, 1,
      1, -1, 1, 1,
      -1, 1, 0, 0,
      1, 1, 1, 0,
    ]);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, "a_position");
    const texLoc = gl.getAttribLocation(this.program, "a_texCoord");

    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 16, 8);

    gl.bindVertexArray(null);
  }

  _createTexture() {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
  }

  setParams(params) {
    Object.assign(this.params, params);
  }

  resize(width, height) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(width * dpr);
    const h = Math.round(height * dpr);

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    this.gl.viewport(0, 0, w, h);
    this.renderWidth = w;
    this.renderHeight = h;
  }

  render(video) {
    if (!video || video.readyState < video.HAVE_CURRENT_DATA) {
      return;
    }

    const gl = this.gl;
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      return;
    }

    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    gl.uniform1i(this.uniforms.image, 0);
    gl.uniform2f(this.uniforms.resolution, width, height);
    gl.uniform1f(this.uniforms.edgeStrength, this.params.edgeStrength);
    gl.uniform1f(this.uniforms.colorLevels, this.params.colorLevels);
    gl.uniform1f(this.uniforms.smoothness, this.params.smoothness);
    gl.uniform1f(this.uniforms.saturation, this.params.saturation);
    gl.uniform1f(this.uniforms.warmth, this.params.warmth);
    gl.uniform1f(this.uniforms.contrast, this.params.contrast);
    gl.uniform1f(this.uniforms.monochrome, this.params.monochrome);
    gl.uniform1f(this.uniforms.paperTone, this.params.paperTone);
    gl.uniform1f(this.uniforms.halftone, this.params.halftone);
    gl.uniform1f(this.uniforms.compareSplit, this.params.compareSplit);
    gl.uniform1f(this.uniforms.mirror, this.params.mirror);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  captureFrame(video) {
    this.params.compareSplit = 1.0;
    this.render(video);
    return this.canvas.toDataURL("image/png");
  }
}