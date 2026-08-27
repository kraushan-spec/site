"use client";

import { STAGE_LABELS, STAGE_ORDER } from "@/lib/contracts";

export function StageStepper({ stage, onChange }: { stage: string; onChange: (stage: string) => void }) {
  const currentIdx = STAGE_ORDER.indexOf(stage);
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {STAGE_ORDER.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border ${
              active
                ? "bg-primary text-white border-primary"
                : done
                ? "bg-success-bg text-success border-transparent"
                : "bg-[#f4f5fa] text-muted border-transparent"
            }`}
            title={STAGE_LABELS[s]}
          >
            {i + 1}. {STAGE_LABELS[s]}
          </button>
        );
      })}
    </div>
  );
}
