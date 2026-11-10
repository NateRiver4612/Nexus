#!/usr/bin/env bun
/**
 * Push the current branch and create, update, or sync its GitHub pull request.
 *
 * Built for Nexus's stacked feature branches:
 * - the base is the nearest unmerged feature branch behind HEAD, else develop
 * - the title and body come from the branch's commit messages
 * - open child PRs whose base was merged into develop are switched to develop
 *
 * Auth: set GITHUB_TOKEN (or GH_TOKEN). The token needs Contents: read/write
 * and Pull requests: read/write. The token is never written to disk or git config.
 */

import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Args = {
  base?: string;
  title?: string;
  bodyFile?: string;
  dryRun: boolean;
  noRetarget: boolean;
  noSync: boolean;
  force: boolean;
  remote: string;
  repo?: string;
};

type Repo = { owner: string; name: string; slug: string };

type Commit = { sha: string; subject: string; body: string };

type PullRequest = {
  number: number;
  title: string;
  body: string | null;
  state: string;
  merged_at: string | null;
  html_url: string;
  base: { ref: string };
  head: { ref: string };
};

type Retarget = { number: number; from: string; to: string };

type GitResult = { ok: boolean; stdout: string; stderr: string };

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const warnings: string[] = [];

const scrub = (text: string): string => (token ? text.replaceAll(token, '<redacted>') : text);

const printHelp = (): void => {
  console.log(`Usage: bun .opencode/scripts/pr.ts [options]

Options:
  --base <branch>      Force the PR base instead of auto-detecting it.
  --title <text>       Override the PR title.
  --body-file <path>   Use this file for the PR body ('-' reads stdin).
  --dry-run            Show the planned PR without pushing or writing.
  --no-retarget        Do not switch child PRs to develop.
  --no-sync            Create the PR if missing; leave an existing PR's title/body/base alone.
  --force              Push with --force-with-lease.
  --remote <name>      Git remote to use (default: origin).
  --repo <owner/repo>  Override the repo parsed from the remote.

Auth: GITHUB_TOKEN or GH_TOKEN with Contents and Pull requests read/write.`);
};

const parseArgs = (argv: string[]): Args => {
  const args: Args = {
    dryRun: false,
    noRetarget: false,
    noSync: false,
    force: false,
    remote: 'origin',
  };

  const nextValue = ({ flag, index }: { flag: string; index: number }): string => {
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`${flag} needs a value.`);
    }
    return value;
  };

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === undefined) continue;

    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--no-retarget') args.noRetarget = true;
    else if (arg === '--no-sync') args.noSync = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--base') {
      args.base = nextValue({ flag: arg, index });
      index++;
    } else if (arg === '--title') {
      args.title = nextValue({ flag: arg, index });
      index++;
    } else if (arg === '--body-file') {
      args.bodyFile = nextValue({ flag: arg, index });
      index++;
    } else if (arg === '--remote') {
      args.remote = nextValue({ flag: arg, index });
      index++;
    } else if (arg === '--repo') {
      args.repo = nextValue({ flag: arg, index });
      index++;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
};

const runGit = ({
  args,
  allowFailure = false,
  env,
}: {
  args: string[];
  allowFailure?: boolean;
  env?: Record<string, string>;
}): GitResult => {
  const result = Bun.spawnSync({
    cmd: ['git', ...args],
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0', ...env },
  });

  const stdout = result.stdout.toString().trim();
  const stderr = result.stderr.toString().trim();
  const ok = result.exitCode === 0;

  if (!ok && !allowFailure) {
    throw new Error(scrub(stderr || stdout || `git ${args[0]} failed.`));
  }

  return { ok, stdout, stderr };
};

const parseRepoUrl = ({ url }: { url: string }): Repo => {
  const match = url.match(/github\.com[:/]([^/]+)\/(.+?)(?:\.git)?\/?$/);
  const owner = match?.[1];
  const name = match?.[2]?.replace(/\.git$/, '');
  if (!owner || !name) {
    throw new Error(`Remote is not a GitHub repository: ${url}`);
  }
  return { owner, name, slug: `${owner}/${name}` };
};

const parseRepoSlug = ({ slug }: { slug: string }): Repo => {
  const parts = slug.trim().split('/');
  const owner = parts[0];
  const name = parts[1]?.replace(/\.git$/, '');
  if (parts.length !== 2 || !owner || !name) {
    throw new Error('--repo must be owner/repo.');
  }
  return { owner, name, slug: `${owner}/${name}` };
};

const github = async <T>({
  method = 'GET',
  path,
  body,
}: {
  method?: string;
  path: string;
  body?: unknown;
}): Promise<T> => {
  if (!token) {
    throw new Error('GITHUB_TOKEN or GH_TOKEN is required.');
  }

  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'nexus-pr-script',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data: unknown = text;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      // Keep the plain text so a non-JSON error still reaches the caller.
    }
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as Record<string, unknown>).message)
        : text;
    throw new Error(scrub(`GitHub ${method} ${path} failed (${response.status}): ${message}`));
  }

  return data as T;
};

const loadMergedHeads = async ({ slug }: { slug: string }): Promise<Set<string>> => {
  const merged = new Set<string>();
  if (!token) return merged;

  let pulls: PullRequest[] = [];
  try {
    pulls = await github<PullRequest[]>({
      path: `/repos/${slug}/pulls?state=closed&per_page=100&sort=updated&direction=desc`,
    });
  } catch (error) {
    // A failed lookup weakens the squash-merge fallback but must not block the run.
    warnings.push(`Could not load merged PRs: ${(error as Error).message}`);
    return merged;
  }

  for (const pr of pulls) {
    if (pr.merged_at && (pr.base.ref === 'develop' || pr.base.ref === 'main')) {
      merged.add(pr.head.ref);
    }
  }

  // A branch merged into a feature branch that later reached develop is no
  // longer a valid base either. Walk the merged PRs until nothing changes.
  let changed = true;
  while (changed) {
    changed = false;
    for (const pr of pulls) {
      if (!pr.merged_at || merged.has(pr.head.ref)) continue;
      if (!merged.has(pr.base.ref)) continue;
      merged.add(pr.head.ref);
      changed = true;
    }
  }

  return merged;
};

const isMergedIntoDevelop = ({
  branch,
  remote,
  mergedHeads,
}: {
  branch: string;
  remote: string;
  mergedHeads: Set<string>;
}): boolean => {
  const ref = `${remote}/${branch}`;
  const exists = runGit({ args: ['rev-parse', '--verify', '--quiet', ref], allowFailure: true }).ok;

  if (exists) {
    const mergedLocally = runGit({
      args: ['merge-base', '--is-ancestor', ref, `${remote}/develop`],
      allowFailure: true,
    }).ok;
    if (mergedLocally) return true;
  }

  // Covers squash merges and branches GitHub already deleted after merge.
  return mergedHeads.has(branch);
};

const ticketNumber = ({ branch }: { branch: string }): number => {
  const match = branch.match(/[A-Z]+-(\d+)/);
  return match?.[1] ? Number(match[1]) : -1;
};

const detectBase = ({
  args,
  remote,
  branch,
  mergedHeads,
}: {
  args: Args;
  remote: string;
  branch: string;
  mergedHeads: Set<string>;
}): { base: string; source: 'override' | 'stacked' | 'develop' } => {
  if (args.base) {
    const ref = `${remote}/${args.base}`;
    if (!runGit({ args: ['rev-parse', '--verify', '--quiet', ref], allowFailure: true }).ok) {
      throw new Error(`Base branch ${args.base} does not exist on ${remote}.`);
    }
    return { base: args.base, source: 'override' };
  }

  const refs = runGit({
    args: ['for-each-ref', '--format=%(refname:short)', `refs/remotes/${remote}/feature/`],
    allowFailure: true,
  })
    .stdout.split('\n')
    .map((ref) => ref.trim())
    .filter(Boolean);

  const prefix = `${remote}/`;
  const candidates: { branch: string; distance: number; ticket: number }[] = [];

  for (const ref of refs) {
    if (!ref.startsWith(prefix)) continue;
    const candidate = ref.slice(prefix.length);
    if (candidate === branch) continue;
    if (isMergedIntoDevelop({ branch: candidate, remote, mergedHeads })) continue;
    if (!runGit({ args: ['merge-base', '--is-ancestor', ref, 'HEAD'], allowFailure: true }).ok)
      continue;

    const distance = Number(
      runGit({ args: ['rev-list', '--count', '--first-parent', `${ref}..HEAD`] }).stdout || '0',
    );
    if (distance <= 0) continue;
    candidates.push({ branch: candidate, distance, ticket: ticketNumber({ branch: candidate }) });
  }

  candidates.sort((a, b) => a.distance - b.distance || b.ticket - a.ticket);
  const [parent] = candidates;
  if (parent) {
    return { base: parent.branch, source: 'stacked' };
  }

  const developRef = `${remote}/develop`;
  if (!runGit({ args: ['rev-parse', '--verify', '--quiet', developRef], allowFailure: true }).ok) {
    throw new Error(`develop does not exist on ${remote}.`);
  }
  return { base: 'develop', source: 'develop' };
};

const readCommits = ({ baseRef }: { baseRef: string }): Commit[] => {
  const raw = runGit({
    args: [
      'log',
      '--reverse',
      '--no-merges',
      '--first-parent',
      '--format=%H%x1f%s%x1f%b%x1e',
      `${baseRef}..HEAD`,
    ],
  }).stdout;

  return raw
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [sha, subject, ...body] = record.split('\x1f');
      return {
        sha: sha?.trim() ?? '',
        subject: subject?.trim() ?? '',
        body: body.join('\x1f').trim(),
      };
    });
};

const ticketFromBranch = ({ branch }: { branch: string }): string =>
  branch.match(/[A-Z]+-\d+/)?.[0] ?? 'NXS-000';

const composeTitle = ({
  args,
  branch,
  commits,
}: {
  args: Args;
  branch: string;
  commits: Commit[];
}): string => {
  if (args.title) return args.title.trim();

  const ticket = ticketFromBranch({ branch });
  const [first] = commits;
  // The first commit usually names the ticket's main change; later commits are
  // refinements, so using the first keeps the PR title stable as work lands.
  const subject = first?.subject ?? ticket;
  return subject.startsWith(ticket) ? subject : `${ticket} ${subject}`;
};

const composeBody = ({ commits }: { commits: Commit[] }): string => {
  if (commits.length === 0) return '';

  if (commits.length === 1) {
    const [commit] = commits;
    if (!commit) return '';
    return (commit.body || `- ${commit.subject}`).trim();
  }

  return commits
    .map((commit) => {
      const body = (commit.body || `- ${commit.subject}`).trim();
      return `### ${commit.subject}\n\n${body}`;
    })
    .join('\n\n');
};

const readBodyFile = async ({ path }: { path: string }): Promise<string> => {
  if (path === '-') {
    if (process.stdin.isTTY) {
      throw new Error('--body-file - needs piped input.');
    }
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString('utf8').trim();
  }

  return (await Bun.file(path).text()).trim();
};

const writeBodyPreview = async ({ body }: { body: string }): Promise<string> => {
  const path = join(tmpdir(), `nexus-pr-body-${process.pid}.md`);
  await Bun.write(path, body.endsWith('\n') ? body : `${body}\n`);
  return path;
};

const findOpenPullRequest = async ({
  repo,
  branch,
}: {
  repo: Repo;
  branch: string;
}): Promise<PullRequest | undefined> => {
  const head = encodeURIComponent(`${repo.owner}:${branch}`);
  const pulls = await github<PullRequest[]>({
    path: `/repos/${repo.slug}/pulls?state=open&head=${head}&per_page=100`,
  });

  const [first] = pulls;
  if (!first) return undefined;
  if (pulls.length > 1) {
    warnings.push(`Found ${pulls.length} open PRs for ${branch}; using #${first.number}.`);
  }
  return first;
};

const syncPullRequest = async ({
  repo,
  branch,
  base,
  title,
  body,
  args,
}: {
  repo: Repo;
  branch: string;
  base: string;
  title: string;
  body: string;
  args: Args;
}): Promise<{ action: string; pr: PullRequest }> => {
  const existing = await findOpenPullRequest({ repo, branch });

  if (existing) {
    if (args.noSync) {
      return { action: 'existing', pr: existing };
    }

    const patch: Record<string, string> = {};
    if (existing.title !== title) patch.title = title;
    if ((existing.body ?? '').trim() !== body.trim()) patch.body = body;
    if (existing.base.ref !== base) patch.base = base;

    if (Object.keys(patch).length === 0) {
      return { action: 'unchanged', pr: existing };
    }

    const updated = await github<PullRequest>({
      method: 'PATCH',
      path: `/repos/${repo.slug}/pulls/${existing.number}`,
      body: patch,
    });
    return { action: 'updated', pr: updated };
  }

  try {
    const created = await github<PullRequest>({
      method: 'POST',
      path: `/repos/${repo.slug}/pulls`,
      body: { title, head: branch, base, body },
    });
    return { action: 'created', pr: created };
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes('A pull request already exists')) {
      throw new Error(
        `${message}. Reopen the existing PR, or delete the old branch and push a new one.`,
      );
    }
    throw error;
  }
};

const syncRetargets = async ({
  repo,
  remote,
  mergedHeads,
  args,
  apply,
}: {
  repo: Repo;
  remote: string;
  mergedHeads: Set<string>;
  args: Args;
  apply: boolean;
}): Promise<Retarget[]> => {
  if (args.noRetarget) return [];

  const pulls = await github<PullRequest[]>({
    path: `/repos/${repo.slug}/pulls?state=open&per_page=100`,
  });

  const retargeted: Retarget[] = [];
  for (const pr of pulls) {
    const from = pr.base.ref;
    // Only chained feature branches are safe to move. Never touch main or develop.
    if (!from.startsWith('feature/')) continue;
    if (!isMergedIntoDevelop({ branch: from, remote, mergedHeads })) continue;

    if (apply) {
      try {
        await github<PullRequest>({
          method: 'PATCH',
          path: `/repos/${repo.slug}/pulls/${pr.number}`,
          body: { base: 'develop' },
        });
      } catch (error) {
        warnings.push(`Could not retarget PR #${pr.number}: ${(error as Error).message}`);
        continue;
      }
    }

    retargeted.push({ number: pr.number, from, to: 'develop' });
  }

  return retargeted;
};

const scalar = ({ value }: { value: string | number | boolean }): string => {
  const text = String(value);
  return /^[A-Za-z0-9._:/#@+-]+$/.test(text) ? text : JSON.stringify(text);
};

const printResult = ({
  args,
  repo,
  branch,
  base,
  baseSource,
  bodyFile,
  commits,
  title,
  action,
  pr,
  retargeted,
}: {
  args: Args;
  repo: Repo;
  branch: string;
  base: string;
  baseSource: string;
  bodyFile: string;
  commits: Commit[];
  title: string;
  action: string;
  pr: PullRequest | undefined;
  retargeted: Retarget[];
}): void => {
  const lines: string[] = [];
  lines.push(`auth: ${token ? 'ok' : 'missing'}`);
  lines.push(`dryRun: ${args.dryRun}`);
  lines.push(`repo: ${scalar({ value: repo.slug })}`);
  lines.push(`remote: ${scalar({ value: args.remote })}`);
  lines.push(`branch: ${scalar({ value: branch })}`);
  lines.push(`base: ${scalar({ value: base })}`);
  lines.push(`baseSource: ${baseSource}`);
  lines.push(`bodyFile: ${scalar({ value: bodyFile })}`);
  lines.push(`commits[${commits.length}]{sha,subject}:`);
  for (const commit of commits) {
    lines.push(
      `  ${scalar({ value: commit.sha.slice(0, 7) })},${scalar({ value: commit.subject })}`,
    );
  }
  lines.push('pr:');
  lines.push(`  action: ${action}`);
  lines.push(`  number: ${pr ? pr.number : '-'}`);
  lines.push(`  url: ${pr ? scalar({ value: pr.html_url }) : '-'}`);
  lines.push(`  head: ${pr ? scalar({ value: pr.head.ref }) : scalar({ value: branch })}`);
  lines.push(`  base: ${pr ? scalar({ value: pr.base.ref }) : scalar({ value: base })}`);
  lines.push(`  title: ${scalar({ value: title })}`);

  if (retargeted.length > 0) {
    lines.push(`retargeted[${retargeted.length}]{number,from,to}:`);
    for (const item of retargeted) {
      lines.push(`  ${item.number},${scalar({ value: item.from })},${scalar({ value: item.to })}`);
    }
  } else {
    lines.push('retargeted[0]{number,from,to}:');
  }

  if (warnings.length > 0) {
    lines.push(`warnings[${warnings.length}]:`);
    for (const warning of warnings) {
      lines.push(`  ${JSON.stringify(warning)}`);
    }
  } else {
    lines.push('warnings[0]:');
  }

  console.log(lines.join('\n'));
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));

  if (!runGit({ args: ['rev-parse', '--is-inside-work-tree'], allowFailure: true }).ok) {
    throw new Error('Run this from inside the Nexus git repository.');
  }

  const branch = runGit({ args: ['symbolic-ref', '--short', 'HEAD'], allowFailure: true }).stdout;
  if (!branch) {
    throw new Error('HEAD is detached; check out a feature branch first.');
  }
  if (branch === 'develop' || branch === 'main') {
    throw new Error(`Refusing to open a PR from ${branch}. Check out a feature branch.`);
  }

  const remoteUrl = runGit({ args: ['remote', 'get-url', args.remote], allowFailure: true });
  if (!remoteUrl.ok) {
    throw new Error(`Remote ${args.remote} does not exist.`);
  }
  const repo = args.repo
    ? parseRepoSlug({ slug: args.repo })
    : parseRepoUrl({ url: remoteUrl.stdout });

  if (!args.dryRun && !token) {
    throw new Error('GITHUB_TOKEN or GH_TOKEN is required. Add it to your shell environment.');
  }

  const status = runGit({ args: ['status', '--porcelain'], allowFailure: true }).stdout;
  if (status) {
    warnings.push('Working tree has uncommitted changes; they will not be pushed.');
  }

  if (!args.dryRun) {
    // Pass the token through git's env config instead of argv so it does not
    // show up in the process list.
    const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
    const push = ['push', '-u', args.remote, 'HEAD'];
    if (args.force) push.splice(1, 0, '--force-with-lease');
    runGit({
      args: push,
      env: {
        GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0: 'http.extraHeader',
        GIT_CONFIG_VALUE_0: `Authorization: Basic ${basic}`,
      },
    });
  }

  const fetched = runGit({ args: ['fetch', '--prune', args.remote], allowFailure: true });
  if (!fetched.ok) {
    warnings.push(`git fetch ${args.remote} failed; using existing refs.`);
  }

  const mergedHeads = await loadMergedHeads({ slug: repo.slug });
  if (!token) {
    warnings.push('No token: skipped GitHub checks (existing PR, merged PR fallback).');
  }

  const { base, source: baseSource } = detectBase({
    args,
    remote: args.remote,
    branch,
    mergedHeads,
  });
  const baseRef = `${args.remote}/${base}`;
  const commits = readCommits({ baseRef });
  if (commits.length === 0) {
    throw new Error(`No commits between ${baseRef} and HEAD. Commit your work first.`);
  }

  const title = composeTitle({ args, branch, commits });
  const body = args.bodyFile
    ? await readBodyFile({ path: args.bodyFile })
    : composeBody({ commits });
  if (!body) {
    throw new Error('PR body is empty.');
  }
  const bodyFile = args.bodyFile ?? (await writeBodyPreview({ body }));

  let action = 'unknown';
  let pr: PullRequest | undefined;
  let retargeted: Retarget[] = [];

  if (args.dryRun) {
    if (token) {
      pr = await findOpenPullRequest({ repo, branch });
      action = pr ? 'would-update' : 'would-create';
      retargeted = await syncRetargets({
        repo,
        remote: args.remote,
        mergedHeads,
        args,
        apply: false,
      });
    }
  } else {
    const result = await syncPullRequest({ repo, branch, base, title, body, args });
    action = result.action;
    pr = result.pr;
    retargeted = await syncRetargets({
      repo,
      remote: args.remote,
      mergedHeads,
      args,
      apply: true,
    });
  }

  printResult({
    args,
    repo,
    branch,
    base,
    baseSource,
    bodyFile,
    commits,
    title,
    action,
    pr,
    retargeted,
  });
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`pr: ${scrub(message)}`);
  process.exit(1);
});
