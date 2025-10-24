# Dotfiles

## Setup a new Mac

```sh
sudo xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew bundle --file ~/.Brewfile
sh -c "$(curl -fsLS get.chezmoi.io)" -- init --apply arthur-fontaine
```
