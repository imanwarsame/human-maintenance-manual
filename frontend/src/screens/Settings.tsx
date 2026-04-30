import { usePushNotifications } from '../hooks/usePushNotifications.ts';
import { usePlanContext, useUpdatePlanContext } from '../hooks/usePlanContext.ts';

const INTERVAL_OPTIONS = [
  { label: '30 minutes', value: 0.5 },
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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${on ? 'bg-brand-600' : 'bg-gray-200'}`}
      aria-label={label}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`}
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

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      {/* ── Water Reminders ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Water Reminders
        </h2>

        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Push notifications</p>
              <p className="text-xs text-gray-500 mt-0.5">Remind me to drink water throughout the day</p>
            </div>

            {subStatus === 'loading' && (
              <div className="w-5 h-5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            )}
            {subStatus === 'unsupported' && (
              <span className="text-xs text-gray-400">Not supported</span>
            )}
            {subStatus === 'denied' && (
              <span className="text-xs text-red-500">Blocked</span>
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
            <div className="px-4 py-4 space-y-2">
              <p className="text-sm font-medium text-gray-900">Reminder interval</p>
              <div className="flex gap-2 flex-wrap">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setIntervalHours(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                      intervalHours === opt.value
                        ? 'bg-brand-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">Reminders fire between 8 am and 10 pm</p>
            </div>
          )}
        </div>

        {subStatus === 'denied' && (
          <p className="text-xs text-gray-500 px-1">
            Notifications are blocked. To re-enable, open your browser settings and allow
            notifications for this site.
          </p>
        )}
        {isIosBrowser && !isSubscribed && (
          <p className="text-xs text-gray-500 px-1">
            On iPhone or iPad, add this app to your Home Screen first, then open it from there to
            enable push notifications.
          </p>
        )}
        {enableError && (
          <p className="text-xs text-red-500 px-1">{enableError}</p>
        )}
      </section>

      {/* ── Mobility Reminders ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Mobility Reminders
        </h2>

        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm font-medium text-gray-900">Morning reminder</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Notify me when a mobility session is planned for today
              </p>
            </div>

            {!isSubscribed ? (
              <span className="text-xs text-gray-400">Enable notifications first</span>
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
              <p className="text-sm font-medium text-gray-900">Reminder time</p>
              <input
                type="time"
                value={mobilityTime}
                onChange={(e) =>
                  updateCtx({ key: 'mobility_reminder_time', value: e.target.value })
                }
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
          )}
        </div>

        {isSubscribed && mobilityEnabled && (
          <p className="text-xs text-gray-400 px-1">
            Only fires on days with a planned mobility session.
          </p>
        )}
      </section>
    </div>
  );
}
