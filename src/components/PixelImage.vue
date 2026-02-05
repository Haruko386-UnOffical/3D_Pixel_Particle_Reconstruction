<template>
    <div class="scene-container">
        <canvas ref="canvasRef" class="webgl-canvas"></canvas>

        <div class="ui-panel">
            <div class="panel-header">
                <h1>3D POINT<br />CLOUD</h1>
                <div class="status-indicator">
                    <span class="dot" :class="{ active: hasDepth }"></span>
                    {{ hasDepth ? '3D MODE' : '2D MODE' }}
                </div>
            </div>

            <!-- <div class="divider"></div>

            <PresetSelector @select="handlePresetSelect" /> -->

            <div class="divider"></div>

            <div class="controls-group">
                <div class="control-item">
                    <label class="label-text">TEXTURE (RGB)</label>
                    <input type="file" id="fileInput" accept="image/*" @change="handleFileUpload" />
                    <label for="fileInput" class="upload-btn main-btn">
                        <span class="icon">image</span>
                        <span v-if="loading">PROCESSING...</span>
                        <span v-else>UPLOAD IMAGE</span>
                    </label>
                </div>

                <div class="control-item">
                    <div class="label-row">
                        <label class="label-text">DEPTH MAP</label>
                        <span v-if="hasDepth" class="badge">ACTIVE</span>
                    </div>
                    <input type="file" id="depthInput" accept="image/*" @change="handleDepthUpload" />
                    <label for="depthInput" class="upload-btn sub-btn" :class="{ 'has-file': hasDepth }">
                        <span class="icon">layers</span>
                        <span>{{ hasDepth ? 'REPLACE DEPTH' : 'UPLOAD DEPTH' }}</span>
                    </label>

                    <div v-if="hasDepth" class="depth-tools">
                        <div class="tool-btn" @click.stop="toggleDepthInvert" :class="{ active: invertDepth }"
                            title="Invert Depth">
                            <span class="icon small">flip_camera_android</span>
                            <span class="tool-text">REV</span>
                        </div>
                        <div class="tool-btn remove" @click.stop="clearDepth" title="Remove Depth">
                            <span class="icon small">close</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="divider"></div>

            <div class="controls-group">
                <label class="label-text">EFFECTS</label>
                <div class="action-btn" :class="{ 'active': isExploded }" @click="toggleExplosion">
                    <span class="icon">{{ isExploded ? 'blur_off' : 'blur_on' }}</span>
                    <span>{{ isExploded ? 'ASSEMBLE PARTICLES' : 'EXPLODE PARTICLES' }}</span>
                </div>
            </div>

            <p class="hint">LEFT CLICK: ROTATE | RIGHT CLICK: PAN | SCROLL: ZOOM</p>
        </div>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { loadGifFrames } from '../utils/gifLoader';
import PresetSelector from './PresetSelector.vue';
import defaultImg from '@/assets/example.png';

const vertexShader = `
  uniform float uTime;
  uniform vec2 uTextureSize;
  uniform float uThick;
  uniform sampler2D uDepthTexture;
  uniform float uHasDepth;
  uniform float uDepthScale;
  uniform float uInvertDepth;
  
  attribute vec2 offset;
  varying vec2 vuv;
  varying float vDepth;

  // Simplex Noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ; m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    float width = uTextureSize.x;
    float height = uTextureSize.y;
    vec2 cellSize = vec2(1.0 / width, 1.0 / height);
    vuv = (uv + vec2(offset.x, height - offset.y)) * cellSize;

    float x = offset.x - width * 0.5;
    float y = height * 0.5 - offset.y;
    float z = 0.0;

    if (uHasDepth > 0.5) {
        // 3D 模式
        float depthVal = texture2D(uDepthTexture, vuv).r;
        vDepth = depthVal;
        
        float finalDepth = 0.0;
        if (uInvertDepth > 0.5) {
            finalDepth = depthVal; 
        } else {
            finalDepth = 1.0 - depthVal;
        }

        z = finalDepth * uDepthScale - (uDepthScale * 0.5);
        
        float noise = snoise(offset + abs(sin(uTime * 0.0001)) * 0.5);
        z += noise * uThick * 10.0;
    } else {
        // 2D 模式
        vDepth = 0.0;
        vec2 dist1 = offset - vec2(width * 0.25, height * 0.25);
        vec2 dist2 = offset - vec2(width * 0.25, height * 0.75);
        vec2 dist3 = offset - vec2(width * 0.75, height * 0.25);
        vec2 dist4 = offset - vec2(width * 0.75, height * 0.75);
        vec2 dist = dist1 + dist2 + dist3 + dist4;
        
        float noise = snoise(offset + abs(sin(uTime * 0.0001)) * 0.5);
        z = noise * uThick * dot(dist, dist) * 0.00003;
    }

    vec3 newPosition = vec3(x, y, z);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition + vec3(position.xy, 0.0), 1.0);
  }
`;

const fragmentShader = `
  precision highp float;
  uniform sampler2D uTexture;
  varying vec2 vuv;
  varying float vDepth;
  void main() {
    vec4 color = texture2D(uTexture, vuv);
    if (color.a < 0.1) discard;
    gl_FragColor = color;
  }
`;

const canvasRef = ref(null);
const loading = ref(false);
const hasDepth = ref(false);
const isExploded = ref(false);
const invertDepth = ref(false); // 是否反转深度
const currentDepthTex = ref(null);

let renderer, scene, camera, controls, particlesMesh, animationId;
let gifState = { isGif: false, frames: [], currentFrameIndex: 0, lastFrameTime: 0, ctx: null, texture: null };

const state = {
    thick: 0,
    targetThick: 0,
    depthScale: 300,
};

const toggleExplosion = () => {
    isExploded.value = !isExploded.value;
    state.targetThick = isExploded.value ? 30 : 0;
};

const toggleDepthInvert = () => {
    invertDepth.value = !invertDepth.value;
    if (particlesMesh) {
        particlesMesh.material.uniforms.uInvertDepth.value = invertDepth.value ? 1.0 : 0.0;
    }
};

const initScene = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);

    camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 5000);
    camera.position.set(0, 0, 600);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
};

const createParticles = (width, height, texture) => {
    if (particlesMesh) {
        scene.remove(particlesMesh);
        particlesMesh.geometry.dispose();
        particlesMesh.material.dispose();
    }

    const geometry = new THREE.InstancedBufferGeometry();
    const positions = new Float32Array([-0.5, 0.5, 0.0, 0.5, 0.5, 0.0, -0.5, -0.5, 0.0, 0.5, -0.5, 0.0]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const uvs = new Float32Array([0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0]);
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array([0, 2, 1, 2, 3, 1]), 1));

    const totalParticles = width * height;
    const offsets = new Float32Array(totalParticles * 2);
    for (let i = 0; i < totalParticles; i++) {
        offsets[i * 2 + 0] = i % width;
        offsets[i * 2 + 1] = Math.floor(i / width);
    }
    geometry.setAttribute('offset', new THREE.InstancedBufferAttribute(offsets, 2));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTexture: { value: texture },
            uTextureSize: { value: new THREE.Vector2(width, height) },
            uTime: { value: 0 },
            uThick: { value: state.thick },
            uDepthTexture: { value: currentDepthTex.value || new THREE.Texture() },
            uHasDepth: { value: hasDepth.value ? 1.0 : 0.0 },
            uDepthScale: { value: state.depthScale },
            uInvertDepth: { value: invertDepth.value ? 1.0 : 0.0 } // 注入反转状态
        },
        vertexShader,
        fragmentShader,
        side: THREE.DoubleSide,
        transparent: true
    });

    particlesMesh = new THREE.Mesh(geometry, material);
    scene.add(particlesMesh);

    const maxDim = Math.max(width, height);
    controls.minDistance = 100;
    controls.maxDistance = maxDim * 4;

    if (hasDepth.value) {
        camera.position.set(maxDim * 0.5, maxDim * 0.2, maxDim * 1.2);
    } else {
        camera.position.set(0, 0, maxDim * 1.5);
    }
    controls.target.set(0, 0, 0);
    controls.update();
};

const processImage = (src, isGif = false, file = null) => {
    loading.value = true;
    isExploded.value = false;
    state.targetThick = 0;
    state.thick = 0;

    if (!isGif) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = src;
        img.onload = () => {
            const MAX_WIDTH = 500;
            const scale = Math.min(1, MAX_WIDTH / img.width);
            const w = Math.floor(img.width * scale);
            const h = Math.floor(img.height * scale);

            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = w; tempCanvas.height = h;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);

            const texture = new THREE.CanvasTexture(tempCanvas);
            texture.minFilter = THREE.NearestFilter;
            texture.magFilter = THREE.NearestFilter;

            gifState.isGif = false;
            createParticles(w, h, texture);
            loading.value = false;
        };
    } else {
        loadGifFrames(file).then(({ frames, width, height }) => {
            loading.value = false;
        });
    }
};

const handleDepthUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        new THREE.TextureLoader().load(e.target.result, (tex) => {
            tex.minFilter = THREE.NearestFilter;
            tex.magFilter = THREE.NearestFilter;
            currentDepthTex.value = tex;
            hasDepth.value = true;
            isExploded.value = false;
            state.targetThick = 0;
            invertDepth.value = false; // 重置反转状态

            if (particlesMesh) {
                particlesMesh.material.uniforms.uDepthTexture.value = tex;
                particlesMesh.material.uniforms.uHasDepth.value = 1.0;
                particlesMesh.material.uniforms.uInvertDepth.value = 0.0;
                camera.position.x = 200; camera.position.y = 100;
                controls.update();
            }
        });
    };
    reader.readAsDataURL(file);
};

const clearDepth = () => {
    hasDepth.value = false;
    currentDepthTex.value = null;
    invertDepth.value = false;
    if (particlesMesh) {
        particlesMesh.material.uniforms.uHasDepth.value = 0.0;
        camera.position.set(0, 0, 600);
        controls.update();
    }
};

const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.type === 'image/gif') {
        processImage(null, true, file);
    } else {
        const reader = new FileReader();
        reader.onload = (e) => processImage(e.target.result);
        reader.readAsDataURL(file);
    }
};
const handlePresetSelect = (src) => processImage(src);

const animate = () => {
    animationId = requestAnimationFrame(animate);
    controls.update();
    state.thick += (state.targetThick - state.thick) * 0.05;
    if (particlesMesh) {
        particlesMesh.material.uniforms.uTime.value += 1.0;
        particlesMesh.material.uniforms.uThick.value = state.thick;
    }
    renderer.render(scene, camera);
};

const onResize = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
};

onMounted(() => {
    initScene();
    window.addEventListener('resize', onResize);
    processImage(defaultImg);
    animate();
});

onUnmounted(() => {
    window.removeEventListener('resize', onResize);
    cancelAnimationFrame(animationId);
    if (renderer) renderer.dispose();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Material+Icons&display=swap');

.scene-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #050505;
    font-family: 'Inter', sans-serif;
    overflow: hidden;
}

.webgl-canvas {
    display: block;
    width: 100%;
    height: 100%;
    outline: none;
}

.ui-panel {
    position: absolute;
    bottom: 40px;
    left: 40px;
    width: 340px;
    background: rgba(20, 20, 20, 0.7);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    z-index: 10;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    color: white;
    pointer-events: auto;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.panel-header h1 {
    font-size: 24px;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, #fff, #aaa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1;
}

.status-indicator {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 4px 8px;
    border-radius: 20px;
}

.dot {
    width: 6px;
    height: 6px;
    background: #444;
    border-radius: 50%;
    transition: all 0.3s;
}

.dot.active {
    background: #00ff88;
    box-shadow: 0 0 8px #00ff88;
}

.divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    width: 100%;
}

.controls-group {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

.control-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
}

.label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.label-text {
    font-size: 9px;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 700;
    letter-spacing: 1px;
}

.badge {
    font-size: 8px;
    background: #00ff88;
    color: #000;
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 800;
}

input[type="file"] {
    display: none;
}

.upload-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    font-weight: 600;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    box-sizing: border-box;
}

.main-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
}

.main-btn:hover {
    background: rgba(255, 255, 255, 0.2);
}

.sub-btn {
    background: transparent;
    border: 1px dashed rgba(255, 255, 255, 0.2);
    color: rgba(255, 255, 255, 0.6);
}

.sub-btn:hover {
    border-color: rgba(255, 255, 255, 0.5);
    color: white;
}

.sub-btn.has-file {
    border-style: solid;
    border-color: #00ff88;
    color: #00ff88;
    background: rgba(0, 255, 136, 0.05);
}

.depth-tools {
    position: absolute;
    right: 0;
    top: 28px;
    display: flex;
    gap: 8px;
}

.tool-btn {
    width: 28px;
    height: 28px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.tool-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
}

.tool-btn.active {
    background: #6e8efb;
    color: white;
    border-color: #6e8efb;
}

.tool-btn.remove {
    background: rgba(255, 0, 0, 0.15);
    border-color: rgba(255, 0, 0, 0.2);
}

.tool-btn.remove:hover {
    background: rgba(255, 0, 0, 0.4);
}

.tool-text {
    font-size: 8px;
    font-weight: 800;
}

.action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 14px;
    border-radius: 12px;
    background: rgba(110, 142, 251, 0.1);
    border: 1px solid rgba(110, 142, 251, 0.3);
    color: #a7bfe8;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.action-btn:hover {
    background: rgba(110, 142, 251, 0.2);
    border-color: #6e8efb;
    color: white;
    box-shadow: 0 0 15px rgba(110, 142, 251, 0.3);
}

.action-btn.active {
    background: #6e8efb;
    border-color: #6e8efb;
    color: #fff;
    box-shadow: 0 0 20px rgba(110, 142, 251, 0.5);
}

.icon {
    font-family: 'Material Icons';
    font-size: 16px;
}

.icon.small {
    font-size: 14px;
}

.hint {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.3);
    text-align: center;
    margin-top: 5px;
    letter-spacing: 1px;
}
</style>
