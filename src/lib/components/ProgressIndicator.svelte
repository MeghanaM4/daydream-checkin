<script lang="ts">
  let { steps = [], current = '' } = $props();
</script>

<nav class="w-full py-4">
  <ol class="flex flex-wrap gap-2">
    {#each steps as step}
      <li class="flex items-center gap-2">
        <div class="w-7 h-7 rounded-full flex items-center justify-center border border-[color:var(--color-border-tan)]" class:bg-[color:var(--color-moonbeam-ice)]={current===step.key} class:bg-[color:var(--color-turtle-turquoise)]={step.complete && current!==step.key}>
          <span class="text-sm text-[color:var(--color-dark-blue)]">{steps.indexOf(step)+1}</span>
        </div>
        <span class="text-sm text-[color:var(--color-dark-blue)]">{step.label}</span>
      </li>
    {/each}
  </ol>
</nav>
