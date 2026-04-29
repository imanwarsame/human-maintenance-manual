import { usePushNotifications } from '../hooks/usePushNotifications.ts';

const INTERVAL_OPTIONS = [
  { label: '30 minutes', value: 0.5 },
  { label: '1 hour', value: 1 },
  { label: '2 hours', value: 2 },
];

const isIosBrowser =
  typeof navigator !== 'undefined' &&
  /iPhone|iPad/i.test(navigator.userAgent) &&
  !(navigator as Navigator & { standalone?: boolean }).standalone;

export default function Settings() {
  const { subStatus, remindersEnabled, intervalHours, enable, disable, setIntervalHours } =
    usePushNotifications();

  return (
    <div className="max-w-lg mx-auto space-y-8">
      <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Water Reminders
        </h2>

        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {/* Enable / disable toggle */}
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
              <button
                onClick={remindersEnabled && subStatus === 'subscribed' ? disable : enable}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  remindersEnabled && subStatus === 'subscribed'
                    ? 'bg-brand-600'
                    : 'bg-gray-200'
                }`}
                aria-label="Toggle water reminders"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    remindersEnabled && subStatus === 'subscribed'
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            )}
          </div>

          {/* Interval selector — only shown when subscribed */}
          {subStatus === 'subscribed' && remindersEnabled && (
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

        {/* Contextual hints */}
        {subStatus === 'denied' && (
          <p className="text-xs text-gray-500 px-1">
            Notifications are blocked. To re-enable, open your browser settings and allow
            notifications for this site.
          </p>
        )}

        {isIosBrowser && subStatus !== 'subscribed' && (
          <p className="text-xs text-gray-500 px-1">
            On iPhone or iPad, add this app to your Home Screen first, then open it from there to
            enable push notifications.
          </p>
        )}
      </section>
    </div>
  );
}
