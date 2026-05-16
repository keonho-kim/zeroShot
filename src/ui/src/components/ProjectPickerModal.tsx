import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, House, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProjectTree } from "./project-picker/ProjectTree";
import { useProjectTreeController } from "./project-picker/useProjectTreeController";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ProjectPickerModal({ open, onClose }: Props) {
  const tree = useProjectTreeController({ open, onClose });

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
                  <p className="text-2xl font-semibold tracking-[-0.02em]">프로젝트 선택</p>
                  <p className="text-sm text-[var(--muted-foreground)]">폴더를 한 번 누르면 하위 디렉터리가 열립니다. 프로젝트 지정은 우측 선택 버튼을 사용하세요.</p>
                </div>
                <Button variant="ghost" onClick={onClose}>
                  <X className="size-4" />
                  닫기
                </Button>
              </div>

              <div className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" disabled={!tree.canGoBack} onClick={tree.goBack}>
                    <ChevronLeft className="size-4" />
                    뒤로가기
                  </Button>
                  <Button variant="outline" disabled={!tree.canGoUp} onClick={tree.goUp}>
                    <House className="size-4" />
                    상위 폴더
                  </Button>
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                <div className="bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                  <span className="block truncate" title={tree.currentPath ? `${tree.currentPath} 탐색 중` : "탐색 시작점을 선택하세요"}>
                    {tree.currentPath ? `${tree.currentPath} 탐색 중` : "탐색 시작점을 선택하세요"}
                  </span>
                </div>
                <ProjectTree
                  projectRoot={tree.projectRoot}
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
