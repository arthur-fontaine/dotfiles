{ config, pkgs, lib, system, ... }:

let
  isDarwin = lib.strings.hasSuffix "darwin" system;
in
{
  # Homebrew Brewfile for macOS GUI applications (symlink only on macOS)
  xdg.configFile."homebrew/Brewfile" = lib.mkIf isDarwin {
    source = ../config/homebrew/Brewfile;
  };
}
