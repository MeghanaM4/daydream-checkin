<script lang="ts">
  let { variant = 'primary', type = 'button', disabled = false, onclick } = $props();
</script>

<button
  type={type as any}
  disabled={disabled}
  onclick={onclick}
  class={
    (disabled ? 'opacity-50 cursor-not-allowed pointer-events-none ' : 'cursor-pointer ') +
    'inline-flex items-center justify-center rounded-md px-3 py-2 ' +
    (variant === 'primary'
      ? 'bg-[color:var(--color-button-pink)] text-white'
      : 'border border-[color:var(--color-border-tan)] text-[color:var(--color-dark-blue)] bg-white/70')
  }
>
  <slot />
</button>
