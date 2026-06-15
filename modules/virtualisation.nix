# QEMU/KVM + virt-manager with a working default NAT network.
#
# Imported by apps.nix when "QEMU + virt-manager" is selected in the installer.
# NixOS doesn't ship libvirt's "default" network, so we define + autostart it
# here, which is what makes guest networking work out of the box.
{ config, pkgs, lib, ... }:

let
  # Standard libvirt "default" NAT network (virbr0, 192.168.122.0/24 + DHCP).
  defaultNetXml = pkgs.writeText "libvirt-default-net.xml" ''
    <network>
      <name>default</name>
      <forward mode='nat'/>
      <bridge name='virbr0' stp='on' delay='0'/>
      <ip address='192.168.122.1' netmask='255.255.255.0'>
        <dhcp>
          <range start='192.168.122.2' end='192.168.122.254'/>
        </dhcp>
      </ip>
    </network>
  '';
in
{
  virtualisation.libvirtd = {
    enable = true;
    qemu.ovmf.enable = true;   # UEFI guests
    qemu.swtpm.enable = true;  # emulated TPM (Windows 11 guests)
  };
  programs.virt-manager.enable = true;

  # libvirt's NAT bridge can trip strict reverse-path filtering.
  networking.firewall.checkReversePath = lib.mkDefault "loose";

  # Define, start and autostart the default network once libvirtd is up.
  systemd.services.libvirt-default-net = {
    description = "Define and start the libvirt default NAT network";
    after = [ "libvirtd.service" ];
    requires = [ "libvirtd.service" ];
    wantedBy = [ "multi-user.target" ];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
    };
    script = ''
      virsh=${pkgs.libvirt}/bin/virsh
      if ! $virsh net-info default >/dev/null 2>&1; then
        $virsh net-define ${defaultNetXml}
      fi
      $virsh net-start default 2>/dev/null || true
      $virsh net-autostart default 2>/dev/null || true
    '';
  };
}
