# Per-machine settings. The installer overwrites this file with your choices;
# you can also edit it by hand and run `sudo nixos-rebuild switch --flake /etc/nixos`.
#
# gpu must match a file name in ./modules/gpu/ (without the .nix extension):
#   "nvidia-open" | "nvidia" | "amd" | "intel"
{
  username  = "user";
  hostname  = "nixos";
  gpu       = "nvidia-open";
  timezone  = "Europe/Copenhagen";
  locale    = "en_US.UTF-8";
}
