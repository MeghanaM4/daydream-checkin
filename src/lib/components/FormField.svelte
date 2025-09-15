<script lang="ts">
  export let label: string;
  export let required: boolean = false;
  export let error: string | undefined = undefined;
  export let classes: string = '';
  export let hint: string | undefined = undefined;
</script>

<label class={`flex flex-col gap-1 ${classes}`}>
  <div class="flex items-baseline justify-between">
    <span>{label}{#if required} <span class="text-red-600">*</span>{/if} {#if hint}<span class="opacity-50 ml-1.5">{hint}</span>{/if}</span>
    {#if error}
      <span class="text-red-600 text-xs">{error}</span>
    {/if}
  </div>
  <slot />
</label>
