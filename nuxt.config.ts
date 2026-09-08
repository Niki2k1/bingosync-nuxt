export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  devServer: { port: 4979 },

  modules: ['@nuxt/ui', 'nuxt-auth-utils'],

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
    databasePath: '.data/bingosync.db',
    migrationsDir: 'server/db/migrations',
    generatorsDir: 'generators',
    adminPassword: '',
    generatorTimeoutMs: 10000,
    session: { maxAge: 60 * 60 * 24 * 365 },
    oauth: { twitch: { clientId: '', clientSecret: '' } }
  },

  nitro: {
    experimental: { websocket: true },
    imports: { dirs: ['server/utils'] }
  }
})
