#!/usr/bin/env bash
#
# Bootstrap for the nixos-rice Ink TUI installer.
#
# Run from a NixOS minimal ISO live session (as root):
#
#   sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/vincentisvalid/nixos-rice/master/installer/install.sh)"
#
# It pulls Node + git into a temporary nix-shell, fetches this repo, installs the
# installer's npm deps, and launches the TUI which does the actual install.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/vincentisvalid/nixos-rice}"
WORKDIR="${WORKDIR:-/tmp/nixos-rice}"

red()  { printf '\033[31m%s\033[0m\n' "$*"; }
grn()  { printf '\033[32m%s\033[0m\n' "$*"; }
ylw()  { printf '\033[33m%s\033[0m\n' "$*"; }

# --- Preflight checks -------------------------------------------------------

if [ "$(id -u)" -ne 0 ]; then
  red "This installer must run as root. Re-run with sudo."
  exit 1
fi

if [ ! -d /sys/firmware/efi ]; then
  red "This system is not booted in UEFI mode."
  red "The nixos-rice config uses GRUB in UEFI mode and assumes an EFI system partition."
  red "Reboot the ISO in UEFI mode and try again."
  exit 1
fi

if ! command -v nix-shell >/dev/null 2>&1; then
  red "nix-shell not found. Run this from a NixOS minimal ISO live session."
  exit 1
fi

if ! ping -c1 -W3 github.com >/dev/null 2>&1; then
  ylw "Warning: couldn't reach github.com. The installer needs network access."
  ylw "Connect to the internet (e.g. 'nmtui' or 'iwctl') and re-run."
fi

grn ">> Fetching the nixos-rice repo into ${WORKDIR} ..."

# --- Drop into a nix-shell with everything the installer needs ---------------
# nodejs: run the Ink TUI. git: clone repos. The disk/partition/install tooling
# (gptfdisk, parted, dosfstools, e2fsprogs, util-linux, nixos-install-tools) is
# invoked by the TUI, so it must be on PATH inside this shell too.
exec nix-shell \
  -p nodejs_22 git gptfdisk parted dosfstools e2fsprogs util-linux nixos-install-tools \
  --run "
    set -e
    rm -rf '${WORKDIR}'
    git clone --depth 1 '${REPO_URL}' '${WORKDIR}'
    cd '${WORKDIR}/installer'
    echo '>> Installing installer dependencies (npm) ...'
    npm install --no-audit --no-fund --loglevel=error
    echo '>> Launching installer ...'
    REPO_URL='${REPO_URL}' node cli.js
  "
