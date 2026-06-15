# Intel integrated graphics (modesetting driver + media acceleration).
{ pkgs, ... }:

{
  hardware.graphics = {
    enable = true;
    enable32Bit = true;
    extraPackages = with pkgs; [
      intel-media-driver # Broadwell+ (recommended)
      vaapiVdpau
      libvdpau-va-gl
    ];
  };

  services.xserver.videoDrivers = [ "modesetting" ];

  environment.sessionVariables = { LIBVA_DRIVER_NAME = "iHD"; };
}
