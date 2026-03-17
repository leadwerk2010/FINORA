/**
 * Liquid Glass Physics Pipeline.
 * All browsers use the WebGL canvas path fed by a cloned source scene.
 */

const MathUtils = {
    convex_squircle: (x) => Math.pow(1 - Math.pow(1 - x, 4), 1 / 4),
    convex_circle: (x) => Math.sqrt(1 - Math.pow(1 - x, 2)),
    concave: (x) => 1 - Math.sqrt(1 - Math.pow(x, 2)),
    lip: (x) => {
        const convex = Math.pow(1 - Math.pow(1 - Math.min(x * 2, 1), 4), 1 / 4);
        const concave = 1 - Math.sqrt(1 - Math.pow(1 - x, 2)) + 0.1;
        const smootherstep = 6 * Math.pow(x, 5) - 15 * Math.pow(x, 4) + 10 * Math.pow(x, 3);
        return convex * (1 - smootherstep) + concave * smootherstep;
    }
};

class LiquidGlassFilter {
    static instances = new Set();
    static activeInstances = new Set();
    static imageCache = new Map();
    static syncRaf = null;
    static activationRaf = null;
    static globalListenersAttached = false;
    static visibilityObserver = null;

    static attachGlobalListeners() {
        if (this.globalListenersAttached) {
            return;
        }

        const scheduleSync = () => LiquidGlassFilter.scheduleAllSync();
        window.addEventListener("resize", scheduleSync, { passive: true });
        window.addEventListener("scroll", scheduleSync, { passive: true });
        this.globalListenersAttached = true;
    }

    static getMaxActiveContexts() {
        const coarsePointer = window.matchMedia("(hover: none), (pointer: coarse)").matches;
        const narrowViewport = window.matchMedia("(max-width: 980px)").matches;
        return coarsePointer || narrowViewport ? 6 : 10;
    }

    static ensureVisibilityObserver() {
        if (this.visibilityObserver || !("IntersectionObserver" in window)) {
            return;
        }

        this.visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const instance = entry.target && entry.target._liquidGlassInstance;
                if (!instance) {
                    return;
                }

                instance.isIntersecting = entry.isIntersecting;
                instance.intersectionRatio = entry.intersectionRatio || 0;
            });

            LiquidGlassFilter.scheduleActivationReview();
        }, {
            root: null,
            rootMargin: "200px 0px 200px 0px",
            threshold: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1]
        });
    }

    static scheduleActivationReview() {
        if (this.activationRaf) {
            return;
        }

        this.activationRaf = window.requestAnimationFrame(() => {
            this.activationRaf = null;
            LiquidGlassFilter.reevaluateEnhancements();
        });
    }

    static reevaluateEnhancements() {
        const budget = LiquidGlassFilter.getMaxActiveContexts();
        const ranked = Array.from(LiquidGlassFilter.instances)
            .filter((instance) => instance.canUseWebGL())
            .sort((a, b) => b.getActivationScore() - a.getActivationScore());
        const allowed = new Set(ranked.slice(0, budget));

        LiquidGlassFilter.instances.forEach((instance) => {
            if (allowed.has(instance)) {
                instance.ensureEnhancement();
                return;
            }

            instance.suspendEnhancement();
        });
    }

    static scheduleAllSync() {
        if (this.syncRaf) {
            return;
        }

        this.syncRaf = window.requestAnimationFrame(() => {
            this.syncRaf = null;
            LiquidGlassFilter.reevaluateEnhancements();
            LiquidGlassFilter.instances.forEach((instance) => instance.handleViewportChange());
        });
    }

    static extractFirstUrl(backgroundImage) {
        const match = /url\((['"]?)(.*?)\1\)/.exec(backgroundImage || "");
        return match ? match[2] : "";
    }

    static getCachedImage(src, onLoad) {
        if (!src) {
            return null;
        }

        let entry = LiquidGlassFilter.imageCache.get(src);
        if (!entry) {
            const image = new Image();
            entry = {
                image,
                loaded: false,
                error: false,
                callbacks: []
            };

            image.onload = () => {
                entry.loaded = true;
                entry.callbacks.splice(0).forEach((callback) => callback(image));
            };

            image.onerror = () => {
                entry.error = true;
                entry.callbacks.length = 0;
            };

            image.src = src;
            LiquidGlassFilter.imageCache.set(src, entry);
        }

        if (entry.loaded) {
            return entry.image;
        }

        if (!entry.error && onLoad) {
            entry.callbacks.push(onLoad);
        }

        return null;
    }

    static parseSizeToken(token, containerSize) {
        if (!token || token === "auto") {
            return null;
        }

        if (token.endsWith("%")) {
            return (parseFloat(token) / 100) * containerSize;
        }

        if (token.endsWith("px")) {
            return parseFloat(token);
        }

        const numericValue = parseFloat(token);
        return Number.isFinite(numericValue) ? numericValue : null;
    }

    static parsePositionToken(token, freeSpace, axis) {
        const normalized = (token || "50%").trim().toLowerCase();

        if (normalized === "center") {
            return freeSpace / 2;
        }

        if (axis === "x") {
            if (normalized === "left") {
                return 0;
            }

            if (normalized === "right") {
                return freeSpace;
            }
        }

        if (axis === "y") {
            if (normalized === "top") {
                return 0;
            }

            if (normalized === "bottom") {
                return freeSpace;
            }
        }

        if (normalized.endsWith("%")) {
            return (parseFloat(normalized) / 100) * freeSpace;
        }

        if (normalized.endsWith("px")) {
            return parseFloat(normalized);
        }

        const numericValue = parseFloat(normalized);
        return Number.isFinite(numericValue) ? numericValue : freeSpace / 2;
    }

    static computeBackgroundDrawRect(styles, containerWidth, containerHeight, imageWidth, imageHeight) {
        const backgroundSize = (styles.backgroundSize || "auto").trim();
        let drawWidth = imageWidth;
        let drawHeight = imageHeight;

        if (backgroundSize === "cover") {
            const scale = Math.max(containerWidth / imageWidth, containerHeight / imageHeight);
            drawWidth = imageWidth * scale;
            drawHeight = imageHeight * scale;
        } else if (backgroundSize === "contain") {
            const scale = Math.min(containerWidth / imageWidth, containerHeight / imageHeight);
            drawWidth = imageWidth * scale;
            drawHeight = imageHeight * scale;
        } else if (backgroundSize !== "auto") {
            const [rawWidth, rawHeight = "auto"] = backgroundSize.split(/\s+/);
            const parsedWidth = LiquidGlassFilter.parseSizeToken(rawWidth, containerWidth);
            const parsedHeight = LiquidGlassFilter.parseSizeToken(rawHeight, containerHeight);

            if (parsedWidth !== null && parsedHeight !== null) {
                drawWidth = parsedWidth;
                drawHeight = parsedHeight;
            } else if (parsedWidth !== null) {
                drawWidth = parsedWidth;
                drawHeight = imageHeight * (parsedWidth / imageWidth);
            } else if (parsedHeight !== null) {
                drawHeight = parsedHeight;
                drawWidth = imageWidth * (parsedHeight / imageHeight);
            }
        }

        const backgroundPosition = (styles.backgroundPosition || "50% 50%").trim();
        const [posXToken, posYToken = posXToken] = backgroundPosition.split(/\s+/);
        const x = LiquidGlassFilter.parsePositionToken(posXToken, containerWidth - drawWidth, "x");
        const y = LiquidGlassFilter.parsePositionToken(posYToken, containerHeight - drawHeight, "y");

        return { x, y, width: drawWidth, height: drawHeight };
    }

    static computeObjectFitDrawRect(styles, boxWidth, boxHeight, imageWidth, imageHeight) {
        const fit = (styles.objectFit || "fill").trim().toLowerCase();
        let drawWidth = boxWidth;
        let drawHeight = boxHeight;

        if (fit === "contain") {
            const scale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight);
            drawWidth = imageWidth * scale;
            drawHeight = imageHeight * scale;
        } else if (fit === "cover") {
            const scale = Math.max(boxWidth / imageWidth, boxHeight / imageHeight);
            drawWidth = imageWidth * scale;
            drawHeight = imageHeight * scale;
        } else if (fit === "none") {
            drawWidth = imageWidth;
            drawHeight = imageHeight;
        } else if (fit === "scale-down") {
            const containScale = Math.min(boxWidth / imageWidth, boxHeight / imageHeight, 1);
            drawWidth = imageWidth * containScale;
            drawHeight = imageHeight * containScale;
        }

        const objectPosition = (styles.objectPosition || "50% 50%").trim();
        const [posXToken, posYToken = posXToken] = objectPosition.split(/\s+/);
        const x = LiquidGlassFilter.parsePositionToken(posXToken, boxWidth - drawWidth, "x");
        const y = LiquidGlassFilter.parsePositionToken(posYToken, boxHeight - drawHeight, "y");

        return { x, y, width: drawWidth, height: drawHeight };
    }

    constructor(element, options = {}) {
        this.element = element;
        this.sourceSelector = options.sourceSelector || element.dataset.glassSource || "";
        this.mode = "webgl";
        this.options = {
            surfaceType: options.surfaceType || "convex_squircle",
            bezelWidth: options.bezelWidth || 30,
            glassThickness: options.glassThickness || 100,
            refractiveIndex: options.refractiveIndex || 1.5,
            refractionScale: options.refractionScale || 1.1,
            specularOpacity: options.specularOpacity || 0.6,
            canvasBlur: options.canvasBlur || 1.1,
            saturate: options.saturate || 1.14,
            brightness: options.brightness || 1.1,
            contrast: options.contrast || 1.02,
            edgeRadius: options.edgeRadius || 24,
            transitionSyncDuration: options.transitionSyncDuration || 700,
            ...options
        };

        this.buildRaf = null;
        this.renderRaf = null;
        this.temporarySyncRaf = null;
        this.resizeObserver = null;
        this.mutationObserver = null;
        this.sourceMutationObserver = null;
        this.sourceElement = null;
        this.renderCanvas = null;
        this.captureCanvas = null;
        this.captureContext = null;
        this.gl = null;
        this.program = null;
        this.positionBuffer = null;
        this.texCoordBuffer = null;
        this.sourceTexture = null;
        this.displacementTexture = null;
        this.specularTexture = null;
        this.uniforms = null;
        this.isEnhancementActive = false;
        this.isIntersecting = false;
        this.intersectionRatio = 0;
        this.activationBlockedUntil = 0;
        this.contextLostHandler = null;
        this.contextRestoredHandler = null;

        try {
            this.refreshSourceElement();
            this.setupLayers();

            this.element._liquidGlassInstance = this;
            LiquidGlassFilter.instances.add(this);
            LiquidGlassFilter.attachGlobalListeners();
            LiquidGlassFilter.ensureVisibilityObserver();

            this.setupObservers();
            this.setupTransitionSync();
            this.observeVisibility();
            this.handleViewportChange();
        } catch (error) {
            console.error("Liquid glass initialization failed.", error);
            this.disableEnhancement();
        }
    }

    getSourceCandidates() {
        return (this.sourceSelector || "")
            .split(",")
            .map((candidate) => candidate.trim())
            .filter(Boolean);
    }

    resolveSourceCandidate(selector) {
        if (!selector) {
            return null;
        }

        if (selector === ".glass-panel") {
            const parentGlass = this.element.parentElement ? this.element.parentElement.closest(".glass-panel") : null;
            return parentGlass && parentGlass !== this.element ? parentGlass : null;
        }

        const ancestorMatch = this.element.closest(selector);
        if (ancestorMatch && ancestorMatch !== this.element) {
            return ancestorMatch;
        }

        const parentGlass = this.element.parentElement ? this.element.parentElement.closest(".glass-panel") : null;
        if (parentGlass) {
            if (parentGlass.matches(selector) && parentGlass !== this.element) {
                return parentGlass;
            }

            const scopedMatch = parentGlass.querySelector(selector);
            if (scopedMatch && scopedMatch !== this.element) {
                return scopedMatch;
            }
        }

        const nearestSection = this.element.closest("section, header, footer, main, article, body");
        if (nearestSection) {
            const sectionMatch = nearestSection.querySelector(selector);
            if (sectionMatch && sectionMatch !== this.element) {
                return sectionMatch;
            }
        }

        const globalMatch = document.querySelector(selector);
        return globalMatch && globalMatch !== this.element ? globalMatch : null;
    }

    resolveSourceElement() {
        const candidates = this.getSourceCandidates();
        for (const candidate of candidates) {
            const match = this.resolveSourceCandidate(candidate);
            if (match) {
                return match;
            }
        }

        return null;
    }

    refreshSourceElement() {
        const nextSource = this.resolveSourceElement();
        if (nextSource === this.sourceElement) {
            return;
        }

        if (this.resizeObserver && this.sourceElement) {
            this.resizeObserver.unobserve(this.sourceElement);
        }

        if (this.sourceMutationObserver) {
            this.sourceMutationObserver.disconnect();
            this.sourceMutationObserver = null;
        }

        this.sourceElement = nextSource;

        if (!this.sourceElement) {
            return;
        }

        if (this.resizeObserver) {
            this.resizeObserver.observe(this.sourceElement);
        }

        this.sourceMutationObserver = new MutationObserver(() => {
            this.scheduleRender();
        });

        this.sourceMutationObserver.observe(this.sourceElement, {
            attributes: true,
            attributeFilter: ["class", "style", "hidden"]
        });

        if (this.sourceElement instanceof HTMLImageElement && !this.sourceElement.complete) {
            this.sourceElement.addEventListener("load", () => this.scheduleRender(), { once: true });
        }
    }

    observeVisibility() {
        if (LiquidGlassFilter.visibilityObserver) {
            LiquidGlassFilter.visibilityObserver.observe(this.element);
            return;
        }

        this.isIntersecting = true;
        this.intersectionRatio = 1;
    }

    canUseWebGL() {
        if (!this.element || !this.element.isConnected || this.element.dataset.glassFailed === "true") {
            return false;
        }

        if (this.activationBlockedUntil > performance.now()) {
            return false;
        }

        const rect = this.element.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) {
            return false;
        }

        const styles = window.getComputedStyle(this.element);
        if (styles.display === "none" || styles.visibility === "hidden") {
            return false;
        }

        const viewportMargin = 240;
        const isNearViewport = rect.bottom > -viewportMargin
            && rect.top < window.innerHeight + viewportMargin
            && rect.right > -viewportMargin
            && rect.left < window.innerWidth + viewportMargin;

        if (!isNearViewport) {
            return false;
        }

        return !!this.sourceElement;
    }

    getActivationScore() {
        const rect = this.element.getBoundingClientRect();
        const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
        const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
        const visibleArea = visibleWidth * visibleHeight;
        const totalArea = Math.max(rect.width * rect.height, 1);
        const visibilityRatio = visibleArea / totalArea;
        const elementCenterY = rect.top + rect.height / 2;
        const viewportCenterY = window.innerHeight / 2;
        const distancePenalty = Math.abs(elementCenterY - viewportCenterY) / Math.max(window.innerHeight, 1);

        let score = (this.isIntersecting ? 1200 : 320)
            + (this.intersectionRatio * 240)
            + (visibilityRatio * 320)
            + Math.min(totalArea, 240000) / 2400
            - (distancePenalty * 140);

        if (this.element.matches(".site-header, .mobile-menu, .header-lang-dropdown, .nav-menu .sub-menu")) {
            score += 180;
        }

        if (this.element.matches(".footer-main")) {
            score += 80;
        }

        if (this.element.matches(".glass-button, .fs-dot, .testimonials-nav-dot")) {
            score -= 60;
        }

        return score;
    }

    setupLayers() {
        this.backdropLayer = document.createElement("div");
        this.backdropLayer.className = "glass-backdrop-layer";
        this.backdropLayer.setAttribute("aria-hidden", "true");

        this.tintLayer = document.createElement("div");
        this.tintLayer.className = "glass-tint-layer";
        this.tintLayer.setAttribute("aria-hidden", "true");

        this.specularLayer = document.createElement("div");
        this.specularLayer.className = "glass-specular-layer";
        this.specularLayer.setAttribute("aria-hidden", "true");

        this.contentLayer = document.createElement("div");
        this.contentLayer.className = "glass-content-layer";

        const fragment = document.createDocumentFragment();
        while (this.element.firstChild) {
            fragment.appendChild(this.element.firstChild);
        }

        this.contentLayer.appendChild(fragment);
        this.element.append(this.backdropLayer, this.tintLayer, this.specularLayer, this.contentLayer);
    }

    setupWebGL() {
        if (this.gl && this.renderCanvas) {
            return;
        }

        this.renderCanvas = document.createElement("canvas");
        this.renderCanvas.className = "glass-render-surface";
        this.renderCanvas.setAttribute("aria-hidden", "true");
        this.backdropLayer.appendChild(this.renderCanvas);

        this.captureCanvas = document.createElement("canvas");
        this.captureContext = this.captureCanvas.getContext("2d");
        this.captureContext.imageSmoothingEnabled = true;
        this.captureContext.imageSmoothingQuality = "high";

        this.gl = this.renderCanvas.getContext("webgl", {
            alpha: true,
            antialias: true,
            premultipliedAlpha: true
        });

        if (!this.gl) {
            throw new Error("WebGL is unavailable.");
        }

        this.contextLostHandler = (event) => {
            event.preventDefault();
            this.activationBlockedUntil = performance.now() + 1500;
            this.suspendEnhancement();
            LiquidGlassFilter.scheduleActivationReview();
        };

        this.contextRestoredHandler = () => {
            this.activationBlockedUntil = 0;
            LiquidGlassFilter.scheduleActivationReview();
        };

        this.renderCanvas.addEventListener("webglcontextlost", this.contextLostHandler, false);
        this.renderCanvas.addEventListener("webglcontextrestored", this.contextRestoredHandler, false);

        const vertexShaderSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            varying vec2 v_texCoord;

            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }
        `;

        const fragmentShaderSource = `
            precision mediump float;

            varying vec2 v_texCoord;
            uniform sampler2D u_source;
            uniform sampler2D u_displacement;
            uniform sampler2D u_specular;
            uniform vec2 u_resolution;
            uniform float u_strength;
            uniform float u_blur;
            uniform float u_saturation;
            uniform float u_brightness;
            uniform float u_contrast;

            vec3 tone(vec3 color) {
                float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
                vec3 saturated = mix(vec3(luminance), color, u_saturation);
                vec3 contrasted = (saturated - 0.5) * u_contrast + 0.5;
                return contrasted * u_brightness;
            }

            void main() {
                vec2 displacement = (texture2D(u_displacement, v_texCoord).rg - vec2(0.5)) * 2.0;
                float edge = clamp(length(displacement), 0.0, 1.0);
                vec2 offset = displacement * (u_strength / u_resolution);
                vec2 blurStep = vec2(u_blur) / u_resolution;

                vec4 center = texture2D(u_source, clamp(v_texCoord, 0.001, 0.999));
                vec4 sample0 = texture2D(u_source, clamp(v_texCoord + offset, 0.001, 0.999));
                vec4 sample1 = texture2D(u_source, clamp(v_texCoord + offset + vec2(blurStep.x, 0.0), 0.001, 0.999));
                vec4 sample2 = texture2D(u_source, clamp(v_texCoord + offset - vec2(blurStep.x, 0.0), 0.001, 0.999));
                vec4 sample3 = texture2D(u_source, clamp(v_texCoord + offset + vec2(0.0, blurStep.y), 0.001, 0.999));
                vec4 sample4 = texture2D(u_source, clamp(v_texCoord + offset - vec2(0.0, blurStep.y), 0.001, 0.999));
                vec4 sample5 = texture2D(u_source, clamp(v_texCoord + offset + vec2(blurStep.x, blurStep.y), 0.001, 0.999));
                vec4 sample6 = texture2D(u_source, clamp(v_texCoord + offset + vec2(-blurStep.x, blurStep.y), 0.001, 0.999));
                vec4 sample7 = texture2D(u_source, clamp(v_texCoord + offset + vec2(blurStep.x, -blurStep.y), 0.001, 0.999));
                vec4 sample8 = texture2D(u_source, clamp(v_texCoord + offset + vec2(-blurStep.x, -blurStep.y), 0.001, 0.999));

                vec4 refracted = sample0 * 0.28
                    + sample1 * 0.11 + sample2 * 0.11
                    + sample3 * 0.11 + sample4 * 0.11
                    + sample5 * 0.07 + sample6 * 0.07
                    + sample7 * 0.07 + sample8 * 0.07;
                vec4 base = mix(center, refracted, smoothstep(0.04, 0.32, edge));
                vec3 shaded = tone(base.rgb);
                vec4 spec = texture2D(u_specular, v_texCoord);
                vec3 combined = min(shaded + spec.rgb * spec.a * 0.85, 1.0);

                gl_FragColor = vec4(combined, base.a);
            }
        `;

        this.program = this.createProgram(vertexShaderSource, fragmentShaderSource);
        this.gl.useProgram(this.program);

        const positions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1
        ]);

        const texCoords = new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0
        ]);

        this.positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

        const positionLocation = this.gl.getAttribLocation(this.program, "a_position");
        this.gl.enableVertexAttribArray(positionLocation);
        this.gl.vertexAttribPointer(positionLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);

        const texCoordLocation = this.gl.getAttribLocation(this.program, "a_texCoord");
        this.gl.enableVertexAttribArray(texCoordLocation);
        this.gl.vertexAttribPointer(texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

        this.sourceTexture = this.createTexture();
        this.displacementTexture = this.createTexture();
        this.specularTexture = this.createTexture();

        this.uniforms = {
            source: this.gl.getUniformLocation(this.program, "u_source"),
            displacement: this.gl.getUniformLocation(this.program, "u_displacement"),
            specular: this.gl.getUniformLocation(this.program, "u_specular"),
            resolution: this.gl.getUniformLocation(this.program, "u_resolution"),
            strength: this.gl.getUniformLocation(this.program, "u_strength"),
            blur: this.gl.getUniformLocation(this.program, "u_blur"),
            saturation: this.gl.getUniformLocation(this.program, "u_saturation"),
            brightness: this.gl.getUniformLocation(this.program, "u_brightness"),
            contrast: this.gl.getUniformLocation(this.program, "u_contrast")
        };
    }

    ensureEnhancement() {
        if (this.isEnhancementActive) {
            this.scheduleBuild();
            this.scheduleRender();
            return true;
        }

        if (!this.canUseWebGL()) {
            return false;
        }

        try {
            this.setupWebGL();
            this.isEnhancementActive = true;
            this.element.classList.add("glass-enhanced");
            LiquidGlassFilter.activeInstances.add(this);
            this.buildWebGLAssets();
            this.renderWebGL();
            return true;
        } catch (error) {
            this.activationBlockedUntil = performance.now() + 1500;
            console.warn("Liquid glass WebGL activation deferred.", error);
            this.suspendEnhancement();
            return false;
        }
    }

    teardownWebGL() {
        if (this.renderCanvas) {
            if (this.contextLostHandler) {
                this.renderCanvas.removeEventListener("webglcontextlost", this.contextLostHandler, false);
            }

            if (this.contextRestoredHandler) {
                this.renderCanvas.removeEventListener("webglcontextrestored", this.contextRestoredHandler, false);
            }

            if (this.renderCanvas.isConnected) {
                this.renderCanvas.remove();
            }
        }

        if (this.gl) {
            try {
                if (this.sourceTexture) {
                    this.gl.deleteTexture(this.sourceTexture);
                }

                if (this.displacementTexture) {
                    this.gl.deleteTexture(this.displacementTexture);
                }

                if (this.specularTexture) {
                    this.gl.deleteTexture(this.specularTexture);
                }

                if (this.positionBuffer) {
                    this.gl.deleteBuffer(this.positionBuffer);
                }

                if (this.texCoordBuffer) {
                    this.gl.deleteBuffer(this.texCoordBuffer);
                }

                if (this.program) {
                    this.gl.deleteProgram(this.program);
                }
            } catch (error) {
                console.warn("Liquid glass WebGL teardown failed.", error);
            }
        }

        this.renderCanvas = null;
        this.gl = null;
        this.program = null;
        this.positionBuffer = null;
        this.texCoordBuffer = null;
        this.sourceTexture = null;
        this.displacementTexture = null;
        this.specularTexture = null;
        this.uniforms = null;
        this.contextLostHandler = null;
        this.contextRestoredHandler = null;
    }

    suspendEnhancement() {
        if (!this.isEnhancementActive) {
            return;
        }

        if (this.buildRaf) {
            window.cancelAnimationFrame(this.buildRaf);
            this.buildRaf = null;
        }

        if (this.renderRaf) {
            window.cancelAnimationFrame(this.renderRaf);
            this.renderRaf = null;
        }

        if (this.temporarySyncRaf) {
            window.cancelAnimationFrame(this.temporarySyncRaf);
            this.temporarySyncRaf = null;
        }

        this.isEnhancementActive = false;
        this.element.classList.remove("glass-enhanced");
        LiquidGlassFilter.activeInstances.delete(this);
        this.teardownWebGL();
    }

    createProgram(vertexShaderSource, fragmentShaderSource) {
        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);
        const program = this.gl.createProgram();

        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);

        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error(this.gl.getProgramInfoLog(program) || "Failed to link WebGL program.");
        }

        return program;
    }

    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            throw new Error(this.gl.getShaderInfoLog(shader) || "Failed to compile WebGL shader.");
        }

        return shader;
    }

    createTexture() {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        return texture;
    }

    updateTexture(texture, source) {
        if (!this.gl || !texture) {
            return;
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, source);
    }

    setupObservers() {
        this.resizeObserver = new ResizeObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.target === this.element) {
                    this.refreshSourceElement();
                    LiquidGlassFilter.scheduleActivationReview();
                    this.scheduleBuild();
                } else {
                    LiquidGlassFilter.scheduleActivationReview();
                    this.scheduleRender();
                }
            });
        });

        this.resizeObserver.observe(this.element);
        if (this.sourceElement) {
            this.resizeObserver.observe(this.sourceElement);
        }

        this.mutationObserver = new MutationObserver(() => {
            this.refreshSourceElement();
            LiquidGlassFilter.scheduleActivationReview();
            this.scheduleRender();
        });

        this.mutationObserver.observe(this.element, {
            attributes: true,
            attributeFilter: ["class", "style", "hidden"]
        });

        if (this.sourceElement instanceof HTMLImageElement) {
            if (this.sourceElement.complete) {
                this.scheduleRender();
            } else {
                this.sourceElement.addEventListener("load", () => this.scheduleRender(), { once: true });
            }
        }
    }

    setupTransitionSync() {
        const startSync = () => {
            LiquidGlassFilter.scheduleActivationReview();
            this.startTemporarySync(this.options.transitionSyncDuration);
        };

        this.element.addEventListener("transitionrun", startSync);
        this.element.addEventListener("transitionstart", startSync);
        this.element.addEventListener("transitionend", () => this.scheduleRender());

        if (this.sourceElement instanceof HTMLImageElement) {
            this.sourceElement.addEventListener("transitionrun", startSync);
            this.sourceElement.addEventListener("transitionstart", startSync);
            this.sourceElement.addEventListener("transitionend", () => this.scheduleRender());
        }

        const productCard = this.element.closest(".product-card");
        if (productCard) {
            productCard.addEventListener("mouseenter", startSync);
            productCard.addEventListener("mouseleave", startSync);
        }
    }

    handleViewportChange() {
        this.refreshSourceElement();
        LiquidGlassFilter.scheduleActivationReview();
        this.scheduleRender();
    }

    startTemporarySync(duration = 700) {
        if (!this.isEnhancementActive) {
            LiquidGlassFilter.scheduleActivationReview();
            return;
        }

        if (this.temporarySyncRaf) {
            window.cancelAnimationFrame(this.temporarySyncRaf);
            this.temporarySyncRaf = null;
        }

        const startedAt = performance.now();

        const tick = (timestamp) => {
            this.renderWebGL();

            if (timestamp - startedAt < duration) {
                this.temporarySyncRaf = window.requestAnimationFrame(tick);
            } else {
                this.temporarySyncRaf = null;
            }
        };

        this.temporarySyncRaf = window.requestAnimationFrame(tick);
    }

    scheduleBuild() {
        if (!this.isEnhancementActive) {
            LiquidGlassFilter.scheduleActivationReview();
            return;
        }

        if (this.buildRaf) {
            return;
        }

        this.buildRaf = window.requestAnimationFrame(() => {
            this.buildRaf = null;
            this.buildWebGLAssets();
            this.renderWebGL();
        });
    }

    scheduleRender() {
        if (!this.isEnhancementActive) {
            LiquidGlassFilter.scheduleActivationReview();
            return;
        }

        if (this.renderRaf) {
            return;
        }

        this.renderRaf = window.requestAnimationFrame(() => {
            this.renderRaf = null;
            this.renderWebGL();
        });
    }

    measureElement() {
        const rect = this.element.getBoundingClientRect();
        return {
            width: Math.max(10, Math.round(rect.width)),
            height: Math.max(10, Math.round(rect.height))
        };
    }

    buildWebGLAssets() {
        if (!this.isEnhancementActive || !this.gl || !this.renderCanvas) {
            return;
        }

        this.refreshSourceElement();

        const { width, height } = this.measureElement();
        if (width <= 10 && height <= 10) {
            return;
        }

        if (this.renderCanvas.width !== width || this.renderCanvas.height !== height) {
            this.renderCanvas.width = width;
            this.renderCanvas.height = height;
            this.captureCanvas.width = width;
            this.captureCanvas.height = height;
        } else {
            this.captureContext.clearRect(0, 0, width, height);
        }

        const precomputed1D = this.calculateDisplacementMap1D();
        const displacementCanvas = this.calculateDisplacementCanvas(width, height, precomputed1D);
        const specularCanvas = this.calculateSpecularCanvas(width, height);

        this.updateTexture(this.displacementTexture, displacementCanvas);
        this.updateTexture(this.specularTexture, specularCanvas);

        this.gl.viewport(0, 0, width, height);
        this.gl.useProgram(this.program);
        this.gl.uniform2f(this.uniforms.resolution, width, height);
        this.gl.uniform1f(this.uniforms.strength, this._maxDisplacement);
        this.gl.uniform1f(this.uniforms.blur, this.options.canvasBlur);
        this.gl.uniform1f(this.uniforms.saturation, this.options.saturate);
        this.gl.uniform1f(this.uniforms.brightness, this.options.brightness);
        this.gl.uniform1f(this.uniforms.contrast, this.options.contrast);
    }

    getSourceDescriptor() {
        this.refreshSourceElement();

        if (!this.sourceElement || !this.sourceElement.isConnected) {
            return null;
        }

        if (this.sourceElement.classList.contains("glass-panel")) {
            return {
                type: "glass",
                element: this.sourceElement
            };
        }

        if (this.sourceElement instanceof HTMLImageElement) {
            return {
                type: "image",
                element: this.sourceElement
            };
        }

        const styles = window.getComputedStyle(this.sourceElement);
        const hasBackgroundImage = styles.backgroundImage && styles.backgroundImage !== "none";
        const hasBackgroundColor = !isTransparentColor(styles.backgroundColor);
        if (hasBackgroundImage || hasBackgroundColor) {
            return {
                type: "background",
                element: this.sourceElement,
                styles
            };
        }

        return null;
    }

    captureSourceToCanvas() {
        if (!this.captureContext) {
            return null;
        }

        const descriptor = this.getSourceDescriptor();
        if (!descriptor) {
            return null;
        }

        const { width, height } = this.measureElement();
        this.captureContext.clearRect(0, 0, width, height);

        if (descriptor.type === "background") {
            return this.drawBackgroundSource(descriptor) ? this.captureCanvas : null;
        }

        if (descriptor.type === "image") {
            return this.drawImageSource(descriptor.element) ? this.captureCanvas : null;
        }

        if (descriptor.type === "glass") {
            return this.drawGlassSource(descriptor.element) ? this.captureCanvas : null;
        }

        return null;
    }

    drawBackgroundSource(descriptor) {
        const sourceRect = descriptor.element.getBoundingClientRect();
        const targetRect = this.element.getBoundingClientRect();
        const backgroundColor = descriptor.styles.backgroundColor;

        if (!isTransparentColor(backgroundColor)) {
            this.captureContext.fillStyle = backgroundColor;
            this.captureContext.fillRect(
                sourceRect.left - targetRect.left,
                sourceRect.top - targetRect.top,
                sourceRect.width,
                sourceRect.height
            );
        }

        const backgroundUrl = LiquidGlassFilter.extractFirstUrl(descriptor.styles.backgroundImage);
        if (!backgroundUrl) {
            return true;
        }

        const image = LiquidGlassFilter.getCachedImage(backgroundUrl, () => this.scheduleRender());
        if (!image) {
            return false;
        }

        const drawRect = LiquidGlassFilter.computeBackgroundDrawRect(descriptor.styles, sourceRect.width, sourceRect.height, image.naturalWidth, image.naturalHeight);

        this.captureContext.drawImage(
            image,
            (sourceRect.left - targetRect.left) + drawRect.x,
            (sourceRect.top - targetRect.top) + drawRect.y,
            drawRect.width,
            drawRect.height
        );

        return true;
    }

    drawImageSource(sourceImage) {
        if (!sourceImage.complete || !sourceImage.naturalWidth) {
            sourceImage.addEventListener("load", () => this.scheduleRender(), { once: true });
            return false;
        }

        const sourceRect = sourceImage.getBoundingClientRect();
        const targetRect = this.element.getBoundingClientRect();
        const styles = window.getComputedStyle(sourceImage);
        const drawRect = LiquidGlassFilter.computeObjectFitDrawRect(
            styles,
            sourceRect.width,
            sourceRect.height,
            sourceImage.naturalWidth,
            sourceImage.naturalHeight
        );
        const left = sourceRect.left - targetRect.left;
        const top = sourceRect.top - targetRect.top;

        this.captureContext.save();
        this.captureContext.beginPath();
        this.captureContext.rect(left, top, sourceRect.width, sourceRect.height);
        this.captureContext.clip();
        this.captureContext.drawImage(
            sourceImage,
            left + drawRect.x,
            top + drawRect.y,
            drawRect.width,
            drawRect.height
        );
        this.captureContext.restore();

        return true;
    }

    drawGlassSource(sourcePanel) {
        const sourceInstance = sourcePanel._liquidGlassInstance;
        if (!sourceInstance || sourceInstance === this) {
            return false;
        }

        const sourceCanvas = sourceInstance.renderCanvas || sourceInstance.captureSourceToCanvas();
        if (!sourceCanvas) {
            return false;
        }

        const sourceRect = sourcePanel.getBoundingClientRect();
        const targetRect = this.element.getBoundingClientRect();

        this.captureContext.drawImage(
            sourceCanvas,
            sourceRect.left - targetRect.left,
            sourceRect.top - targetRect.top,
            sourceRect.width,
            sourceRect.height
        );

        return true;
    }

    renderWebGL() {
        if (this.mode !== "webgl" || !this.isEnhancementActive || !this.gl) {
            return;
        }

        if (typeof this.gl.isContextLost === "function" && this.gl.isContextLost()) {
            this.activationBlockedUntil = performance.now() + 1500;
            this.suspendEnhancement();
            LiquidGlassFilter.scheduleActivationReview();
            return;
        }

        const sourceCanvas = this.captureSourceToCanvas();
        if (!sourceCanvas) {
            return;
        }

        this.updateTexture(this.sourceTexture, sourceCanvas);

        this.gl.useProgram(this.program);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.sourceTexture);
        this.gl.uniform1i(this.uniforms.source, 0);

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.displacementTexture);
        this.gl.uniform1i(this.uniforms.displacement, 1);

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.specularTexture);
        this.gl.uniform1i(this.uniforms.specular, 2);

        this.gl.clearColor(0, 0, 0, 0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    calculateDisplacementMap1D(samples = 128) {
        const eta = 1 / this.options.refractiveIndex;
        const surfaceFn = MathUtils[this.options.surfaceType];

        function refract(normalX, normalY) {
            const dot = normalY;
            const k = 1 - eta * eta * (1 - dot * dot);
            if (k < 0) {
                return null;
            }

            const kSqrt = Math.sqrt(k);
            return [
                -(eta * dot + kSqrt) * normalX,
                eta - (eta * dot + kSqrt) * normalY
            ];
        }

        const result = [];

        for (let i = 0; i < samples; i++) {
            const x = i / samples;
            const y = surfaceFn(x);
            const dx = x < 1 ? 0.0001 : -0.0001;
            const y2 = surfaceFn(Math.max(0, Math.min(1, x + dx)));
            const derivative = (y2 - y) / dx;
            const magnitude = Math.sqrt(derivative * derivative + 1);
            const normal = [-derivative / magnitude, -1 / magnitude];
            const refracted = refract(normal[0], normal[1]);

            if (!refracted) {
                result.push(0);
                continue;
            }

            const remainingHeightOnBezel = y * this.options.bezelWidth;
            const remainingHeight = remainingHeightOnBezel + this.options.glassThickness;
            result.push(refracted[0] * (remainingHeight / refracted[1]));
        }

        return result;
    }

    calculateDisplacementCanvas(width, height, precomputed1D) {
        const imageData = new ImageData(width, height);
        const radius = this.options.edgeRadius;
        const bezelWidth = this.options.bezelWidth;
        const maximumDisplacement = Math.max(...precomputed1D.map(Math.abs)) || 1;
        this._maxDisplacement = maximumDisplacement * this.options.refractionScale || 1;

        for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = 128;
            imageData.data[i + 1] = 128;
            imageData.data[i + 2] = 0;
            imageData.data[i + 3] = 255;
        }

        const r2 = radius * radius;
        const rPlus1Sq = (radius + 1) * (radius + 1);
        const rMinusBezelSq = Math.max(0, (radius - bezelWidth) * (radius - bezelWidth));
        const centerW = width - radius * 2;
        const centerH = height - radius * 2;

        for (let y1 = 0; y1 < height; y1++) {
            for (let x1 = 0; x1 < width; x1++) {
                const idx = (y1 * width + x1) * 4;
                const onLeft = x1 < radius;
                const onRight = x1 >= width - radius;
                const onTop = y1 < radius;
                const onBottom = y1 >= height - radius;
                const x = onLeft ? x1 - radius : (onRight ? x1 - radius - centerW : 0);
                const y = onTop ? y1 - radius : (onBottom ? y1 - radius - centerH : 0);
                const distSq = x * x + y * y;
                const isInBezel = distSq <= rPlus1Sq && distSq >= rMinusBezelSq;

                if (!isInBezel) {
                    continue;
                }

                const distToCenter = Math.sqrt(distSq);
                const opacity = distSq < r2 ? 1 : 1 - (distToCenter - Math.sqrt(r2)) / (Math.sqrt(rPlus1Sq) - Math.sqrt(r2));
                const distFromSide = radius - distToCenter;
                const cos = distToCenter > 0 ? x / distToCenter : 0;
                const sin = distToCenter > 0 ? y / distToCenter : 0;
                const bezelRatio = Math.max(0, Math.min(1, distFromSide / bezelWidth));
                const bezelIdx = Math.floor(bezelRatio * precomputed1D.length);
                const safeIdx = Math.max(0, Math.min(bezelIdx, precomputed1D.length - 1));
                const displacementMag = precomputed1D[safeIdx] || 0;
                const dX = (-cos * displacementMag) / maximumDisplacement;
                const dY = (-sin * displacementMag) / maximumDisplacement;

                imageData.data[idx] = Math.max(0, Math.min(255, 128 + dX * 127 * opacity));
                imageData.data[idx + 1] = Math.max(0, Math.min(255, 128 + dY * 127 * opacity));
                imageData.data[idx + 2] = 0;
                imageData.data[idx + 3] = 255;
            }
        }

        return this.imageDataToCanvas(imageData);
    }

    calculateSpecularCanvas(width, height) {
        const imageData = new ImageData(width, height);
        const radius = this.options.edgeRadius;
        const specularAngle = Math.PI * 1.25;
        const specVec = [Math.cos(specularAngle), Math.sin(specularAngle)];
        const specThickness = 2.0;
        const r2 = radius * radius;
        const rPlus1Sq = (radius + 1) * (radius + 1);
        const rMinusSpecSq = Math.max(0, (radius - specThickness) * (radius - specThickness));
        const centerW = width - radius * 2;
        const centerH = height - radius * 2;

        for (let y1 = 0; y1 < height; y1++) {
            for (let x1 = 0; x1 < width; x1++) {
                const idx = (y1 * width + x1) * 4;
                const onLeft = x1 < radius;
                const onRight = x1 >= width - radius;
                const onTop = y1 < radius;
                const onBottom = y1 >= height - radius;
                const x = onLeft ? x1 - radius : (onRight ? x1 - radius - centerW : 0);
                const y = onTop ? y1 - radius : (onBottom ? y1 - radius - centerH : 0);
                const distSq = x * x + y * y;
                const isNearEdge = distSq <= rPlus1Sq && distSq >= rMinusSpecSq;

                if (!isNearEdge) {
                    continue;
                }

                const distToCenter = Math.sqrt(distSq);
                const distFromSide = radius - distToCenter;
                const opacity = distSq < r2 ? 1 : 1 - (distToCenter - Math.sqrt(r2)) / (Math.sqrt(rPlus1Sq) - Math.sqrt(r2));
                const cos = distToCenter > 0 ? x / distToCenter : 0;
                const sin = distToCenter > 0 ? -y / distToCenter : 0;
                const dot = Math.max(0, cos * specVec[0] + sin * specVec[1]);
                const edgeRatio = Math.max(0, Math.min(1, distFromSide / specThickness));
                const sharpFalloff = Math.sqrt(1 - (1 - edgeRatio) * (1 - edgeRatio));
                const coeff = dot * sharpFalloff;
                const color = Math.min(255, 255 * coeff);
                const finalOpacity = Math.min(255, color * coeff * opacity * this.options.specularOpacity);

                imageData.data[idx] = color;
                imageData.data[idx + 1] = color;
                imageData.data[idx + 2] = color;
                imageData.data[idx + 3] = finalOpacity;
            }
        }

        return this.imageDataToCanvas(imageData);
    }

    imageDataToCanvas(imageData) {
        const canvas = document.createElement("canvas");
        canvas.width = imageData.width;
        canvas.height = imageData.height;

        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("2D canvas context is unavailable.");
        }

        context.putImageData(imageData, 0, 0);
        return canvas;
    }

    disableEnhancement() {
        LiquidGlassFilter.instances.delete(this);
        LiquidGlassFilter.activeInstances.delete(this);

        if (LiquidGlassFilter.visibilityObserver && this.element) {
            LiquidGlassFilter.visibilityObserver.unobserve(this.element);
        }

        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }

        if (this.sourceMutationObserver) {
            this.sourceMutationObserver.disconnect();
        }

        if (this.buildRaf) {
            window.cancelAnimationFrame(this.buildRaf);
        }

        if (this.renderRaf) {
            window.cancelAnimationFrame(this.renderRaf);
        }

        if (this.temporarySyncRaf) {
            window.cancelAnimationFrame(this.temporarySyncRaf);
        }

        this.suspendEnhancement();

        if (this.contentLayer && this.contentLayer.isConnected) {
            const fragment = document.createDocumentFragment();
            while (this.contentLayer.firstChild) {
                fragment.appendChild(this.contentLayer.firstChild);
            }

            this.element.replaceChildren(fragment);
        }

        if (this.element) {
            this.element.classList.remove("glass-enhanced");
            delete this.element._liquidGlassInstance;
        }
    }
}

const GLASS_PRESETS = {
    chrome: {
        surfaceType: "convex_squircle",
        bezelWidth: 18,
        glassThickness: 34,
        refractionScale: 0.72,
        specularOpacity: 0.78,
        canvasBlur: 1.4,
        saturate: 1.12,
        brightness: 1.04,
        contrast: 1.04
    },
    menu: {
        surfaceType: "convex_squircle",
        bezelWidth: 20,
        glassThickness: 40,
        refractionScale: 0.8,
        specularOpacity: 0.82,
        canvasBlur: 1.5,
        saturate: 1.14,
        brightness: 1.05,
        contrast: 1.05
    },
    card: {
        surfaceType: "convex_squircle",
        bezelWidth: 24,
        glassThickness: 48,
        refractionScale: 0.92,
        specularOpacity: 0.72,
        canvasBlur: 2.0,
        saturate: 1.18,
        brightness: 1.06,
        contrast: 1.05
    },
    button: {
        surfaceType: "lip",
        bezelWidth: 12,
        glassThickness: 22,
        refractionScale: 0.56,
        specularOpacity: 0.92,
        canvasBlur: 1.2,
        saturate: 1.12,
        brightness: 1.05,
        contrast: 1.04
    },
    chip: {
        surfaceType: "lip",
        bezelWidth: 10,
        glassThickness: 18,
        refractionScale: 0.5,
        specularOpacity: 0.88,
        canvasBlur: 1.1,
        saturate: 1.1,
        brightness: 1.04,
        contrast: 1.03
    },
    metric: {
        surfaceType: "convex_squircle",
        bezelWidth: 22,
        glassThickness: 44,
        refractionScale: 0.84,
        specularOpacity: 0.7,
        canvasBlur: 1.8,
        saturate: 1.16,
        brightness: 1.04,
        contrast: 1.05
    },
    legal: {
        surfaceType: "convex_squircle",
        bezelWidth: 20,
        glassThickness: 38,
        refractionScale: 0.62,
        specularOpacity: 0.66,
        canvasBlur: 1.25,
        saturate: 1.04,
        brightness: 1.02,
        contrast: 1.02
    }
};

const GLASS_PRESET_RULES = [
    { selector: ".site-header, .footer-main", preset: "chrome" },
    { selector: ".header-lang-dropdown, .nav-menu .sub-menu, .mobile-menu", preset: "menu" },
    { selector: ".header-lang-btn, .mobile-menu-toggle, .btn, .hero-slider-arrow, .fs-nav-btn, .lw-more-btn, .timeline-card__toggle, .fs-dot", preset: "button" },
    { selector: ".hero-badge, .testimonials-nav-dot, .fs-item, .tab-nav button, .btn.btn-audience", preset: "chip" },
    { selector: ".calc-v2__card, .calc-v2__kpi-strip", preset: "metric" },
    { selector: ".legal-body", preset: "legal" }
];

function queryWithin(root, selector) {
    if (!root || !selector) {
        return [];
    }

    const result = [];
    if (root.nodeType === 1 && root.matches(selector)) {
        result.push(root);
    }

    if (typeof root.querySelectorAll === "function") {
        result.push(...root.querySelectorAll(selector));
    }

    return result;
}

function safeNumber(value, fallback) {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function isTransparentColor(value) {
    const normalized = (value || "").trim().toLowerCase();

    if (!normalized || normalized === "transparent" || normalized === "rgba(0, 0, 0, 0)" || normalized === "rgb(0 0 0 / 0)") {
        return true;
    }

    const legacyAlphaMatch = normalized.match(/^rgba\((.+)\)$/);
    if (legacyAlphaMatch) {
        const parts = legacyAlphaMatch[1].split(",").map((part) => part.trim());
        if (parts.length === 4 && parseFloat(parts[3]) === 0) {
            return true;
        }
    }

    const modernAlphaMatch = normalized.match(/\/\s*([0-9.]+)%?\s*\)$/);
    if (modernAlphaMatch) {
        const rawAlpha = modernAlphaMatch[1];
        const alpha = normalized.includes("%)") ? parseFloat(rawAlpha) / 100 : parseFloat(rawAlpha);
        if (alpha === 0) {
            return true;
        }
    }

    return false;
}

function supportsWebGL() {
    try {
        const canvas = document.createElement("canvas");
        return !!(canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
    } catch (error) {
        return false;
    }
}

function getPresetName(element) {
    for (const rule of GLASS_PRESET_RULES) {
        if (element.matches(rule.selector)) {
            return rule.preset;
        }
    }

    return element.classList.contains("glass-button") ? "button" : "card";
}

function computeRadius(element, presetName) {
    const computed = window.getComputedStyle(element);
    const radius = safeNumber(computed.borderTopLeftRadius, 24);

    if (presetName === "button" && radius < 10) {
        return 12;
    }

    if (presetName === "chip" && radius < 10) {
        return 14;
    }

    return Math.max(10, Math.min(42, radius || 24));
}

function getDefaultSource(element) {
    if (element.matches(".site-header")) {
        return ".hero-slide.is-active, .hero, .legal-content, .site-footer";
    }

    if (element.matches(".header-lang-btn, .mobile-menu-toggle")) {
        return ".glass-panel";
    }

    if (element.matches(".header-lang-dropdown, .nav-menu .sub-menu, .mobile-menu")) {
        return ".hero-slide.is-active, .hero, .legal-content, .site-header";
    }

    if (element.matches(".footer-main, .footer-contact .contact-item")) {
        return ".site-footer";
    }

    if (element.matches(".legal-body")) {
        return ".legal-content";
    }

    return ".glass-panel, .hero-slide.is-active, .hero, .slider-section, .content-section, .center-cta, .final-cta-section, .how-it-works, .testimonials, .faq, .site-footer, .legal-content";
}

function getGlassOptions(element) {
    const presetName = getPresetName(element);
    const preset = GLASS_PRESETS[presetName] || GLASS_PRESETS.card;

    return {
        ...preset,
        sourceSelector: element.dataset.glassSource || getDefaultSource(element),
        refractiveIndex: 1.5,
        edgeRadius: computeRadius(element, presetName)
    };
}

function initializeGlassPanels(root = document) {
    if (!supportsWebGL()) {
        return;
    }

    document.documentElement.classList.add("webgl-liquid-glass");

    LiquidGlassFilter.instances.forEach((instance) => {
        instance.refreshSourceElement();
        instance.scheduleRender();
    });

    queryWithin(root, ".glass-panel").forEach((panel) => {
        if (!(panel instanceof HTMLElement)) {
            return;
        }

        if (panel._liquidGlassInstance) {
            panel._liquidGlassInstance.refreshSourceElement();
            panel._liquidGlassInstance.scheduleRender();
            return;
        }

        if (panel.dataset.glassFailed === "true") {
            return;
        }

        try {
            new LiquidGlassFilter(panel, getGlassOptions(panel));
        } catch (error) {
            panel.dataset.glassFailed = "true";
            console.error("Liquid glass initialization failed.", error);
        }
    });

    LiquidGlassFilter.scheduleAllSync();
}

window.LiquidGlassFilter = LiquidGlassFilter;
window.initializeGlassPanels = initializeGlassPanels;

document.addEventListener("DOMContentLoaded", () => {
    initializeGlassPanels(document);
});
