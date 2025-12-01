{ config, pkgs, lib, username, homeDirectory, system, ... }:

let
  isDarwin = lib.strings.hasSuffix "darwin" system;
in
{
  # Home Manager settings
  home.username = username;
  home.homeDirectory = homeDirectory;
  home.stateVersion = "24.05";

  # Let Home Manager manage itself
  programs.home-manager.enable = true;

  # Import modules
  imports = [
    ./modules/zsh.nix
    ./modules/git.nix
    ./modules/ghostty.nix
    ./modules/mise.nix
    ./modules/homebrew.nix
  ];

  # CLI packages to install
  home.packages = with pkgs; [
    # Development tools
    act
    awscli2
    bacon
    duckdb
    eza
    fx
    fzf
    gh
    git-lfs
    gnupg
    graphviz
    httpie
    hyperfine
    lazygit
    poppler
    thefuck

    # Git utilities
    delta

    # Shell utilities
    antidote

    # Programming languages and runtimes (managed by mise in config)
    mise
  ] ++ lib.optionals (!isDarwin) [
    # Linux-only packages
  ] ++ lib.optionals isDarwin [
    # macOS-only packages
  ];

  # Environment variables
  home.sessionVariables = {
    EDITOR = "code";
    WORDCHARS = "";
    CARGO_NET_GIT_FETCH_WITH_CLI = "true";
    CODEX_HOME = "${homeDirectory}/.config/codex";
  };

  # Add custom bin directories to PATH
  home.sessionPath = [
    "${homeDirectory}/.local/bin"
  ] ++ lib.optionals isDarwin [
    "/Applications/Visual Studio Code.app/Contents/Resources/app/bin"
    "${homeDirectory}/.lmstudio/bin"
  ];
}
