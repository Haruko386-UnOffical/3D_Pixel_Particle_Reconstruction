# 🌌 3D Pixel Particle Reconstruction (Vue 3 + Three.js)

[English](./README_EN.md) | [中文](./README.md)

A high-performance WebGL particle experiment project based on **Vue 3** and **Three.js**.
This project converts ordinary RGB images into tens of thousands of 3D particles, and supports **Depth Map** based reconstruction to generate 2.5D / 3D relief-like models, simulating point cloud scanning effects.

<table>
  <tr>
    <td>
      <img src="public/image.png" width="100%">
    </td>
    <td>
      <img src="public/depth_colored.png" width="100%">
    </td>
  </tr>
  <tr>
    <td>
      <img src="public/depth.png" width="100%">
    </td>
    <td>
      <img src="public/demo.gif" width="100%">
    </td>
  </tr>
</table>


----

<table>
  <tr>
    <td style="vertical-align: middle;"
      <a><img src="./public/nemupan.jpg" width="36"></a>
    </td>
    <td style="vertical-align: middle;">
      <b>Image Author: </b>
      <a href="https://www.nemupan.com" target="_blank" style="color:#f2a3b3">
        nemupan
      </a>
    </td>
    <td style="vertical-align: middle;"
      <a><img src="https://avatars.githubusercontent.com/u/140301008?v=4" width="36"></a>
    </td>
    <td style="vertical-align: middle;">
      <b>Depth Estimation Model: </b>
      <a href="https://github.com/Haruko386/ApDepth" target="_blank" style="color:#f2a3b3">
        ApDepth
      </a>
    </td>
    </tr>
</table>


## ✨ Core Features

* **🖼️ Image to Particles**
  Upload any RGB image (JPG/PNG) and generate a pixel-based particle matrix.

* **🧊 Depth Reconstruction**
  Upload a single-channel depth map and reconstruct a real-time 3D point cloud using grayscale depth values.

* **🎞️ GIF Support**
  Built-in GIF parser. Upload animated GIFs and particles will update colors frame by frame in real time.

---

## 🛠️ Tech Stack

* **Frontend Framework**: Vue 3 (Composition API)
* **3D Engine**: Three.js
* **Build Tool**: Vite
* **Shader Language**: GLSL (Vertex & Fragment Shaders)
* **Utilities**: gifuct-js (GIF parsing)

---

## 🚀 Quick Start

### 1. Requirements

* Node.js > 22.0
* npm or yarn

### 2. Install Dependencies

```bash
git clone https://github.com/Haruko386-UnOffical/3D_Pixel_Particle_Reconstruction.git
cd 3D_Pixel_Particle_Reconstruction
npm install
```

### 3. Run Dev Server

```bash
npm run dev
```

Open in browser:

```
http://localhost:5173
```

---

## 📖 Usage Guide

### Basic Controls

1. **Upload Image**
   Click **`UPLOAD IMAGE`** and select a normal RGB image.

2. **Camera Controls**

   * **Left Drag**: Rotate
   * **Right Drag**: Pan
   * **Mouse Wheel**: Zoom

---

### 3D Depth Mode

To enable real depth-based 3D reconstruction, you need:

* One RGB image
* One corresponding depth map

Steps:

1. Upload the **RGB image**.
2. Click **`UPLOAD DEPTH`** and upload the depth map (must be single-channel).
3. When loaded, UI will show `3D MODE`, and particles will be lifted according to depth.

---

### Effects

* **`EXPLODE PARTICLES`**
  Scatter particles using noise-based animation.

* **`ASSEMBLE PARTICLES`**
  Restore particles into compact image / model form.

---

## 🧩 Project Structure

```
src/
├── assets/                 # Static resources (default demo images)
├── components/
│   ├── PixelImage.vue      # [Core] Main Three.js scene (shaders, logic, UI)
│   └── PresetSelector.vue  # Preset image selector
├── utils/
│   └── gifLoader.js        # GIF parsing and frame processing
├── App.vue                 # Root component
└── main.js                 # Entry point
```

---

## 🧠 Core Principle (Shader Logic)

The core of this project lies in a custom **Vertex Shader**.
Instead of moving a mesh, it directly moves **tens of thousands of vertices**.

```glsl
// Pseudocode logic
void main() {
    // 1. Base coordinates
    float x = offset.x - width * 0.5;
    float y = height * 0.5 - offset.y;
    
    float z = 0.0;

    // 2. If depth map exists
    if (uHasDepth > 0.5) {
        // Read depth value
        float depthVal = texture2D(uDepthTexture, vuv).r;
        // Map to Z axis: black -> high, white -> low
        z = (1.0 - depthVal) * uDepthScale;
    } else {
        // 3. Without depth, apply noise explosion
        float noise = snoise(offset + uTime);
        z = noise * uThick;
    }

    // 4. Final position
    gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, z, 1.0);
}
```

---

## 🤝 Contribution

If you have better shader ideas or optimization strategies, feel free to submit an **Issue** or **Pull Request**.

---

## 📄 License

> [!CAUTION]
>
> This project is licensed under the MIT License © 2026 Dimon0000000

---