import { useState, useEffect } from 'react';
import {
  getPushSubscriptionStatus,
  subscribeToPush,
  registerSubscriptionWithBackend,
  unsubscribeFromPush,
  type PushSubscriptionStatus,
} from '../lib/pushNotifications.ts';
import { usePlanContext, useUpdatePlanContext } from './usePlanContext.ts';

export function usePushNotifications() {
  const [subStatus, setSubStatus] = useState<'loading' | PushSubscriptionStatus>('loading');
  const [isEnabling, setIsEnabling] = useState(false);

  const { data: enabledData } = usePlanContext<boolean>('reminders_enabled');
  const { data: intervalData } = usePlanContext<number>('reminder_interval_hours');
  const { mutate: updateCtx } = useUpdatePlanContext();

  useEffect(() => {
    getPushSubscriptionStatus().then(setSubStatus);
  }, []);

  async function enable() {
    if (isEnabling) return;
    setIsEnabling(true);
    try {
      if (subStatus === 'subscribed') {
        // Subscription exists — re-register with backend in case it wasn't saved,
        // then just flip the preference flag without touching the push manager.
        await registerSubscriptionWithBackend();
        updateCtx({ key: 'reminders_enabled', value: true });
        return;
      }
      const ok = await subscribeToPush();
      if (ok) {
        setSubStatus('subscribed');
        updateCtx({ key: 'reminders_enabled', value: true });
      } else {
        const status = await getPushSubscriptionStatus();
        setSubStatus(status);
      }
    } finally {
      setIsEnabling(false);
    }
  }

  async function disable() {
    await unsubscribeFromPush();
    setSubStatus('default');
    updateCtx({ key: 'reminders_enabled', value: false });
  }

  function setIntervalHours(hours: number) {
    updateCtx({ key: 'reminder_interval_hours', value: hours });
  }

  return {
    subStatus,
    isEnabling,
    remindersEnabled: (enabledData?.value as boolean | undefined) ?? false,
    intervalHours: (intervalData?.value as number | undefined) ?? 1,
    enable,
    disable,
    setIntervalHours,
  };
}
