import { Navigate } from "react-router-dom";
import { useBuildPageController } from "@/pages/build/page-controller";
import { BuildRunScreen } from "@/pages/build/BuildRunScreen";
import { BuildSetupCard } from "@/pages/build/BuildSetupCard";
import { PageHeader } from "@/shared/ui/PageHeader";

export function BuildPage() {
  const controller = useBuildPageController();

  if (!controller.projectRoot) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="builder-shell">
      <PageHeader title="BUILD" projectRoot={controller.projectRoot} />
      {controller.buildJob ? (
        <BuildRunScreen job={controller.buildJob} />
      ) : (
        <BuildSetupCard
          disabled={controller.disabled}
          error={controller.mutation.error}
          isError={controller.mutation.isError}
          isPending={controller.mutation.isPending}
          onStart={() => controller.mutation.mutate()}
          projectRoot={controller.projectRoot}
          projectState={controller.projectState}
        />
      )}
    </div>
  );
}
