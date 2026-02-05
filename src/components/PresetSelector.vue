<template>
    <div class="preset-container">
        <div class="preset-label">PRESETS</div>
        <div class="preset-list">
            <div v-for="(img, index) in presets" :key="index" class="preset-item" @click="$emit('select', img.src)">
                <img :src="img.src" :alt="img.name" />
                <div class="hover-overlay"></div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import img1 from '@/assets/example1.jpg';
import img2 from '@/assets/example2.jpg';
import img3 from '@/assets/example3.jpg';

const presets = ref([
    { name: 'Demo 1', src: img1 },
    { name: 'Demo 2', src: img2 },
    { name: 'Demo 3', src: img3 },
]);

defineEmits(['select']);
</script>

<style scoped>
.preset-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
}

.preset-label {
    font-size: 10px;
    letter-spacing: 2px;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 600;
    text-transform: uppercase;
}

.preset-list {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 5px;
    scrollbar-width: none;
}

.preset-list::-webkit-scrollbar {
    display: none;
}

.preset-item {
    width: 60px;
    height: 60px;
    border-radius: 12px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
    flex-shrink: 0;
}

.preset-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.preset-item:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.5);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.hover-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.1);
    opacity: 0;
    transition: opacity 0.3s;
}

.preset-item:hover .hover-overlay {
    opacity: 1;
}
</style>