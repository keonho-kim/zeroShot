import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

export function CreateDirectoryRow({
  depth,
  name,
  pending,
  onNameChange,
  onSubmit,
  onCancel
}: {
  depth: number;
  name: string;
  pending: boolean;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="grid grid-cols-[32px_40px_minmax(0,1fr)] gap-3 px-3 py-2 md:grid-cols-[32px_40px_minmax(0,1fr)_auto] md:items-center"
      style={{ paddingLeft: `${depth * 18 + 12}px` }}
    >
      <div />
      <div className="flex size-10 items-center justify-center rounded-md bg-[var(--muted)] text-[var(--primary)]">
        <FolderPlus className="size-5" />
      </div>
      <Input
        autoFocus
        value={name}
        placeholder={t("projectPicker.newFolderName")}
        onChange={(event) => onNameChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
          }
          if (event.key === "Enter" && name.trim()) {
            onSubmit();
          }
        }}
      />
      <div className="col-span-3 flex flex-wrap gap-2 md:col-span-1">
        <Button disabled={!name.trim() || pending} onClick={onSubmit}>
          {t("common.create")}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
