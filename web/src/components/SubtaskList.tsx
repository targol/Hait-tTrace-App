import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Circle, CheckCircle2 } from 'lucide-react';
import { AppTask } from '../types';
import { toPersianDigits } from '../calendar/jalali';

interface Props {
  task: AppTask;
  onChange: (taskId: string, subtasks: NonNullable<AppTask['subtasks']>) => void;
}

/** Compact checklist under a task card: collapsed shows progress, expanded shows tick-able items. */
export const SubtaskList: React.FC<Props> = ({ task, onChange }) => {
  const [open, setOpen] = useState(false);
  const subs = task.subtasks || [];
  if (subs.length === 0) return null;
  const done = subs.filter(s => s.done).length;
  const pct = Math.round((done / subs.length) * 100);
  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen(o => !o)} className="flex items-center gap-1.5 text-[10px] font-bold text-gray-600 cursor-pointer">
        <span className="w-14 h-1.5 rounded-full bg-gray-200 overflow-hidden inline-block">
          <span className="block h-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </span>
        <span>{toPersianDigits(done)} از {toPersianDigits(subs.length)} قدم</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {subs.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange(task.id, subs.map(x => (x.id === s.id ? { ...x, done: !x.done } : x)))}
              className="flex items-center gap-2 text-[11px] w-full text-right cursor-pointer"
            >
              {s.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <Circle className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
              <span className={s.done ? 'line-through text-gray-400' : 'text-gray-800'}>{s.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
