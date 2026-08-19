import { useState } from 'react';
import { usePushNotifications } from '../hooks/usePushNotifications.ts';
import { usePlanContext, useUpdatePlanContext } from '../hooks/usePlanContext.ts';
import { isDemoMode, setDemoMode } from '../demo/mode.ts';

const INTERVAL_OPTIONS = [
  { label: '30 min', value: 0.5 },
  { label: '1 hour', value: 1 },
  { label: '2 hours', value: 2 },
];

const isIosBrowser =
  typeof navigator !== 'undefined' &&
  /iPhone|iPad/i.test(navigator.userAgent) &&
  !(navigator as Navigator & { standalone?: boolean }).standalone;

function Toggle({
  on,
  onToggle,
  label,
  disabled = false,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
        on ? 'bg-brand-500' : 'bg-surface-3'
      }`}
      aria-label={label}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          on ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function Settings() {
  const { subStatus, isEnabling, enableError, remindersEnabled, intervalHours, enable, disable, setIntervalHours } =
    usePushNotifications();

  const { data: mobilityEnabledData } = usePlanContext<boolean>('mobility_reminders_enabled');
  const { data: mobilityTimeData } = usePlanContext<string>('mobility_reminder_time');
  const { mutate: updateCtx } = useUpdatePlanContext();

  const mobilityEnabled = (mobilityEnabledData?.value as boolean | undefined) ?? false;
  const mobilityTime = (mobilityTimeData?.value as string | undefined) ?? '08:00';

  const isSubscribed = subStatus === 'subscribed';

  const [demoOn, setDemoOn] = useState(isDemoMode());

  function toggleDemo() {
    const next = !demoOn;
    setDemoMode(next);
    setDemoOn(next);
    window.location.reload();
  }

  return (
    <div className="max-w-lg mx-auto space-y-8 animate-fade-in">
      <h1 className="text-base font-semibold text-ink-primary tracking-wide animate-fade-up">Settings</h1>

      {/* Water Reminders */}
      <section className="space-y-3 animate-fade-up-1">
        <h2 className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-widest px-1">
          Water Reminders
        </h2>

        <div className="bg-surface-1 rounded-2xl border border-white/[.07] divide-y divide-white/[.06]">
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-medium text-ink-primary">Push notifications</p>
              <p className="text-xs text-ink-tertiary mt-0.5">Remind me to drink water throughout the day</p>
            </div>

            {subStatus === 'loading' && (
              <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            )}
            {subStatus === 'unsupported' && (
              <span className="text-xs text-ink-tertiary">Not supported</span>
            )}
            {subStatus === 'denied' && (
              <span className="text-xs text-red-400">Blocked</span>
            )}
            {(subStatus === 'default' || subStatus === 'subscribed') && (
              <Toggle
                on={remindersEnabled && isSubscribed}
                onToggle={remindersEnabled && isSubscribed ? disable : enable}
                disabled={isEnabling}
                label="Toggle water reminders"
              />
            )}
          </div>

          {isSubscribed && remindersEnabled && (
            <div className="px-4 py-4 space-y-3">
              <p className="text-sm font-medium text-ink-primary">Reminder interval</p>
              <div className="flex gap-2 flex-wrap">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setIntervalHours(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all active:scale-[.96] ${
                      intervalHours === opt.value
                        ? 'bg-brand-500 text-surface-0'
                        : 'bg-surface-2 text-ink-secondary hover:text-ink-primary border border-white/[.07]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-ink-muted">Reminders fire between 8 am and 10 pm</p>
            </div>
          )}
        </div>

        {subStatus === 'denied' && (
          <p className="text-xs text-ink-tertiary px-1">
            Notifications are blocked. Open your browser settings to allow notifications for this site.
          </p>
        )}
        {isIosBrowser && !isSubscribed && (
          <p className="text-xs text-ink-tertiary px-1">
            On iPhone or iPad, add this app to your Home Screen first, then open it from there to enable push notifications.
          </p>
        )}
        {enableError && (
          <p className="text-xs text-red-400 px-1">{enableError}</p>
        )}
      </section>

      {/* Mobility Reminders */}
      <section className="space-y-3 animate-fade-up-2">
        <h2 className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-widest px-1">
          Mobility Reminders
        </h2>

        <div className="bg-surface-1 rounded-2xl border border-white/[.07] divide-y divide-white/[.06]">
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-medium text-ink-primary">Morning reminder</p>
              <p className="text-xs text-ink-tertiary mt-0.5">
                Notify me when a mobility session is planned for today
              </p>
            </div>

            {!isSubscribed ? (
              <span className="text-xs text-ink-tertiary">Enable notifications first</span>
            ) : (
              <Toggle
                on={mobilityEnabled}
                onToggle={() =>
                  updateCtx({ key: 'mobility_reminders_enabled', value: !mobilityEnabled })
                }
                label="Toggle mobility reminders"
              />
            )}
          </div>

          {isSubscribed && mobilityEnabled && (
            <div className="flex items-center justify-between px-4 py-4">
              <p className="text-sm font-medium text-ink-primary">Reminder time</p>
              <input
                type="time"
                value={mobilityTime}
                onChange={(e) =>
                  updateCtx({ key: 'mobility_reminder_time', value: e.target.value })
                }
                className="text-sm bg-surface-2 border border-white/[.09] rounded-lg px-2 py-1 text-ink-primary focus:outline-none focus:ring-1 focus:ring-brand-500/50"
              />
            </div>
          )}
        </div>

        {isSubscribed && mobilityEnabled && (
          <p className="text-xs text-ink-muted px-1">
            Only fires on days with a planned mobility session.
          </p>
        )}
      </section>

      {/* Demo Mode */}
      <section className="space-y-3 animate-fade-up-3">
        <h2 className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-widest px-1">
          Demo Mode
        </h2>

        <div className="bg-surface-1 rounded-2xl border border-blue-400/20 divide-y divide-white/[.06]">
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-medium text-ink-primary">Sample data</p>
              <p className="text-xs text-ink-tertiary mt-0.5">
                Browse and interact with realistic sample data instead of your own. Reloads the app.
              </p>
            </div>
            <Toggle on={demoOn} onToggle={toggleDemo} label="Toggle demo mode" />
          </div>
        </div>
      </section>
    </div>
  );
}
