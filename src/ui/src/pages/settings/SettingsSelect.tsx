import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/shared/lib/cn";

export function SettingsSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <label className="mb-2 block text-sm font-medium">{label}</label>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-[1px] border-2 border-[var(--border)] bg-[var(--input)] px-2.5 py-1.5 font-mono text-xs font-bold text-[var(--foreground)] outline-none transition focus-visible:shadow-[var(--shadow-focus)]"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">{value || t("common.notSet")}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open ? (
        <div className="absolute left-0 top-[calc(100%+0.25rem)] z-20 grid w-full border-2 border-[var(--border)] bg-[var(--panel)] shadow-[var(--shadow-card)]">
          {options.map((option) => (
            <button
              type="button"
              className={cn(
                "px-2.5 py-1.5 text-left font-mono text-xs font-bold hover:bg-[var(--surface-hover)]",
                option === value && "bg-[var(--surface)]"
              )}
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
