import { loadAppConfig } from "@backend/config/app-config";
import { normalizeLocale } from "@backend/i18n/locale";
import { runOmakaseArchitectStage } from "@backend/services/omakase/architect-stage";
import { runOmakaseBuildStage } from "@backend/services/omakase/build-stage";
import { runOmakaseDesignStage } from "@backend/services/omakase/design-stage";
import { writeStageFailed } from "@backend/services/omakase/stream-writer";
import type { OmakaseRequest, OmakaseStage, OmakaseStream } from "@backend/services/omakase/types";

export { omakaseStages } from "@backend/services/omakase/const/stages";
export { selectOmakaseDesignResources, selectRecommendedArchitectAnswers } from "@backend/services/omakase/selection";
export type { OmakaseRequest, OmakaseStage, OmakaseStream };

export async function runOmakasePipeline(request: OmakaseRequest, stream: OmakaseStream) {
  const locale = normalizeLocale(request.locale);
  const brief = request.brief.trim();
  const appConfig = await loadAppConfig();

  let activeStage: OmakaseStage = "architect";
  try {
    activeStage = "architect";
    await runOmakaseArchitectStage({ request, brief, locale, appConfig, stream });

    activeStage = "design";
    await runOmakaseDesignStage({ request, brief, locale, stream });

    activeStage = "build";
    const job = await runOmakaseBuildStage(request, stream);
    await stream.write("complete", { job });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeStageFailed(stream, activeStage, message);
    await stream.write("error", { message });
  }
}
