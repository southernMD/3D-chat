<template>
  <div ref="particleContainer" class="particle-container">
    <canvas ref="canvas" class="particle-canvas"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue'

const particleContainer = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  life: number
  maxLife: number
}

let ctx: CanvasRenderingContext2D | null = null
let particles: Particle[] = []
let animationId: number
let width = 0
let height = 0

const colors = [
  'rgba(0, 255, 255, ',
  'rgba(255, 0, 255, ',
  'rgba(255, 255, 0, ',
  'rgba(255, 255, 255, '
]

onMounted(() => {
  initCanvas()
  createParticles()
  animate()
  
  window.addEventListener('resize', handleResize)
  window.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('mousemove', handleMouseMove)
})

const initCanvas = () => {
  if (!canvas.value) return
  
  ctx = canvas.value.getContext('2d')
  if (!ctx) return
  
  handleResize()
}

const handleResize = () => {
  if (!canvas.value) return
  
  width = window.innerWidth
  height = window.innerHeight
  canvas.value.width = width
  canvas.value.height = height
}

const createParticles = () => {
  particles = []
  const particleCount = Math.min(100, Math.floor((width * height) / 10000))
  
  for (let i = 0; i < particleCount; i++) {
    particles.push(createParticle())
  }
}

const createParticle = (): Particle => {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    size: Math.random() * 2 + 1,
    opacity: Math.random() * 0.5 + 0.1,
    color: colors[Math.floor(Math.random() * colors.length)],
    life: 0,
    maxLife: Math.random() * 300 + 200
  }
}

const updateParticle = (particle: Particle) => {
  particle.x += particle.vx
  particle.y += particle.vy
  particle.life++
  
  // 边界检查
  if (particle.x < 0 || particle.x > width) particle.vx *= -1
  if (particle.y < 0 || particle.y > height) particle.vy *= -1
  
  // 生命周期管理
  if (particle.life > particle.maxLife) {
    Object.assign(particle, createParticle())
  }
  
  // 透明度变化
  const lifeRatio = particle.life / particle.maxLife
  particle.opacity = Math.sin(lifeRatio * Math.PI) * 0.5 + 0.1
}

const drawParticle = (particle: Particle) => {
  if (!ctx) return
  
  ctx.save()
  ctx.globalAlpha = particle.opacity
  ctx.fillStyle = particle.color + particle.opacity + ')'
  ctx.beginPath()
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const drawConnections = () => {
  if (!ctx) return
  
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x
      const dy = particles[i].y - particles[j].y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < 100) {
        const opacity = (100 - distance) / 100 * 0.1
        ctx.save()
        ctx.globalAlpha = opacity
        ctx.strokeStyle = `rgba(0, 255, 255, ${opacity})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(particles[i].x, particles[i].y)
        ctx.lineTo(particles[j].x, particles[j].y)
        ctx.stroke()
        ctx.restore()
      }
    }
  }
}

const animate = () => {
  if (!ctx) return
  
  ctx.clearRect(0, 0, width, height)
  
  particles.forEach(particle => {
    updateParticle(particle)
    drawParticle(particle)
  })
  
  drawConnections()
  
  animationId = requestAnimationFrame(animate)
}

const handleMouseMove = (e: MouseEvent) => {
  const mouseX = e.clientX
  const mouseY = e.clientY
  
  particles.forEach(particle => {
    const dx = mouseX - particle.x
    const dy = mouseY - particle.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < 150) {
      const force = (150 - distance) / 150
      particle.vx += (dx / distance) * force * 0.01
      particle.vy += (dy / distance) * force * 0.01
    }
  })
}
</script>

<style scoped>
.particle-container {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 0;
}

.particle-canvas {
  width: 100%;
  height: 100%;
}
</style>
