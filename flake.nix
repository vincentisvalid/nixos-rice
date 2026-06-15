{
  description = "ilyamiro's rice, adapted to NixOS with flakes (see README for credits)";

  inputs = {
    # Tracks nixos-unstable: the config uses linuxPackages_latest, quickshell,
    # matugen, and a 25.11 stateVersion, so a rolling channel is the right fit.
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

    home-manager = {
      url = "github:nix-community/home-manager";
      # Keep home-manager's nixpkgs aligned with ours to avoid version skew.
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, home-manager, ... }:
    let
      # Per-machine knobs. The installer (installer/) overwrites this file with
      # the values chosen in the TUI. Editing it by hand is fully supported.
      host = import ./host.nix;
      inherit (host) username hostname;
      system = "x86_64-linux";
    in
    {
      nixosConfigurations.${hostname} = nixpkgs.lib.nixosSystem {
        inherit system;

        # Made available to configuration.nix as function arguments.
        specialArgs = { inherit username hostname host; };

        modules = [
          ./configuration.nix
          home-manager.nixosModules.home-manager
          {
            home-manager.useGlobalPkgs = true;
            home-manager.useUserPackages = true;
            home-manager.backupFileExtension = "backup";
            # Passed through to home.nix and every imported home-manager module.
            home-manager.extraSpecialArgs = { inherit username host; };
            home-manager.users.${username} = import ./home.nix;
          }
        ];
      };
    };
}
