# NVIDIA with the open kernel module (recommended for Turing/Ampere/Ada+,
# e.g. the RTX 4090). Desktop / single-GPU setup — no PRIME offload.
{ config, ... }:

{
  hardware.graphics = {
    enable = true;
    enable32Bit = true; # needed for Steam / 32-bit games
  };

  services.xserver.videoDrivers = [ "nvidia" ];

  hardware.nvidia = {
    modesetting.enable = true;

    # The open-source kernel module (NOT nouveau). Stable on Ada (4090).
    open = true;

    nvidiaSettings = true;

    # Branch choice for an RTX 4090 (Ada) on linuxPackages_latest:
    #   stable     -> recent + well-tested; builds against the newest kernel  ✅ best here
    #   beta       -> newest features, slightly less tested
    #   production -> most conservative, but OFTEN LAGS kernel support and fails
    #                 to build on linuxPackages_latest. Avoid with the latest kernel.
    # 4090 is fully supported on all branches, so we pick stable for reliability.
    package = config.boot.kernelPackages.nvidiaPackages.stable;

    # Desktop: keep the GPU powered. Fine-grained power management is for
    # laptops and can break suspend on desktops.
    powerManagement.enable = false;
    powerManagement.finegrained = false;
  };
}
