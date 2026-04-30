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
  const [enableError, setEnableError] = useState<string | null>(null);

  const { data: enabledData } = usePlanContext<boolean>('reminders_enabled');
  const { data: intervalData } = usePlanContext<number>('reminder_interval_hours');
  const { mutate: updateCtx } = useUpdatePlanContext();

  useEffect(() => {
    getPushSubscriptionStatus().then(setSubStatus);
  }, []);

  async function enable() {
    if (isEnabling) return;
    setIsEnabling(true);
    setEnableError(null);
    try {
      if (subStatus === 'subscribed') {
        // Subscription already exists — re-register with backend in case the
        // endpoint wasn't saved, then just flip the preference flag.
        await registerSubscriptionWithBackend();
        updateCtx({ key: 'reminders_enabled', value: true });
        return;
      }
      await subscribeToPush();
      setSubStatus('subscribed');
      updateCtx({ key: 'reminders_enabled', value: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to enable notifications.';
      setEnableError(msg);
      const status = await getPushSubscriptionStatus();
      setSubStatus(status);
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
    enableError,
    remindersEnabled: (enabledData?.value as boolean | undefined) ?? false,
    intervalHours: (intervalData?.value as number | undefined) ?? 1,
    enable,
    disable,
    setIntervalHours,
  };
}
