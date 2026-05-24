import { Navigate } from "react-router-dom";
import { useUpdatePageController } from "@/pages/update/page-controller";
import { ChoiceBoard } from "@/pages/update/ChoiceBoard";
import { DecisionPanel } from "@/pages/update/DecisionPanel";
import { RequestPanel } from "@/pages/update/RequestPanel";
import { UpdateRunScreen } from "@/pages/update/RunScreen";
import { PageHeader } from "@/shared/ui/PageHeader";

export function UpdatePage() {
  const controller = useUpdatePageController();

  if (!controller.projectRoot) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="builder-shell">
      <PageHeader title="UPDATE" projectRoot={controller.projectRoot} />
      {controller.updateJob ? (
        <UpdateRunScreen job={controller.updateJob} />
      ) : (
        <div className="build-workspace">
          <div className="flex flex-col gap-6">
            {!controller.decisionSet ? (
              <RequestPanel
                decisionError={controller.decisionError}
                disabledReason={controller.disabledReason}
                isGeneratingDecisions={controller.isGeneratingDecisions}
                onRequestDecisions={controller.requestDecisions}
                progressItems={controller.progressItems}
                projectRoot={controller.projectRoot}
                projectState={controller.projectState}
                setUpdateContent={controller.setUpdateContent}
                streamMessages={controller.streamMessages}
                updateContent={controller.updateContent}
                updateDisabled={controller.updateDisabled}
              />
            ) : (
              <DecisionPanel
                answers={controller.answers}
                canStartUpdate={controller.canStartUpdate}
                decisionSet={controller.decisionSet}
                mutationError={controller.mutation.error}
                mutationPending={controller.mutation.isPending}
                onChoose={(decisionId, optionId) => controller.setAnswers((value) => ({ ...value, [decisionId]: optionId }))}
                onStart={() => controller.mutation.mutate()}
                setStepIndex={controller.setStepIndex}
                stepIndex={controller.stepIndex}
              />
            )}
          </div>
          <ChoiceBoard
            answersCount={Object.keys(controller.answers).length}
            decisionsCount={controller.decisions.length}
            pinnedChoices={controller.pinnedChoices}
            updateContent={controller.updateContent}
          />
        </div>
      )}
    </div>
  );
}
