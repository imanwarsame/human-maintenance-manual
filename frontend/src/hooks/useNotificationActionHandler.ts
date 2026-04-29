import { useEffect, useRef } from 'react';
import { useLogWater } from './useToday.ts';

export function useNotificationActionHandler() {
  const { mutate: logWater } = useLogWater();
  const handled = useRef(false);

  // Handle ?log=NNN from notification click → auto-log water
  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const log = params.get('log');
    if (log) {
      const ml = parseInt(log, 10);
      if (ml > 0) {
        const today = new Date().toISOString().slice(0, 10);
        logWater({ amount_ml: ml, date: today });
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [logWater]);

  // Handle NAVIGATE messages from the service worker (already-open window)
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    function onMessage(event: MessageEvent) {
      if (event.data?.type === 'NAVIGATE' && typeof event.data.url === 'string') {
        window.location.href = event.data.url as string;
      }
    }

    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);
}
