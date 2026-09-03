<template>
  <!-- @ant-design/icons-vue ships no sun/moon pair, so the theme switcher
       carries its own to keep the light/dark iconography it was designed with. -->
  <svg
    aria-hidden="true"
    fill="currentColor"
    focusable="false"
    height="1em"
    viewBox="0 0 24 24"
    width="1em"
  >
    <circle cx="12" cy="12" r="4.2" />
    <g stroke="currentColor" stroke-linecap="round" stroke-width="1.9">
      <path d="M12 2.4v2.3M12 19.3v2.3M2.4 12h2.3M19.3 12h2.3" />
      <path d="M5.2 5.2l1.6 1.6M17.2 17.2l1.6 1.6M18.8 5.2l-1.6 1.6M6.8 17.2l-1.6 1.6" />
    </g>
  </svg>
</template>
