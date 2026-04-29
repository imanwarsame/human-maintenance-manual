import { useState, useEffect } from 'react';
import {
  getPushSubscriptionStatus,
  subscribeToPush,
  unsubscribeFromPush,
  type PushSubscriptionStatus,
} from '../lib/pushNotifications.ts';
import { usePlanContext, useUpdatePlanContext } from './usePlanContext.ts';

export function usePushNotifications() {
  const [subStatus, setSubStatus] = useState<'loading' | PushSubscriptionStatus>('loading');

  const { data: enabledData } = usePlanContext<boolean>('reminders_enabled');
  const { data: intervalData } = usePlanContext<number>('reminder_interval_hours');
  const { mutate: updateCtx } = useUpdatePlanContext();

  useEffect(() => {
    getPushSubscriptionStatus().then(setSubStatus);
  }, []);

  async function enable() {
    const ok = await subscribeToPush();
    if (ok) {
      setSubStatus('subscribed');
      updateCtx({ key: 'reminders_enabled', value: true });
    } else {
      const status = await getPushSubscriptionStatus();
      setSubStatus(status);
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
    remindersEnabled: (enabledData?.value as boolean | undefined) ?? false,
    intervalHours: (intervalData?.value as number | undefined) ?? 1,
    enable,
    disable,
    setIntervalHours,
  };
}
