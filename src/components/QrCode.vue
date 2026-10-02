<template>
  <canvas ref="canvasEl" class="rounded-2xl" />
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import QRCode from 'qrcode'

const props = defineProps<{ value: string; size?: number }>()
const canvasEl = ref<HTMLCanvasElement | null>(null)

async function render() {
  if (!canvasEl.value) return
  await QRCode.toCanvas(canvasEl.value, props.value, {
    width: props.size ?? 260,
    margin: 1,
    color: { dark: '#2E1F17', light: '#FFFFFF' },
  })
}

onMounted(render)
watch(() => props.value, render)
</script>
