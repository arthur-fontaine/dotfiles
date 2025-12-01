{ config, pkgs, lib, ... }:

{
  programs.git = {
    enable = true;
    
    userName = "Arthur Fontaine";
    userEmail = "0arthur.fontaine@gmail.com";
    
    # Delta pager configuration
    delta = {
      enable = true;
      options = {
        navigate = true;
        dark = true;
      };
    };

    extraConfig = {
      merge = {
        conflictstyle = "zdiff3";
      };
      
      filter = {
        lfs = {
          required = true;
          clean = "git-lfs clean -- %f";
          smudge = "git-lfs smudge -- %f";
          process = "git-lfs filter-process";
        };
      };
      
      push = {
        autoSetupRemote = true;
      };
    };
    
    lfs.enable = true;
  };
}
