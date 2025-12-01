{
  description = "Arthur Fontaine's dotfiles managed with Nix Home Manager";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    home-manager = {
      url = "github:nix-community/home-manager";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    nix-homebrew.url = "github:zhaofengli-wip/nix-homebrew";
  };

  outputs = { self, nixpkgs, home-manager, nix-homebrew, ... }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      
      # Default username - can be overridden
      defaultUsername = "arthur-fontaine";
    in
    {
      # Home Manager configurations for different systems
      homeConfigurations = {
        # macOS (Apple Silicon)
        "arthur-fontaine@darwin-aarch64" = home-manager.lib.homeManagerConfiguration {
          pkgs = nixpkgs.legacyPackages.aarch64-darwin;
          extraSpecialArgs = {
            username = defaultUsername;
            homeDirectory = "/Users/${defaultUsername}";
            system = "aarch64-darwin";
          };
          modules = [ ./home.nix ];
        };

        # macOS (Intel)
        "arthur-fontaine@darwin-x86_64" = home-manager.lib.homeManagerConfiguration {
          pkgs = nixpkgs.legacyPackages.x86_64-darwin;
          extraSpecialArgs = {
            username = defaultUsername;
            homeDirectory = "/Users/${defaultUsername}";
            system = "x86_64-darwin";
          };
          modules = [ ./home.nix ];
        };

        # Linux (x86_64)
        "arthur-fontaine@linux-x86_64" = home-manager.lib.homeManagerConfiguration {
          pkgs = nixpkgs.legacyPackages.x86_64-linux;
          extraSpecialArgs = {
            username = defaultUsername;
            homeDirectory = "/home/${defaultUsername}";
            system = "x86_64-linux";
          };
          modules = [ ./home.nix ];
        };

        # Linux (ARM64)
        "arthur-fontaine@linux-aarch64" = home-manager.lib.homeManagerConfiguration {
          pkgs = nixpkgs.legacyPackages.aarch64-linux;
          extraSpecialArgs = {
            username = defaultUsername;
            homeDirectory = "/home/${defaultUsername}";
            system = "aarch64-linux";
          };
          modules = [ ./home.nix ];
        };
      };

      # Development shell with Nix tools
      devShells = forAllSystems (system:
        let pkgs = nixpkgs.legacyPackages.${system};
        in {
          default = pkgs.mkShell {
            buildInputs = with pkgs; [
              home-manager
              nil
              nixpkgs-fmt
            ];
          };
        });
    };
}
