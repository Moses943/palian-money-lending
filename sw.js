// Minimal service worker — enables "Add to Home Screen" installability.
// Not doing offline caching yet to keep data always fresh from Supabase.
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => self.clients.claim());
self.addEventListener("fetch", (e) => {
  // pass-through — no offline cache for now, data must be live/fresh
});
