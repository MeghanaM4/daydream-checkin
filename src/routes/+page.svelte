<script lang="ts">
  import { t } from '$lib/i18n';
  // If desired later: detect existing check-in cookie and redirect
  // import { onMount } from 'svelte';
  // onMount(() => {
  //   if (document.cookie.includes('checkin_token=')) {
  //     window.location.href = '/checkin';
  //   }
  // });
</script>

<div
  class="min-h-screen flex items-center justify-center px-4"
  style="
    background-image: url('/brush.png'), url('https://daydream.hackclub.com/cloudy-bg-dim.png'), linear-gradient(to bottom, #CCF4FD, #AECDF6);
    background-repeat: repeat,no-repeat, no-repeat;
    background-size: contain, cover, cover;
    background-position: center center, center 20vh, center center;
    background-blend-mode: overlay, normal, normal;
  "
>
  <div class="text-center" style="background:#FEF9DC; border:2px solid #D3B180; padding:20px 24px; max-width:480px; width:100%;">
    <h1 class="text-3xl font-semibold mb-2" style="font-family: 'Daydream New', serif; color: rgb(131, 55, 16);">{t('app.title')}</h1>
    <p class="opacity-90" style="color: rgb(139, 69, 19);">
      {t('home.blurb')}
    </p>
  </div>
</div>

