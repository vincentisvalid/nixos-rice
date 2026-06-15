# Edit this configuration file to define what should be installed on
# your system. Help is available in the configuration.nix(5) man page
# and in the NixOS manual (accessible by running ‘nixos-help’).

{ config, pkgs, lib, username, host, inputs, ... }:

{
  # Imports
  imports =
    [ # Include the results of the hardware scan.
      ./hardware-configuration.nix
      # GPU drivers, selected via host.nix (nvidia-open / nvidia / amd / intel).
      (./modules/gpu + "/${host.gpu}.nix")
      # Optional applications chosen in the installer (generated; empty by default).
      ./apps.nix
    ];
  # NOTE: home-manager is wired up as a flake module in flake.nix, not here.

  # System packages
  environment.systemPackages = with pkgs; [
    wget 
    taskwarrior3
    inotify-tools
    lavat
    file
    pipes
    glaxnimate
    clock-rs
    cbonsai
    git
    android-tools
    killall
    btop  
    mpv
    zenity
    matugen
    gpu-screen-recorder
    neovim 
    fzf
    inkscape
    direnv
    zbar
    python311
    ffmpeg
    # NOTE: `python314` from the original config is not packaged in nixpkgs as of
    # this writing. python311 above covers the rice's scripts; re-add a specific
    # interpreter here (e.g. python312) if you need a newer one.
    telegram-desktop
    pkgs.onlyoffice-desktopeditors
    kitty
    libreoffice-qt
    hunspell
    hunspellDicts.ru_RU
    hunspellDicts.en_US
    obsidian
    p7zip
    papers
    fastfetch
    jetbrains.idea-community
    quickshell
    gnome-shell-extensions
    # OBS Studio with the Composite Blur plugin bundled in.
    (wrapOBS { plugins = with obs-studio-plugins; [ obs-composite-blur ]; })
    grim
    playerctl
    satty
    yq-go
    xdg-desktop-portal-gtk
    eww
    swappy
    slurp
    mpvpaper
    gnome-tweaks
    pkgsCross.mingwW64.stdenv.cc
    wmctrl
    bottles
    qbittorrent
    power-profiles-daemon
    # NOTE: `jdk8` is marked insecure in nixpkgs and will fail to build unless you
    # allow it. If you need Java 8, uncomment it AND add to nix settings below:
    #   nixpkgs.config.permittedInsecurePackages = [ "openjdk-8...." ];
    # jdk8
    steam-run
  ]
  # Firefox (with PipeWire screen-sharing). Installed unless chromium was chosen
  # in the installer (host.browser = "chromium"), which "uninstalls" Firefox.
  ++ lib.optional ((host.browser or "firefox") == "firefox")
    (pkgs.wrapFirefox (pkgs.firefox-unwrapped.override { pipewireSupport = true; }) {});

  environment.pathsToLink = [ "/share/gsettings-schemas" ];

  # User accounts and security
  users.users.${username} = {
    isNormalUser = true;
    description = username;
    extraGroups = [ "networkmanager" "wheel" "video" "libvirtd"];
    packages = with pkgs; [
    #  thunderbird
    ];
    useDefaultShell = true;
    shell = pkgs.zsh;
  };    

  users.defaultUserShell = pkgs.zsh;
  system.userActivationScripts.zshrc = "touch .zshrc";

  security.sudo.extraRules = [
    {
      users = [ username ];
      commands = [
        {
          command = "ALL";
          options = [ "NOPASSWD" ];
        }
      ];
    }
  ];

  services.logind.settings.Login = {
    HandlePowerKey = "ignore";
  }; 
  # Program configurations
  programs.zsh.enable = true;

  # adb/fastboot: `programs.adb` was removed (systemd 258 handles the uaccess
  # udev rules automatically). The binaries come from android-tools below.

  # Install firefox (unless chromium was chosen in the installer).
  programs.firefox.enable = (host.browser or "firefox") == "firefox";

  programs.dconf = {
    enable = true;
  };

  # Steam is an optional app (enabled via apps.nix / the installer checklist,
  # default-checked) so it can actually be opted out of. gamemode stays on.
  programs.gamemode.enable = true;

  # Home manager is configured in flake.nix (home-manager.users.${username}).

  # Desktop environment, window managers and theme
  services.xserver.enable = true;

  # Login manager: ly (lightweight TUI greeter). Pick the session (Hyprland /
  # GNOME) from its menu at login.
  services.displayManager.ly.enable = true;
  # GNOME desktop is still installed (the rice relies on nautilus, gsettings,
  # gnome-tweaks, etc.); only the display manager changed.
  services.desktopManager.gnome.enable = true;
  
  # Hyprland
  programs.hyprland.enable = true;
  
  # XDG Portals
  xdg.portal = {
    enable = true;
    extraPortals = with pkgs; [
      xdg-desktop-portal-gtk
    ];
  };

  # Configure keymap in X11
  services.xserver.xkb = {
    layout = "us,ru";
    variant = "";
  };

  # Fonts
  fonts.packages = with pkgs; [
    udev-gothic-nf
    noto-fonts
    liberation_ttf
  ]; 

  fonts.fontconfig = {
    enable = true;
    hinting.style = "slight"; 
    subpixel.rgba = "rgb"; 
  };

  # Flatpak
  services.flatpak.enable = true;

  # Environment Variables
  # environment.variables.XDG_DATA_DIRS = lib.mkForce "/home/ilyamiro/.nix-profile/share:/run/current-system/sw/share";

  # Networking and time
  networking.hostName = host.hostname;
  
  networking.networkmanager = {
    enable = true;
    wifi.powersave = false; 
  };
   # Set your time zone.
  time.timeZone = host.timezone;

  # Select internationalisation properties.
  i18n.defaultLocale = host.locale;

  i18n.extraLocaleSettings = {
    LC_ADDRESS = "en_US.UTF-8";
    LC_IDENTIFICATION = "en_US.UTF-8";
    LC_MEASUREMENT = "en_US.UTF-8";
    LC_MONETARY = "en_US.UTF-8";
    LC_NAME = "en_US.UTF-8";
    LC_NUMERIC = "en_US.UTF-8";
    LC_PAPER = "en_US.UTF-8";
    LC_TELEPHONE = "en_US.UTF-8";
    LC_TIME = "en_US.UTF-8";
  };

  # Audio and system services
  services.pulseaudio.enable = false;
  security.rtkit.enable = true;
  services.pipewire = {
    enable = true;
    alsa.enable = true;
    alsa.support32Bit = true;
    pulse.enable = true;
  };
  services.blueman.enable = true;
  # Enable the Bluetooth radio itself (blueman is just the applet). Without this
  # the rice's network/Bluetooth panel can't see the adapter.
  hardware.bluetooth.enable = true;
  hardware.bluetooth.powerOnBoot = true;

  # Enable CUPS to print documents.
  services.printing.enable = true;

  # Enable the OpenSSH daemon.
  services.openssh.enable = true;

  # Power Management Services
  services.power-profiles-daemon.enable = true; 

  # Nix settings and maintenance
  nixpkgs.config.allowUnfree = true;

  nix.settings.experimental-features = [ "nix-command" "flakes" ];

  nix.gc = {
    automatic = true;
    dates = "daily";
    options = "--delete-older-than 14d";
  };
  boot = {
    plymouth = {
      enable = true;
      theme = "simple";
      themePackages = [
        (pkgs.stdenv.mkDerivation {
          pname = "plymouth-theme-simple";
          version = "1.0";
          
          # Path is relative to this flake, so it works regardless of checkout location.
          src = ./config/programs/plymouth/simple;

          installPhase = ''
            mkdir -p $out/share/plymouth/themes/simple
            cp -r * $out/share/plymouth/themes/simple/
            
            # This dynamically replaces the @out@ placeholder with the real Nix store path
            substituteInPlace $out/share/plymouth/themes/simple/simple.plymouth \
              --replace "@out@" "$out"
          '';
        })      
	];
    };

    consoleLogLevel = 0;
    initrd.verbose = false;
    kernelParams = [
      "quiet"
      "splash"
      "boot.shell_on_fail"
      "loglevel=3"
      "rd.systemd.show_status=false"
      "rd.udev.log_level=3"
      "udev.log_priority=3"
      "tsc=reliable"
      # Laptop/ASUS-specific params from the original config were removed
      # (amd_pstate=active, asus_wmi). Re-add machine-specific params here.
    ];
    
  };
  # Virtualization
  virtualisation.libvirtd.enable = true;
  programs.virt-manager.enable = true;
	
  # Bootloader and kernel — GRUB in UEFI mode.
  boot.loader.grub = {
    enable = true;
    efiSupport = true;
    device = "nodev";        # EFI install, not a BIOS disk target
    useOSProber = true;      # detect other OSes for dual-boot menus
  };
  boot.loader.efi.canTouchEfiVariables = true;
  boot.loader.efi.efiSysMountPoint = "/boot";

  # Kernel Packages and Optimization
  boot.kernelPackages = pkgs.linuxPackages_latest;
  # CPU microcode is enabled automatically by hardware-configuration.nix
  # (nixos-generate-config detects AMD vs Intel on the target machine).

  boot.kernelModules = [ "tcp_bbr" ]; # FIX: Network Congestion Control (Helps with packet jitter)
  boot.kernel.sysctl = {
    "net.ipv4.tcp_congestion_control" = "bbr";
    "net.core.default_qdisc" = "fq";
    "net.core.wmem_max" = 1073741824;
    "net.core.rmem_max" = 1073741824;
    "net.ipv4.tcp_rmem" = "4096 87380 1073741824";
    "net.ipv4.tcp_wmem" = "4096 87380 1073741824";
  };

  # FIX: Force CPU to run at max clock speed to prevent frame-time jitter
  powerManagement.cpuFreqGovernor = "performance";

  # ==========================================
  # GPU / GRAPHICS CONFIGURATION
  # ==========================================
  # GPU drivers live in ./modules/gpu/<vendor>.nix and are imported at the top
  # of this file based on host.gpu. The original inline NVIDIA/PRIME hybrid block
  # (laptop-specific bus IDs) was removed in favour of those modules.

  system.stateVersion = "25.11";
}
