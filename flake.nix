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

    # Optional apps that aren't in nixpkgs (only built if selected in apps.nix):
    # boo ships its own flake; starpsx is a Rust source tree (flake=false), built
    # via cargoLock so no manual hashes are needed (flake.lock pins the source).
    boo.url = "github:coder/boo";
    starpsx = {
      url = "github:kaezrr/starpsx";
      flake = false;
    };
  };

  outputs = inputs@{ self, nixpkgs, home-manager, ... }:
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

        # Made available to configuration.nix (and apps.nix) as function args.
        # `inputs` lets apps.nix reach the boo/starpsx flake inputs.
        specialArgs = { inherit username hostname host inputs; };

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
