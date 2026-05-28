// Actualiza el badge del ícono de la app con el conteo enviado en el payload.
// "badge_count" debe incluirse en los Additional Data de la notificación OneSignal.
self.addEventListener('push', (event) => {
  if (!('setAppBadge' in self.navigator)) return;
  try {
    const data = event.data?.json();
    const count = data?.custom?.a?.badge_count; // OneSignal guarda Additional Data en custom.a
    if (typeof count === 'number') {
      event.waitUntil(self.navigator.setAppBadge(count));
    }
  } catch (_) {}
});

importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
