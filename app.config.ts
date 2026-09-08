export default defineAppConfig({
  ui: {
    colors: { primary: 'neutral', neutral: 'zinc' },
    button: { slots: { base: 'font-medium' } },
    card: { slots: { root: 'bg-default/60 ring-default/80 backdrop-blur-sm', header: 'py-3', body: 'p-4 sm:p-4' } }
  }
})
