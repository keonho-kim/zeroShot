import { mkdir, writeFile } from "node:fs/promises";
import { writeSchema } from "@cli/pipeline/schema";
import type { PipelineContext } from "@cli/pipeline/types";
import {
  fileExists,
  findLatestRunDir,
  initializeRunStructure,
  nextRunDir,
  setupRunPaths,
  writeRunMeta
} from "@cli/pipeline/utils";
import { createPipelineRun } from "@cli/pipeline/storage";

async function ensureEnvAndTools(ctx: PipelineContext): Promise<void> {
  console.log("[env] 환경 변수와 필수 도구를 점검합니다.");
  console.log(`[env] ROOT         : ${ctx.projectRoot}`);
  console.log(`[env] PRODUCT_FILE : ${ctx.productFile}`);
  console.log(`[env] UPDATE_FILE  : ${ctx.updateFile}`);
  console.log(`[env] WORK_ROOT    : ${ctx.workRoot}`);
  console.log(`[env] RUN_MODE     : ${ctx.mode}`);

  await mkdir(ctx.workRoot, { recursive: true });

  console.log("[env] Codex 실행은 @openai/codex-sdk의 TypeScript API를 사용합니다.");
  if (!(await fileExists(ctx.productFile))) {
    throw new Error(`PRODUCT.html을 찾지 못했습니다: ${ctx.productFile}`);
  }
  if (ctx.mode === "update" && !(await fileExists(ctx.updateFile))) {
    throw new Error(`update 모드에서는 UPDATE.md가 필요합니다: ${ctx.updateFile}`);
  }

  console.log("[env] 환경과 도구 점검이 완료되었습니다.");
}

async function prepareRun(ctx: PipelineContext): Promise<void> {
  await ensureEnvAndTools(ctx);

  console.log("[run] run 준비를 시작합니다.");
  console.log(`[run] RUN_MODE=${ctx.mode}`);

  if (ctx.mode === "update") {
    ctx.previousRunDir = await findLatestRunDir(ctx.workRoot);
    if (!ctx.previousRunDir) {
      throw new Error("update 모드지만 이전 run을 찾지 못했습니다.");
    }
    console.log(`[run] update 모드에서 참조할 이전 run: ${ctx.previousRunDir}`);
  }

  const runDir = await nextRunDir(ctx.workRoot);
  console.log(`[run] 오늘 날짜 기준 다음 run 번호를 계산합니다. run_dir=${runDir}`);
  await setupRunPaths(ctx, runDir);
  await initializeRunStructure(ctx);
  await writeRunMeta(ctx);
  await writeFile(ctx.activeRunFile, `${ctx.runDir}\n`, "utf8");
  await createPipelineRun(ctx);
  ctx.phaseSeq = 0;

  console.log("[run] run 준비가 완료되었습니다.");
  console.log(`[run] RUN_DIR       : ${ctx.runDir}`);
  console.log("[run] workspace에는 사용자용 HTML 보고서만 생성합니다.");
}

export async function preparePhase(ctx: PipelineContext): Promise<void> {
  console.log("[prepare] run 준비를 시작합니다.");
  await prepareRun(ctx);
  await writeSchema(ctx);
  console.log("[prepare] run 준비가 완료되었습니다.");
}
