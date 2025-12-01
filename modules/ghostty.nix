{ config, pkgs, lib, ... }:

{
  # Ghostty terminal configuration
  xdg.configFile."ghostty/config".source = ../config/ghostty/config;
  xdg.configFile."ghostty/themes/zed-mono-dark".source = ../config/ghostty/themes/zed-mono-dark;
  xdg.configFile."ghostty/themes/zed-mono-light".source = ../config/ghostty/themes/zed-mono-light;
}
