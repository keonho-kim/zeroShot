import { spawn, spawnSync } from "node:child_process";
import { existsSync, lstatSync, readlinkSync, realpathSync } from "node:fs";
import { chmod, mkdtemp, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const packageNames = ["@keonhokim/zeroshot", "@zeroshot/cli"];

export interface UninstallOptions {
  currentPackageRoot: string;
  includeCurrentPackageRoot: boolean;
  dryRun?: boolean;
}

export interface UninstallPlan {
  binPaths: string[];
  packageRoots: string[];
  dataRoots: string[];
  scopeDirs: string[];
}

interface CleanupScriptOptions {
  runPackageManagers?: boolean;
}

function commandOutput(command: string, args: string[]): string | null {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"]
  });

  if (result.status !== 0) {
    return null;
  }

  const output = result.stdout.trim();
  return output ? output : null;
}

function unique(paths: string[]): string[] {
  return [...new Set(paths.filter(Boolean).map((path) => resolve(path)))];
}

function existing(paths: string[]): string[] {
  return unique(paths).filter((path) => existsSync(path));
}

function safeDataRoot(path: string): boolean {
  return basename(resolve(path)) === ".zeroshot";
}

function packageRootCandidates(currentPackageRoot: string, includeCurrentPackageRoot: boolean): string[] {
  const candidates: string[] = [];

  if (includeCurrentPackageRoot) {
    candidates.push(currentPackageRoot);
  }

  const npmRoot = commandOutput("npm", ["root", "-g"]);
  if (npmRoot) {
    for (const name of packageNames) {
      candidates.push(join(npmRoot, ...name.split("/")));
    }
  }

  const bunBin = commandOutput("bun", ["pm", "bin", "-g"]);
  if (bunBin) {
    const bunRoot = resolve(bunBin, "..", "install", "global", "node_modules");
    for (const name of packageNames) {
      candidates.push(join(bunRoot, ...name.split("/")));
    }
  }

  const bunInstall = process.env.BUN_INSTALL ?? join(homedir(), ".bun");
  const bunGlobalRoot = join(bunInstall, "install", "global", "node_modules");
  for (const name of packageNames) {
    candidates.push(join(bunGlobalRoot, ...name.split("/")));
  }

  return existing(candidates);
}

function binPathCandidates(packageRoots: string[]): string[] {
  const candidates: string[] = [];

  for (const entry of (process.env.PATH ?? "").split(":")) {
    if (entry) {
      candidates.push(join(entry, "zeroshot"));
    }
  }

  const npmPrefix = commandOutput("npm", ["prefix", "-g"]);
  if (npmPrefix) {
    candidates.push(join(npmPrefix, "bin", "zeroshot"));
  }

  const bunBin = commandOutput("bun", ["pm", "bin", "-g"]);
  if (bunBin) {
    candidates.push(join(bunBin, "zeroshot"));
  }

  return existing(candidates).filter((path) => isZeroShotBin(path, packageRoots));
}

function isZeroShotBin(path: string, packageRoots: string[]): boolean {
  const resolvedRoots = packageRoots.map((root) => resolve(root));

  try {
    const realPath = realpathSync(path);
    if (resolvedRoots.some((root) => realPath === root || realPath.startsWith(`${root}/`))) {
      return true;
    }
  } catch {
    // Broken symlinks are handled through readlink below.
  }

  try {
    const info = lstatSync(path);
    if (info.isSymbolicLink()) {
      const target = readlinkSync(path);
      const resolvedTarget = resolve(dirname(path), target);
      return resolvedRoots.some((root) => resolvedTarget === root || resolvedTarget.startsWith(`${root}/`));
    }
  } catch {
    return false;
  }

  return false;
}

function dataRootCandidates(): string[] {
  const candidates = [join(homedir(), ".zeroshot")];

  if (process.env.ZEROSHOT_DATA_ROOT) {
    candidates.push(process.env.ZEROSHOT_DATA_ROOT);
  }

  if (process.env.ZEROSHOT_APP_CONFIG) {
    candidates.push(dirname(process.env.ZEROSHOT_APP_CONFIG));
  }

  return existing(candidates).filter(safeDataRoot);
}

export function createUninstallPlan(options: UninstallOptions): UninstallPlan {
  const packageRoots = packageRootCandidates(options.currentPackageRoot, options.includeCurrentPackageRoot);
  const binPaths = binPathCandidates(packageRoots);
  const dataRoots = dataRootCandidates();
  const scopeDirs = unique(packageRoots.map(dirname));

  return {
    binPaths,
    packageRoots,
    dataRoots,
    scopeDirs
  };
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function removeLines(flag: "-f" | "-rf", paths: string[]): string[] {
  return paths.map((path) => `rm ${flag} ${shellQuote(path)}`);
}

export function buildCleanupScript(plan: UninstallPlan, options: CleanupScriptOptions = {}): string {
  const scopeCleanup = plan.scopeDirs.map((path) => `rmdir ${shellQuote(path)} 2>/dev/null || true`);
  const packageManagerCleanup = options.runPackageManagers
    ? [
        "if command -v npm >/dev/null 2>&1; then",
        "  npm uninstall -g @keonhokim/zeroshot @zeroshot/cli >/dev/null 2>&1 || true",
        "fi",
        "if command -v bun >/dev/null 2>&1; then",
        "  bun remove -g @keonhokim/zeroshot @zeroshot/cli >/dev/null 2>&1 || true",
        "fi"
      ]
    : [];

  return [
    "#!/usr/bin/env sh",
    "set -u",
    "sleep 1",
    ...packageManagerCleanup,
    ...removeLines("-f", plan.binPaths),
    ...removeLines("-rf", [...plan.packageRoots, ...plan.dataRoots]),
    ...scopeCleanup,
    "hash -r 2>/dev/null || true",
    'echo "[zeroshot] uninstall complete"',
    "rm -f \"$0\"",
    ""
  ].join("\n");
}

function printPlan(plan: UninstallPlan): void {
  console.log("[zeroshot] uninstall targets");
  for (const path of plan.binPaths) {
    console.log(`  bin     ${path}`);
  }
  for (const path of plan.packageRoots) {
    console.log(`  package ${path}`);
  }
  for (const path of plan.dataRoots) {
    console.log(`  data    ${path}`);
  }
  if (plan.binPaths.length + plan.packageRoots.length + plan.dataRoots.length === 0) {
    console.log("  none");
  }
}

export async function runUninstall(options: UninstallOptions): Promise<void> {
  const plan = createUninstallPlan(options);
  printPlan(plan);

  if (options.dryRun) {
    console.log("[zeroshot] dry run only; no files were removed");
    return;
  }

  const scriptPath = join(await mkdtemp(join(tmpdir(), "zeroshot-uninstall-")), "cleanup.sh");
  await writeFile(scriptPath, buildCleanupScript(plan, { runPackageManagers: true }), "utf8");
  await chmod(scriptPath, 0o700);

  const child = spawn("sh", [scriptPath], {
    detached: true,
    stdio: "ignore"
  });
  child.unref();

  console.log("[zeroshot] uninstall scheduled");
  console.log("[zeroshot] restart your shell or run `hash -r` if your shell still caches the old command path.");
}
