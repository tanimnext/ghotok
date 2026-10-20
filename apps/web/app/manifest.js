/** Web app manifest: lets families add Ghotok to their phone's home screen. */
export default function manifest() {
  return {
    name: 'Ghotok — ঘটক',
    short_name: 'Ghotok',
    description: 'Matchmaking for every faith in Bangladesh',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFF9F5',
    theme_color: '#8E2748',
    lang: 'bn',
    icons: [
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
