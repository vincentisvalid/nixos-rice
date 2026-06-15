// Thin promise wrapper around child_process.spawn.
//
// Every command is appended to the install log, and stdout/stderr are streamed
// back to the caller via onData so the TUI can show live progress. Resolves
// (never rejects) with { code, stdout, stderr } so callers can branch on code.

import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';

export const LOG_PATH = '/tmp/nixos-rice-install.log';

export function log(line) {
  try {
    appendFileSync(LOG_PATH, line.endsWith('\n') ? line : line + '\n');
  } catch {
    /* logging is best-effort */
  }
}

// Run a command. `input`, if given, is written to the child's stdin (used for
// piping a password to chpasswd without putting it in argv or the log).
export function sh(cmd, args = [], { onData, input, secret = false } = {}) {
  return new Promise((resolve) => {
    log(`\n$ ${cmd} ${secret ? '(args hidden)' : args.join(' ')}`);
    const child = spawn(cmd, args, {
      stdio: [input != null ? 'pipe' : 'ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const handle = (buf, isErr) => {
      const s = buf.toString();
      if (isErr) stderr += s;
      else stdout += s;
      log(s.replace(/\n$/, ''));
      if (onData) onData(s);
    };

    child.stdout.on('data', (d) => handle(d, false));
    child.stderr.on('data', (d) => handle(d, true));

    if (input != null) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.on('error', (err) => {
      const msg = `spawn error: ${err.message}`;
      log(msg);
      resolve({ code: 127, stdout, stderr: stderr + msg });
    });
    child.on('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

// Convenience: run a bash snippet.
export function bash(script, opts = {}) {
  return sh('bash', ['-euo', 'pipefail', '-c', script], opts);
}
