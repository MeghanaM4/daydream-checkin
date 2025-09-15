<script lang="ts">
  import { onMount } from 'svelte';
  // Configurable options
  let {
    height = 140,
    minRadius = 24,
    maxRadius = 64,
    speedFactor = 0.6,
    spawnVarY = 28,            // vertical variance from bottom
    spawnInterval = 0.7,       // seconds between spawns
    spawnJitter = 0.6,         // added random 0..spawnJitter seconds
    spawnOffsetX = 60,         // how far off the left edge to spawn
    bloom = false              // enable soft glow/bloom
  } = $props();

  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let raf = 0;
  let particles: Array<{ x: number; y: number; r: number; vx: number }> = [];

  let width = 0;
  let h = height;

  function resize() {
    if (!canvas) return;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    width = canvas.clientWidth;
    h = height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnOne() {
    if (!width) return;
    const r = minRadius + Math.random() * Math.max(0, maxRadius - minRadius);
    const yVar = Math.random() * spawnVarY;
    const y = h - r / 2 - yVar; // half visible above bottom edge
    // speed inversely proportional to size (bigger = slower)
    const vx = (22 / r) * speedFactor; // base speed scaled
    const x = -r - (Math.random() * spawnOffsetX);
    particles.push({ x, y, r, vx });
  }

  let last = 0;
  let nextSpawn = 0; // seconds

  function scheduleNextSpawn(nowSec: number) {
    nextSpawn = nowSec + spawnInterval + Math.random() * spawnJitter;
  }

  function frame(t: number) {
    if (!ctx || !canvas) return;
    const nowSec = t / 1000;
    if (!last) {
      last = t;
      // ensure immediate first spawn
      scheduleNextSpawn(nowSec - spawnInterval);
    }
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    // deterministic spawn rate with jitter
    if (nowSec >= nextSpawn) {
      spawnOne();
      scheduleNextSpawn(nowSec);
    }

    ctx.clearRect(0, 0, width, h);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt * 60; // dt normalized to ~px/frame
      // solid white circles (no transparency)
      ctx.fillStyle = '#ffffff';
      if (bloom) {
        ctx.shadowColor = 'rgba(255,255,255,0.85)';
        ctx.shadowBlur = Math.max(8, p.r * 0.4);
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      // reset shadow to avoid leaking state
      ctx.shadowBlur = 0;
      // despawn once fully off the right
      if (p.x - p.r > width) {
        particles.splice(i, 1);
      }
    }

    raf = requestAnimationFrame(frame);
  }

  onMount(() => {
    ctx = canvas?.getContext('2d') || null;
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas) ro.observe(canvas);
    // pre-populate across the canvas using average spacing with per-particle jitter
    let x = -Math.max(spawnOffsetX, maxRadius);
    const limit = (width || 800) + Math.max(spawnOffsetX, maxRadius);
    while (x < limit) {
      const r = minRadius + Math.random() * Math.max(0, maxRadius - minRadius);
      const v = (22 / r) * speedFactor * 60; // pixels per second
      const jitterSec = Math.random() * spawnJitter;
      const step = v * (spawnInterval + jitterSec);
      const yVar = Math.random() * spawnVarY;
      const y = h - r / 2 - yVar; // half visible above bottom
      particles.push({ x: Math.max(0, x + Math.random() * 10), y, r, vx: v / 60 });
      x += Math.max(20, step);
    }
    raf = requestAnimationFrame(frame);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  });
</script>

<div
class="pointer-events-none absolute bottom-0 left-0 w-[100vw] -z-1 m-0"
  style={`height:${height}px; margin-left: calc(50% - 50vw);`}
>
  <canvas bind:this={canvas} class="w-full h-full block"></canvas>
  <div class="bg-white absolute w-full h-[20px] left-0 bottom-0"></div>
</div>

<style>
  :global(canvas) {
    image-rendering: auto;
  }
  :global(body) {
    position: relative;
    z-index: -2;
  }
</style>
