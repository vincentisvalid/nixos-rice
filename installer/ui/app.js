// nixos-rice installer — Ink TUI wizard.
//
// Screen flow:
//   welcome → disk → diskConfirm → identity → gpu [→ gpuNvidia] → swap
//           → summary → run → done
//
// The heavy lifting (partition / format / install) lives in ../lib/steps.js.
// This file is purely the interactive front-end + the step runner.

import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useApp, useInput } from 'ink';

import Select from './Select.js';
import TextInput from './TextInput.js';
import Spinner from './Spinner.js';
import { listDisks } from '../lib/disk.js';
import { buildSteps } from '../lib/steps.js';
import { sh, LOG_PATH } from '../lib/sh.js';

const e = React.createElement;

const REPO_URL = process.env.REPO_URL || 'https://github.com/vincentisvalid/nixos-rice';
const WALLPAPERS_URL = 'https://github.com/ilyamiro/shell-wallpapers';

function Title() {
  return e(
    Box,
    { flexDirection: 'column', marginBottom: 1 },
    e(Text, { bold: true, color: 'magenta' }, '  nixos-rice installer'),
    e(Text, { color: 'gray' }, '  ilyamiro’s rice on NixOS · flakes · home-manager')
  );
}

function keepTail(buf, max = 14) {
  const lines = buf.split('\n');
  return lines.slice(Math.max(0, lines.length - max)).join('\n');
}

// --- Identity sub-form ------------------------------------------------------

function IdentityForm({ initial, onDone }) {
  const fields = [
    { key: 'username', label: 'Username', placeholder: 'e.g. neo',
      validate: (v) => (/^[a-z_][a-z0-9_-]*$/.test(v) ? null : 'lowercase letters/digits/_/-, must start with a letter or _') },
    { key: 'hostname', label: 'Hostname', placeholder: 'e.g. nixos',
      validate: (v) => (/^[a-zA-Z0-9-]+$/.test(v) ? null : 'letters, digits and - only') },
    { key: 'password', label: 'Password', mask: '*',
      validate: (v) => (v.length >= 1 ? null : 'cannot be empty') },
    { key: 'passwordConfirm', label: 'Confirm password', mask: '*',
      validate: (v, vals) => (v === vals.password ? null : 'passwords do not match') },
    { key: 'timezone', label: 'Timezone', placeholder: 'Region/City',
      validate: (v) => (/^[A-Za-z]+\/[A-Za-z_]+/.test(v) ? null : 'e.g. Europe/Copenhagen') },
    { key: 'locale', label: 'Locale',
      validate: (v) => (v.includes('.') ? null : 'e.g. en_US.UTF-8') },
  ];

  const [values, setValues] = useState({
    username: '', hostname: 'nixos', password: '', passwordConfirm: '',
    timezone: 'Europe/Copenhagen', locale: 'en_US.UTF-8', ...initial,
  });
  const [idx, setIdx] = useState(0);
  const [error, setError] = useState(null);

  const field = fields[idx];

  const submit = (v) => {
    const err = field.validate ? field.validate(v, values) : null;
    if (err) { setError(err); return; }
    setError(null);
    if (idx + 1 < fields.length) setIdx(idx + 1);
    else onDone(values);
  };

  return e(
    Box,
    { flexDirection: 'column' },
    e(Text, { bold: true }, 'System identity'),
    e(Text, { color: 'gray' }, 'Enter to confirm each field.'),
    e(Box, { marginTop: 1, flexDirection: 'column' },
      ...fields.map((f, i) => {
        const isActive = i === idx;
        const shownVal = f.mask && values[f.key] ? '*'.repeat(values[f.key].length) : values[f.key];
        return e(
          Box, { key: f.key },
          e(Text, { color: isActive ? 'cyan' : 'gray' }, (isActive ? '❯ ' : '  ') + f.label.padEnd(18) + ': '),
          isActive
            ? e(TextInput, {
                value: values[f.key],
                mask: f.mask,
                placeholder: f.placeholder || '',
                onChange: (val) => setValues({ ...values, [f.key]: val }),
                onSubmit: submit,
              })
            : e(Text, { color: 'gray' }, shownVal || '')
        );
      })
    ),
    error ? e(Text, { color: 'red' }, '  ✗ ' + error) : null
  );
}

// --- Main app ---------------------------------------------------------------

export default function App() {
  const { exit } = useApp();
  const [screen, setScreen] = useState('welcome');

  const [disks, setDisks] = useState(null);
  const [cfg, setCfg] = useState({
    disk: '', swapGiB: 0, username: '', hostname: 'nixos',
    password: '', gpu: 'nvidia-open', timezone: 'Europe/Copenhagen',
    locale: 'en_US.UTF-8', repoUrl: REPO_URL, wallpapersUrl: WALLPAPERS_URL,
  });
  const [confirmText, setConfirmText] = useState('');
  const [swapText, setSwapText] = useState('0');

  // run-screen state
  const [stepList, setStepList] = useState([]);
  const [stepStates, setStepStates] = useState([]); // 'pending'|'running'|'ok'|'failed'
  const [liveLog, setLiveLog] = useState('');
  const [failure, setFailure] = useState(null); // { title, detail }
  const startedRef = useRef(false);

  // Load disks when entering the disk screen.
  useEffect(() => {
    if (screen === 'disk' && disks === null) {
      listDisks().then(setDisks);
    }
  }, [screen, disks]);

  // Run the pipeline when entering the run screen (once).
  useEffect(() => {
    if (screen !== 'run' || startedRef.current) return;
    startedRef.current = true;

    const steps = buildSteps(cfg);
    setStepList(steps);
    setStepStates(steps.map(() => 'pending'));

    (async () => {
      for (let i = 0; i < steps.length; i += 1) {
        setStepStates((prev) => prev.map((s, j) => (j === i ? 'running' : s)));
        const onData = (chunk) => setLiveLog((prev) => keepTail(prev + chunk));
        let res;
        try {
          res = await steps[i].run(onData);
        } catch (err) {
          res = { ok: false, detail: String(err) };
        }
        if (!res.ok) {
          setStepStates((prev) => prev.map((s, j) => (j === i ? 'failed' : s)));
          setFailure({ title: steps[i].title, detail: (res.detail || '').trim() });
          setScreen('done');
          return;
        }
        setStepStates((prev) => prev.map((s, j) => (j === i ? 'ok' : s)));
      }
      setScreen('done');
    })();
  }, [screen, cfg]);

  // ---- Screens ----

  if (screen === 'welcome') {
    return e(
      Box, { flexDirection: 'column', padding: 1 },
      e(Title),
      e(Text, null, 'This will install NixOS with ilyamiro’s Hyprland rice (flakes + home-manager).'),
      e(Box, { marginY: 1, borderStyle: 'round', borderColor: 'red', paddingX: 1, flexDirection: 'column' },
        e(Text, { color: 'red', bold: true }, '⚠  DESTRUCTIVE'),
        e(Text, null, 'The disk you select will be COMPLETELY ERASED. Back up anything important first.')
      ),
      process.getuid && process.getuid() !== 0
        ? e(Text, { color: 'yellow' }, 'Warning: not running as root — the install steps will fail. Re-run with sudo.')
        : null,
      e(Box, { marginTop: 1 },
        e(Select, {
          items: [
            { label: 'Continue', value: 'go' },
            { label: 'Quit', value: 'quit' },
          ],
          onSelect: (it) => (it.value === 'go' ? setScreen('disk') : exit()),
        })
      )
    );
  }

  if (screen === 'disk') {
    return e(
      Box, { flexDirection: 'column', padding: 1 },
      e(Title),
      e(Text, { bold: true }, 'Select the target disk (it will be erased):'),
      e(Box, { marginTop: 1 },
        disks === null
          ? e(Text, { color: 'gray' }, e(Spinner), ' scanning disks…')
          : disks.length === 0
            ? e(Text, { color: 'red' }, 'No disks found.')
            : e(Select, {
                items: disks,
                onSelect: (it) => { setCfg({ ...cfg, disk: it.value }); setConfirmText(''); setScreen('diskConfirm'); },
              })
      )
    );
  }

  if (screen === 'diskConfirm') {
    const matches = confirmText.trim() === cfg.disk;
    return e(
      Box, { flexDirection: 'column', padding: 1 },
      e(Title),
      e(Text, { color: 'red', bold: true }, `You are about to ERASE ${cfg.disk}.`),
      e(Text, null, `Type the device name (${cfg.disk}) to confirm, then Enter:`),
      e(Box, { marginTop: 1 },
        e(Text, null, '  > '),
        e(TextInput, {
          value: confirmText,
          onChange: setConfirmText,
          onSubmit: () => { if (matches) setScreen('identity'); },
        })
      ),
      confirmText && !matches ? e(Text, { color: 'yellow' }, '  does not match yet') : null
    );
  }

  if (screen === 'identity') {
    return e(
      Box, { flexDirection: 'column', padding: 1 },
      e(Title),
      e(IdentityForm, {
        initial: { hostname: cfg.hostname, timezone: cfg.timezone, locale: cfg.locale },
        onDone: (vals) => {
          setCfg({ ...cfg, username: vals.username, hostname: vals.hostname, password: vals.password, timezone: vals.timezone, locale: vals.locale });
          setScreen('gpu');
        },
      })
    );
  }

  if (screen === 'gpu') {
    return e(
      Box, { flexDirection: 'column', padding: 1 },
      e(Title),
      e(Text, { bold: true }, 'Graphics card vendor:'),
      e(Box, { marginTop: 1 },
        e(Select, {
          items: [
            { label: 'NVIDIA', value: 'nvidia' },
            { label: 'AMD', value: 'amd' },
            { label: 'Intel', value: 'intel' },
          ],
          onSelect: (it) => {
            if (it.value === 'nvidia') setScreen('gpuNvidia');
            else { setCfg({ ...cfg, gpu: it.value }); setScreen('swap'); }
          },
        })
      )
    );
  }

  if (screen === 'gpuNvidia') {
    return e(
      Box, { flexDirection: 'column', padding: 1 },
      e(Title),
      e(Text, { bold: true }, 'NVIDIA kernel module:'),
      e(Text, { color: 'gray' }, 'Open is recommended for Turing/Ampere/Ada (RTX 20xx–40xx).'),
      e(Box, { marginTop: 1 },
        e(Select, {
          items: [
            { label: 'nvidia-open (recommended, e.g. RTX 4090)', value: 'nvidia-open' },
            { label: 'proprietary (older GPUs / fallback)', value: 'nvidia' },
          ],
          onSelect: (it) => { setCfg({ ...cfg, gpu: it.value }); setScreen('swap'); },
        })
      )
    );
  }

  if (screen === 'swap') {
    const n = parseInt(swapText, 10);
    const valid = !Number.isNaN(n) && n >= 0;
    return e(
      Box, { flexDirection: 'column', padding: 1 },
      e(Title),
      e(Text, { bold: true }, 'Swap partition size in GiB (0 for none):'),
      e(Box, { marginTop: 1 },
        e(Text, null, '  > '),
        e(TextInput, {
          value: swapText,
          onChange: setSwapText,
          onSubmit: () => { if (valid) { setCfg({ ...cfg, swapGiB: n }); setScreen('summary'); } },
        })
      ),
      !valid ? e(Text, { color: 'yellow' }, '  enter a whole number ≥ 0') : null
    );
  }

  if (screen === 'summary') {
    const row = (k, v) => e(Box, { key: k }, e(Text, { color: 'gray' }, '  ' + k.padEnd(12) + ': '), e(Text, null, String(v)));
    return e(
      Box, { flexDirection: 'column', padding: 1 },
      e(Title),
      e(Text, { bold: true }, 'Review:'),
      e(Box, { flexDirection: 'column', marginY: 1 },
        row('Disk', cfg.disk + '  (WILL BE ERASED)'),
        row('Username', cfg.username),
        row('Hostname', cfg.hostname),
        row('GPU', cfg.gpu),
        row('Swap', cfg.swapGiB > 0 ? cfg.swapGiB + ' GiB' : 'none'),
        row('Timezone', cfg.timezone),
        row('Locale', cfg.locale),
        row('Config', cfg.repoUrl)
      ),
      e(Select, {
        items: [
          { label: 'Install now', value: 'install' },
          { label: 'Start over', value: 'restart' },
          { label: 'Quit', value: 'quit' },
        ],
        onSelect: (it) => {
          if (it.value === 'install') setScreen('run');
          else if (it.value === 'restart') setScreen('welcome');
          else exit();
        },
      })
    );
  }

  if (screen === 'run') {
    return e(
      Box, { flexDirection: 'column', padding: 1 },
      e(Title),
      e(Text, { bold: true }, 'Installing…'),
      e(Box, { flexDirection: 'column', marginY: 1 },
        ...stepList.map((s, i) => {
          const st = stepStates[i];
          const mark = st === 'ok' ? e(Text, { color: 'green' }, '✓')
            : st === 'failed' ? e(Text, { color: 'red' }, '✗')
            : st === 'running' ? e(Spinner)
            : e(Text, { color: 'gray' }, '•');
          return e(Box, { key: i }, mark, e(Text, { color: st === 'pending' ? 'gray' : undefined }, ' ' + s.title));
        })
      ),
      e(Box, { flexDirection: 'column', borderStyle: 'round', borderColor: 'gray', paddingX: 1 },
        e(Text, { color: 'gray' }, 'log tail:'),
        ...liveLog.split('\n').slice(-10).map((l, i) => e(Text, { key: i, color: 'gray' }, l))
      )
    );
  }

  // screen === 'done'
  if (failure) {
    return e(
      Box, { flexDirection: 'column', padding: 1 },
      e(Title),
      e(Text, { color: 'red', bold: true }, '✗ Installation failed'),
      e(Text, null, 'Step: ' + failure.title),
      e(Box, { flexDirection: 'column', marginY: 1, borderStyle: 'round', borderColor: 'red', paddingX: 1 },
        ...((failure.detail || 'no stderr captured').split('\n').slice(-12).map((l, i) => e(Text, { key: i, color: 'red' }, l)))
      ),
      e(Text, { color: 'gray' }, 'Full log: ' + LOG_PATH),
      e(Text, { color: 'gray' }, 'Fix the issue, then re-run the installer.'),
      e(Box, { marginTop: 1 },
        e(Select, {
          items: [{ label: 'Quit to shell', value: 'quit' }],
          onSelect: () => exit(),
        })
      )
    );
  }

  return e(
    Box, { flexDirection: 'column', padding: 1 },
    e(Title),
    e(Text, { color: 'green', bold: true }, '✓ NixOS installed successfully!'),
    e(Text, null, 'Your rice is installed. Remove the USB after powering off.'),
    e(Box, { marginTop: 1 },
      e(Select, {
        items: [
          { label: 'Reboot now', value: 'reboot' },
          { label: 'Quit to shell (reboot later)', value: 'quit' },
        ],
        onSelect: (it) => {
          if (it.value === 'reboot') sh('reboot', []);
          exit();
        },
      })
    )
  );
}
