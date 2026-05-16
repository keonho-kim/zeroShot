import git from "isomorphic-git";
import fs from "node:fs";

export async function readGitStatusMatrix(projectRoot: string) {
  return git.statusMatrix({ fs, dir: projectRoot });
}
