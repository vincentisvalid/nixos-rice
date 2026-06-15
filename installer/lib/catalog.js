// Catalog of optional applications shown in the installer checklist.
//
// Each app contributes some of:
//   pkgs    : bare nixpkgs attribute names (placed inside `with pkgs; [ ... ]`)
//   raw     : raw nix expressions for the package list (e.g. flake-input pkgs)
//   modules : NixOS option snippets (services/programs/firewall ...)
//   imports : module file paths added to apps.nix `imports`
//   default : pre-ticked in the checklist
//
// `ollama` and the firefox/chromium swap and the terminal/file-manager defaults
// are handled specially in steps.js because they depend on other choices
// (GPU vendor, chosen terminal, etc.).

export const GROUPS = [
  {
    title: 'AI / Dev',
    apps: [
      { id: 'opencode', label: 'opencode (terminal AI agent)', pkgs: ['opencode'] },
      { id: 'claude-code', label: 'claude-code', pkgs: ['claude-code'] },
      { id: 'codex', label: 'codex (OpenAI CLI agent)', pkgs: ['codex'] },
      { id: 'antigravity', label: 'antigravity (Google agentic IDE)', pkgs: ['antigravity'] },
      { id: 'ollama', label: 'ollama (local LLM service, GPU-accelerated)' }, // special: see steps.js
    ],
  },
  {
    title: 'Gaming & Emulation',
    apps: [
      { id: 'steam', label: 'Steam', default: true,
        modules: ['programs.steam = {\n    enable = true;\n    remotePlay.openFirewall = true;\n    dedicatedServer.openFirewall = true;\n  };'] },
      { id: 'prismlauncher', label: 'PrismLauncher (Minecraft)', pkgs: ['prismlauncher'] },
      { id: 'pcsx2', label: 'PCSX2 (PS2)', pkgs: ['pcsx2'] },
      { id: 'rpcs3', label: 'RPCS3 (PS3)', pkgs: ['rpcs3'] },
      { id: 'starpsx', label: 'starpsx (PS1, built from source)',
        raw: ['(callPackage ./modules/pkgs/starpsx.nix { inherit (inputs) starpsx; })'] },
    ],
  },
  {
    title: 'Privacy & Security',
    apps: [
      { id: 'mullvad-vpn', label: 'Mullvad VPN', pkgs: ['mullvad-vpn'],
        modules: ['services.mullvad-vpn.enable = true;'] },
      { id: 'tor', label: 'Tor (system daemon)',
        modules: ['services.tor = {\n    enable = true;\n    client.enable = true;\n  };'] },
      { id: 'tor-browser', label: 'Tor Browser', pkgs: ['tor-browser'] },
      { id: 'monero-gui', label: 'Monero GUI wallet', pkgs: ['monero-gui'] },
      { id: 'monero-cli', label: 'Monero CLI', pkgs: ['monero-cli'] },
      { id: 'coyim', label: 'CoyIM (XMPP/Jabber)', pkgs: ['coyim'] },
      { id: 'cinny-desktop', label: 'Cinny (Matrix client)', pkgs: ['cinny-desktop'] },
    ],
  },
  {
    title: 'Communication',
    apps: [
      { id: 'vesktop', label: 'Vesktop (Discord)', pkgs: ['vesktop'] },
      { id: 'thunderbird', label: 'Thunderbird (email)', pkgs: ['thunderbird'] },
    ],
  },
  {
    title: 'Utilities',
    apps: [
      { id: 'localsend', label: 'LocalSend (file sharing)', pkgs: ['localsend'],
        modules: ['networking.firewall.allowedTCPPorts = [ 53317 ];\n  networking.firewall.allowedUDPPorts = [ 53317 ];'] },
      { id: 'qemu', label: 'QEMU + virt-manager (with NAT networking)',
        imports: ['./modules/virtualisation.nix'] },
      { id: 'boo', label: 'boo (ghostty multiplexer, built from source)',
        raw: ['inputs.boo.packages.${pkgs.system}.default'] },
    ],
  },
  {
    title: 'Browser',
    apps: [
      // Selecting chromium sets host.browser = "chromium" (uninstalls Firefox).
      { id: 'chromium', label: 'Chromium (replaces Firefox)', pkgs: ['chromium'] },
    ],
  },
  {
    title: 'Terminal',
    apps: [
      // Selecting ghostty makes it the default terminal (Super+Return).
      { id: 'ghostty', label: 'Ghostty (set as default terminal)', pkgs: ['ghostty'] },
    ],
  },
];

// Flat lookup by id.
export const APPS = Object.fromEntries(
  GROUPS.flatMap((g) => g.apps.map((a) => [a.id, a]))
);

export const ALL_IDS = GROUPS.flatMap((g) => g.apps.map((a) => a.id));

export const DEFAULT_IDS = GROUPS.flatMap((g) =>
  g.apps.filter((a) => a.default).map((a) => a.id)
);
