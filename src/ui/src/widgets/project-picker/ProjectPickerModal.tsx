import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, House, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ProjectTree } from "@/widgets/project-picker/ProjectTree";
import { useProjectTreeController } from "@/widgets/project-picker/useProjectTreeController";
import { useI18n } from "@/lib/i18n";

interface Props {
  open: boolean;
  freshStart?: boolean;
  onClose: () => void;
  onProjectSelected?: (projectRoot: string) => void;
}

export function ProjectPickerModal({ open, freshStart = false, onClose, onProjectSelected }: Props) {
  const { t } = useI18n();
  const tree = useProjectTreeController({ open, freshStart, onClose, onProjectSelected });
  const browsingLabel = tree.currentPath ? t("projectPicker.browsing", { path: tree.currentPath }) : t("projectPicker.chooseStart");

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            className="flex h-[min(88vh,780px)] w-full max-w-7xl"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <Card className="flex h-full w-full flex-col overflow-hidden bg-[var(--panel)] p-0 shadow-[var(--shadow-popover)]">
              <div className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-2xl font-semibold tracking-[-0.02em]">{t("projectPicker.title")}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{t("projectPicker.description")}</p>
                </div>
                <Button variant="ghost" onClick={onClose}>
                  <X className="size-4" />
                  {t("common.close")}
                </Button>
              </div>

              <div className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" disabled={!tree.canGoBack} onClick={tree.goBack}>
                    <ChevronLeft className="size-4" />
                    {t("projectPicker.back")}
                  </Button>
                  <Button variant="outline" disabled={!tree.canGoUp} onClick={tree.goUp}>
                    <House className="size-4" />
                    {t("projectPicker.up")}
                  </Button>
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  <span className="block truncate" title={browsingLabel}>
                    {browsingLabel}
                  </span>
                </div>
                <ProjectTree
                  projectRoot={freshStart ? "" : tree.projectRoot}
                  currentPath={tree.currentPath}
                  entries={tree.currentEntries}
                  selectedPath={tree.selectedPath}
                  expandedPaths={tree.expandedPaths}
                  childrenByPath={tree.childrenByPath}
                  loadErrors={tree.loadErrors}
                  pendingCreateDir={tree.pendingCreateDir}
                  createPending={tree.createPending}
                  createError={tree.createError}
                  createFailed={tree.createFailed}
                  selectionPending={tree.selectionPending}
                  selectionError={tree.selectionError}
                  selectionFailed={tree.selectionFailed}
                  onPendingCreateNameChange={tree.setPendingCreateName}
                  onSubmitCreate={tree.submitCreate}
                  onCancelCreate={tree.cancelCreate}
                  onToggle={tree.toggle}
                  onSelectAndExpand={tree.selectAndExpand}
                  onStartCreate={tree.startCreate}
                  onSelectProject={tree.selectProject}
                  onLoadChildren={tree.loadChildren}
                />
              </div>
            </Card>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
