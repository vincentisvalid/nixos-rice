{ config, pkgs, username, ... }:

{
  programs.zsh = {
    enable = true;
    enableCompletion = true;
    autosuggestion.enable = true;
    syntaxHighlighting.enable = true;

    history.size = 10000;
    history.path = "$HOME/.zsh_history";
    history.ignoreAllDups = true;

    initContent = builtins.readFile ./zsh-init.sh;

    shellAliases = {
      edit = "sudo -E nvim -n";
      gitavail = "ssh-add $HOME/Documents/Важное/recovery_keys/GitHub/github_remote_keys/key";
      # Flake rebuild: picks the nixosConfiguration matching the current hostname.
      update = "sudo nixos-rebuild switch --flake /etc/nixos";
      stop = "shutdown now";
      edconf = "sudo -E nvim /etc/nixos/configuration.nix";
      out = "loginctl terminate-user ${username}";
    };
    
    
    oh-my-zsh = {
        enable = true;
        plugins = [
          "git"                
        ];
        theme = "robbyrussell";
      };
    };

  home.sessionVariables = {
      hypr = "/etc/nixos/config/sessions/hyprland/";  
      programs = "/etc/nixos/config/programs";
    };

}
