<script lang="ts">
  let { title = '', description = '', children } = $props();
</script>

<section class="bg-white/70 rounded-xl border border-[color:var(--color-border-tan)] p-5 shadow-sm">
  <header class="mb-4">
    <h2 class="text-2xl font-semibold">{title}</h2>
    {#if description}
      <p class="opacity-80 mt-1">{description}</p>
    {/if}
  </header>
  <div class="space-y-4">
    {@render children?.()}
  </div>
</section>
