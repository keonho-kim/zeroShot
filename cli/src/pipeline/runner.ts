import type { AppDefaults, Gate, PipelineOptions, PipelineContext, RunMode } from "@cli/pipeline/types.js";
import { archiveUpdateInput, assertDirectory, createInitialContext } from "@cli/pipeline/utils.js";
import { closeoutPhase } from "@cli/pipeline/phase/closeout/index.js";
import { iterOnce } from "@cli/pipeline/phase/implement/index.js";
import { preparePhase } from "@cli/pipeline/phase/prepare/index.js";
import { replanPhase } from "@cli/pipeline/phase/replan/index.js";
import { requirementsNormalizePhase } from "@cli/pipeline/phase/requirements-normalize/index.js";
import { syncProductPhase } from "@cli/pipeline/phase/sync-product/index.js";
import { validatePhase } from "@cli/pipeline/phase/validate/index.js";

function printFinalSummary(ctx: PipelineContext, pipelineFailed: boolean, failureReason: string): number {
  console.log("[build] ============================================================");
  console.log("[build] 전체 파이프라인이 종료되었습니다.");
  console.log(`[build] Run mode      : ${ctx.mode}`);
  console.log(`[build] Run directory : ${ctx.runDir}`);
  console.log(`[build] PRODUCT.html  : ${ctx.productFile}`);
  if (ctx.mode === "update") {
    console.log(`[build] UPDATE.md     : ${ctx.updateFile || "<none>"}`);
  }
  if (ctx.previousRunDir) {
    console.log(`[build] Previous run  : ${ctx.previousRunDir}`);
  }
  console.log(`[build] Work log      : ${ctx.runDir}/work-log.html`);
  console.log(`[build] Result report : ${ctx.runDir}/result-report.html`);

  if (pipelineFailed) {
    console.log("[build] 최종 결과    : FAIL");
    console.log(`[build] failure_reason: ${failureReason || "unknown"}`);
    console.log("[build] ============================================================");
    return 1;
  }

  console.log("[build] 최종 결과    : PASS");
  console.log("[build] ============================================================");
  return 0;
}

export async function runPipeline(mode: RunMode, projectRoot: string, defaults: AppDefaults, options: PipelineOptions = {}): Promise<number> {
  await assertDirectory(projectRoot);
  const ctx = createInitialContext(mode, projectRoot, defaults, options);

  console.log("[build] 프로젝트 루트로 이동했습니다: " + ctx.projectRoot);
  console.log("[build] 도구 루트: " + ctx.toolRoot);
  console.log("[build] TypeScript pipeline runner를 사용합니다.");
  console.log("[build] 전체 파이프라인을 시작합니다.");
  console.log(`[build] 실행 모드(RUN_MODE): ${ctx.mode}`);

  let iter = 1;
  let stallCount = 0;
  let queueEmpty = false;
  let anyCodeChanged = false;
  let ranValidate = false;
  let validateGate: Gate = "PASS";
  let shouldArchiveUpdate = false;
  let pipelineFailed = false;
  let failureReason = "";

  try {
    console.log("[build] 1단계: run 준비를 수행합니다.");
    await preparePhase(ctx);

    console.log("[build] 2단계: requirements-normalize를 수행합니다.");
    let lastResult = await requirementsNormalizePhase(ctx);

    if (lastResult.gate !== "PASS") {
      console.log("[build] requirements-normalize가 FAIL을 반환했습니다.");
      pipelineFailed = true;
      failureReason = "requirements_normalize_failed";
    }

    if (lastResult.codeChanged) {
      anyCodeChanged = true;
    }
    queueEmpty = lastResult.queueEmpty;

    if (!pipelineFailed && !queueEmpty) {
      console.log("[build] 3단계: 구현 반복 루프를 시작합니다.");
      console.log(`[build] MAX_ITERS   : ${ctx.options.maxIters}`);
      console.log(`[build] STALL_LIMIT : ${ctx.options.stallLimit}`);

      while (iter <= ctx.options.maxIters) {
        console.log("[build] ------------------------------------------------------------");
        console.log(`[build] 구현 반복을 시작합니다. iteration=${iter}`);
        console.log(`[build] 현재 stall_count=${stallCount}`);
        console.log("[build] ------------------------------------------------------------");

        lastResult = await iterOnce(ctx, iter);

        if (lastResult.codeChanged) {
          anyCodeChanged = true;
        }

        if (lastResult.gate !== "PASS") {
          console.log("[build] iteration이 FAIL을 반환했습니다. replan을 시도합니다.");
          lastResult = await replanPhase(ctx, String(iter));

          if (lastResult.gate !== "PASS") {
            console.log("[build] replan까지 FAIL을 반환했습니다. 구현 루프를 종료합니다.");
            pipelineFailed = true;
            failureReason = "replan_failed_after_iter_fail";
            break;
          }

          console.log("[build] replan이 PASS로 끝났습니다. 다음 iteration으로 넘어갑니다.");
          stallCount = 0;
          iter += 1;
          continue;
        }

        queueEmpty = lastResult.queueEmpty;

        if (queueEmpty) {
          console.log("[build] Live Queue가 비었습니다. 구현 루프를 종료합니다.");
          break;
        }

        if (lastResult.progressMade) {
          console.log("[build] 이번 iteration에서 진전이 있었습니다. stall_count를 0으로 초기화합니다.");
          stallCount = 0;
        } else {
          console.log("[build] 이번 iteration에서 진전이 뚜렷하지 않았습니다. stall_count를 증가시킵니다.");
          stallCount += 1;
        }

        if (stallCount >= ctx.options.stallLimit) {
          console.log("[build] stall 한도에 도달했습니다. replan을 수행합니다.");
          ctx.pipelineNote = "최근 iteration에서 충분한 진전이 없었습니다. Live Queue를 더 작고 실행 가능한 작업으로 재구성하세요.";
          lastResult = await replanPhase(ctx, String(iter));

          if (lastResult.gate !== "PASS") {
            console.log("[build] replan이 FAIL을 반환했습니다. 구현 루프를 종료합니다.");
            pipelineFailed = true;
            failureReason = "replan_failed_after_stall";
            break;
          }

          console.log("[build] replan이 PASS로 끝났습니다. stall_count를 0으로 초기화합니다.");
          stallCount = 0;
        }

        iter += 1;
      }
    }

    if (!pipelineFailed && !queueEmpty && iter > ctx.options.maxIters) {
      console.log("[build] 최대 iteration 횟수에 도달했습니다.");
      pipelineFailed = true;
      failureReason = "max_iters_reached_before_queue_empty";
      ctx.pipelineNote = "최대 iteration 횟수에 도달했습니다. 남은 작업과 리스크를 compact state와 최종 HTML 보고서에 정직하게 기록하세요.";
    }

    console.log("[build] 4단계: 조건부 validate를 검토합니다.");
    if (anyCodeChanged && queueEmpty && !pipelineFailed) {
      console.log("[build] 코드 변경이 감지되어 validate를 수행합니다.");
      lastResult = await validatePhase(ctx);
      ranValidate = true;
      validateGate = lastResult.gate;

      if (validateGate !== "PASS") {
        console.log("[build] validate가 FAIL을 반환했습니다.");
        pipelineFailed = true;
        failureReason ||= "validate_failed";
      }
    } else {
      console.log("[build] full validate는 생략합니다. 조건: code_changed=true, queue_empty=true, pipeline_failed=false");
    }

    if (ctx.mode === "update") {
      console.log("[build] 5단계: update 모드이므로 PRODUCT.html 동기화 가능 여부를 검토합니다.");
      if (queueEmpty) {
        if (ranValidate && validateGate !== "PASS") {
          console.log("[build] validate가 실패했으므로 PRODUCT.html 동기화는 수행하지 않습니다.");
        } else {
          console.log("[build] queue가 비어 있고 validate 조건도 충족했으므로 PRODUCT.html 동기화를 시도합니다.");
          lastResult = await syncProductPhase(ctx);

          if (lastResult.gate === "PASS") {
            console.log("[build] PRODUCT.html 동기화가 PASS로 끝났습니다.");
            shouldArchiveUpdate = true;
          } else {
            console.log("[build] PRODUCT.html 동기화가 FAIL을 반환했습니다.");
            pipelineFailed = true;
            failureReason ||= "sync_product_failed";
          }
        }
      } else {
        console.log("[build] queue가 비어 있지 않으므로 PRODUCT.html 동기화를 수행하지 않습니다.");
      }
    }

    console.log("[build] 6단계: closeout을 수행합니다.");
    ctx.pipelineNote = pipelineFailed
      ? `이 run은 하나 이상의 FAIL 게이트를 겪었습니다. HTML 보고서에 실제 실패 지점, 테스트 실행 여부, PRODUCT.html 기능 명세와의 불일치, 남은 작업을 정직하게 기록하세요. failure_reason=${failureReason || "unknown"}`
      : "이 run은 주요 게이트를 PASS로 통과했습니다. HTML 보고서에 완료 범위, 테스트 실행 결과, PRODUCT.html 기능 명세 교차확인 결과, 남은 리스크를 정직하게 기록하세요.";

    lastResult = await closeoutPhase(ctx, pipelineFailed, failureReason);
    if (lastResult.gate !== "PASS") {
      console.log("[build] closeout도 FAIL을 반환했습니다.");
      pipelineFailed = true;
      failureReason ||= "closeout_failed";
    }

    if (ctx.mode === "update" && shouldArchiveUpdate && lastResult.gate === "PASS") {
      console.log("[build] closeout까지 PASS로 끝났습니다. UPDATE.md는 workspace root에 유지합니다.");
      await archiveUpdateInput(ctx);
    }

    return printFinalSummary(ctx, pipelineFailed, failureReason);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[build] pipeline runner failed: ${message}`);
    if (ctx.runDir) {
      return printFinalSummary(ctx, true, failureReason || "runner_error");
    }
    return 1;
  }
}
