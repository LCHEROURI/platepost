import type { Recurrence } from '@/lib/types';
import { cn } from '@/lib/utils';
import { RepeatIcon } from './icons';

export interface ScheduleValue {
  mode: 'now' | 'later';
  scheduledAt: string; // value for <input type="datetime-local">
  isRecurring: boolean;
  recurrence: Recurrence;
  weeklyDay: string;
}

export default function SchedulePicker({
  value,
  onChange,
}: {
  value: ScheduleValue;
  onChange: (v: ScheduleValue) => void;
}) {
  const set = (patch: Partial<ScheduleValue>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="label mb-2">When should this post go out?</legend>
        <div className="space-y-2">
          {(
            [
              ['now', 'Publish immediately'],
              ['later', 'Schedule for later'],
            ] as const
          ).map(([mode, label]) => (
            <label
              key={mode}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm font-medium transition-colors',
                value.mode === mode ? 'border-accent bg-accent/5 text-ink' : 'border-secondary/50 text-ink-muted',
              )}
            >
              <input
                type="radio"
                name="schedule-mode"
                value={mode}
                checked={value.mode === mode}
                onChange={() => set({ mode })}
                className="accent-[#38B2AC]"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {value.mode === 'later' && (
        <div>
          <label htmlFor="scheduled-at" className="label">
            Date &amp; time
          </label>
          <input
            id="scheduled-at"
            type="datetime-local"
            value={value.scheduledAt}
            onChange={(e) => set({ scheduledAt: e.target.value })}
            className="input"
          />
        </div>
      )}

      <div className="rounded-lg border border-secondary/40 p-3.5">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={value.isRecurring}
            onChange={(e) => set({ isRecurring: e.target.checked, recurrence: e.target.checked ? 'weekly' : 'none' })}
            className="accent-[#38B2AC]"
          />
          <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <RepeatIcon size={15} aria-hidden /> Recurring post
          </span>
        </label>
        <p className="mt-1 pl-7 text-xs text-ink-muted">
          Great for evergreen content like “Monday Margaritas”.
        </p>

        {value.isRecurring && (
          <div className="mt-3 flex flex-col gap-3 pl-7 sm:flex-row">
            <div>
              <label htmlFor="recurrence" className="label">
                Repeat
              </label>
              <select
                id="recurrence"
                value={value.recurrence}
                onChange={(e) => set({ recurrence: e.target.value as Recurrence })}
                className="input sm:w-36"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            {value.recurrence === 'weekly' && (
              <div>
                <label htmlFor="weekly-day" className="label">
                  Day of week
                </label>
                <select
                  id="weekly-day"
                  value={value.weeklyDay}
                  onChange={(e) => set({ weeklyDay: e.target.value })}
                  className="input sm:w-44"
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
