import { ChevronFirst, ChevronLast, Pause, Play, StepBack, StepForward } from 'lucide-react'
import { SPEEDS } from '../hooks/useStepper'
import { IconButton } from './ui'

export default function StepControls({ stepper, disabled }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <IconButton icon={ChevronFirst} label="Başa dön" onClick={stepper.first} disabled={disabled || stepper.index === 0} />
      <IconButton icon={StepBack} label="Geri" onClick={stepper.prev} disabled={disabled || stepper.index === 0} />
      <IconButton
        icon={stepper.playing ? Pause : Play}
        label={stepper.playing ? 'Duraklat' : 'Oynat'}
        onClick={stepper.toggle}
        disabled={disabled}
        active={stepper.playing}
      />
      <IconButton icon={StepForward} label="İleri" onClick={stepper.next} disabled={disabled || stepper.atEnd} />
      <IconButton icon={ChevronLast} label="Sona git" onClick={stepper.end} disabled={disabled || stepper.atEnd} />
      <span className="mx-2 min-w-16 text-xs tabular-nums text-slate-500">
        {disabled ? '—' : `Adım ${stepper.index} / ${stepper.last}`}
      </span>
      <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Hız">
        {SPEEDS.map((s, i) => (
          <button
            key={s.label}
            type="button"
            onClick={() => stepper.setSpeed(i)}
            className={`rounded-md px-2 py-0.5 text-xs font-medium ${
              stepper.speed === i ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
