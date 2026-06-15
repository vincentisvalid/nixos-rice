// Disk discovery for the disk-selection screen.

import { sh } from './sh.js';

function humanSize(bytes) {
  const units = ['B', 'K', 'M', 'G', 'T', 'P'];
  let n = Number(bytes);
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)}${units[i]}`;
}

// Returns whole disks only (type=disk), skipping loop/rom/zram and the live USB
// if we can detect it. Each item: { name: '/dev/nvme0n1', size, model, label }.
export async function listDisks() {
  const res = await sh('lsblk', ['-dpnbo', 'NAME,SIZE,TYPE,MODEL,RM']);
  if (res.code !== 0) return [];

  const disks = [];
  for (const line of res.stdout.split('\n')) {
    if (!line.trim()) continue;
    // NAME SIZE TYPE [MODEL...] RM   — MODEL may contain spaces, RM is last col.
    const parts = line.trim().split(/\s+/);
    const name = parts[0];
    const size = parts[1];
    const type = parts[2];
    const removable = parts[parts.length - 1] === '1';
    const model = parts.slice(3, parts.length - 1).join(' ') || 'unknown';

    if (type !== 'disk') continue;
    if (/\/dev\/(zram|loop|sr)/.test(name)) continue;

    disks.push({
      name,
      size,
      model,
      removable,
      label: `${name}  ${humanSize(size).padStart(6)}  ${model}${removable ? '  (removable)' : ''}`,
      value: name,
    });
  }
  return disks;
}
