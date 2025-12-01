{ config, pkgs, lib, homeDirectory, ... }:

{
  programs.zsh = {
    enable = true;
    
    # Enable Powerlevel10k instant prompt
    initExtraFirst = ''
      # Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
      if [[ -r "''${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-''${(%):-%n}.zsh" ]]; then
        source "''${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-''${(%):-%n}.zsh"
      fi
    '';

    # Main zsh configuration
    initExtra = ''
      # Set the zsh config directory
      export ZSHRCD=~/.config/zsh/zshrc.d

      # Activate Antidote
      if [[ -f /opt/homebrew/opt/antidote/share/antidote/antidote.zsh ]]; then
        source /opt/homebrew/opt/antidote/share/antidote/antidote.zsh
      elif [[ -f ${pkgs.antidote}/share/antidote/antidote.zsh ]]; then
        source ${pkgs.antidote}/share/antidote/antidote.zsh
      fi

      # Run the following command to generate the zsh_plugins.zsh file
      # antidote bundle < ~/.config/zsh/zsh_plugins.txt > ~/.config/zsh/zsh_plugins.zsh
      if [[ -f ~/.config/zsh/zsh_plugins.zsh ]]; then
        source ~/.config/zsh/zsh_plugins.zsh
      fi

      # Load p10k config
      [[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

      # Custom completions
      fpath+=( "$HOME/.config/zsh/completions" )

      if [[ ! -d "$HOME/.config/zsh/completions/_bun" ]] && command -v bun &> /dev/null; then
        bun completions zsh &> ~/.config/zsh/completions/_bun
      fi

      # Pyenv initialization
      if command -v pyenv &> /dev/null; then
        eval "$(pyenv init -)"
      fi

      # TheFuck alias
      if command -v thefuck &> /dev/null; then
        eval $(thefuck --alias)
      fi

      # History substring search keybindings
      bindkey '^[[A' history-substring-search-up
      bindkey '^[[B' history-substring-search-down
      HISTORY_SUBSTRING_SEARCH_ENSURE_UNIQUE=1
      HISTORY_SUBSTRING_SEARCH_PREFIXED=1
    '';

    # Shell aliases
    shellAliases = {
      "eza" = "eza -1";
      "??" = "cps";
      "$" = "zsh-c";
    };

    # Functions
    initExtraBeforeCompInit = ''
      # zsh-c function for dollar sign alias
      zsh-c() {
        zsh -c "$*"
      }

      # mkcd function - create directory and cd into it
      mkcd() {
        all_args=("$@")
        remove_last_arg=''${all_args[@]:0:$((''${#all_args[@]}-1))}
        mkdir_opts="''${remove_last_arg[@]}"
        last_arg="''${@: -1}"
        mkdir $mkdir_opts $last_arg && cd $last_arg
      }

      # Python alias if not available
      if ! command -v python >/dev/null 2>&1; then
        alias python='python3'
      fi
    '';

    # Zsh options
    history = {
      size = 10000;
      save = 10000;
      share = true;
      ignoreDups = true;
      ignoreSpace = true;
    };
  };

  # Powerlevel10k configuration
  home.file.".p10k.zsh".source = ../config/p10k.zsh;
  
  # Zsh plugins configuration
  xdg.configFile."zsh/zsh_plugins.txt".source = ../config/zsh/zsh_plugins.txt;
  xdg.configFile."zsh/zsh_plugins.zsh".source = ../config/zsh/zsh_plugins.zsh;
  
  # Completions
  xdg.configFile."zsh/completions/_bun".source = ../config/zsh/completions/_bun;
  xdg.configFile."zsh/completions/_pnpm".source = ../config/zsh/completions/_pnpm;
}
