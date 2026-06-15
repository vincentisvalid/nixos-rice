# AMD GPU (amdgpu). Covers modern Radeon cards / APUs.
{ pkgs, ... }:

{
  hardware.graphics = {
    enable = true;
    enable32Bit = true;
    extraPackages = with pkgs; [
      vaapiVdpau
      libvdpau-va-gl
    ];
    extraPackages32 = with pkgs.pkgsi686Linux; [
      vaapiVdpau
      libvdpau-va-gl
    ];
  };

  services.xserver.videoDrivers = [ "amdgpu" ];
}
