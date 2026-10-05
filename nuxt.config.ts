import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  devServer: { port: 4979 },

  // @wervt/nuxt is linked from ../wervt until it's on npm: use this app's drizzle-orm
  // everywhere, so schema types and runtime match.
  alias: { 'drizzle-orm': fileURLToPath(new URL('./node_modules/drizzle-orm', import.meta.url)) },

  modules: ['@wervt/nuxt', '@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      title: 'Bingosync',
      meta: [
        { name: 'description', content: "Bingosync is a tool for speedrunners that lets you collaboratively view and edit 'bingo boards' during speedrun races." },
        { name: 'keywords', content: 'bingo sync, bingosync, zelda bingo, ocarina of time bingo, speedrunning' },
        { name: 'viewport', content: 'width=device-width, minimum-scale=.85, initial-scale=1.0, maximum-scale=1.0, user-scalable=0' }
      ],
      link: [{ rel: 'shortcut icon', href: '/favicon.png' }]
    }
  },

  colorMode: { preference: 'dark', fallback: 'dark', storageKey: 'bingosync-color-mode' },

  runtimeConfig: {
    // Comma-separated wervt emails that may open /admin (NUXT_ADMIN_EMAILS).
    adminEmails: ''
  },

  nitro: {
    imports: { dirs: ['server/utils'] },
    // The community generators are bundled with the server and loaded on demand.
    serverAssets: [{ baseName: 'generators', dir: '../generators' }]
  }
})
