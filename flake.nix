{
  description = "ilyamiro's rice, adapted to NixOS with flakes (see README for credits)";

  inputs = {
    # Pinned to the 25.11 stable release. nixos-unstable + home-manager master
    # drift independently and periodically break each other (and unstable can
    # carry transient build failures); the release branches are curated to be
    # internally coherent. quickshell, matugen and linuxPackages_latest are all
    # available in 25.11.
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";

    home-manager = {
      # Must match the nixpkgs release branch above to avoid version skew.
      url = "github:nix-community/home-manager/release-25.11";
      inputs.nixpkgs.follows = "nixpkgs";
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
        # `inputs` is still passed through so apps.nix can reference flake inputs
        # if you add any by hand later.
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
