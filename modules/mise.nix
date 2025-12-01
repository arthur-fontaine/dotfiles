{ config, pkgs, lib, ... }:

{
  # Mise configuration for managing programming language versions
  xdg.configFile."mise/config.toml".source = ../config/mise/config.toml;

  # Enable mise program
  programs.mise = {
    enable = true;
    enableZshIntegration = true;
  };
}
