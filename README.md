# Dotfiles

## Setup a new Mac

```sh
sudo xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew bundle --file ~/.Brewfile
sh -c "$(curl -fsLS get.chezmoi.io)" -- init --apply arthur-fontaine
antidote bundle < ~/.config/zsh/zsh_plugins.txt > ~/.config/zsh/zsh_plugins.zsh
```

## Set some defaults

```sh
defaults write -g NSPreferredExternalTerminalApp -string "Ghostty"
```

## Settings

### Set Keyboard to “U.S. International – PC”

**Steps:**
1. Open **System Settings → Keyboard → Input Sources**  
2. Click **Add (+)**  
3. Search for **“U.S. International – PC”** under *English*  
4. Add it to your list of input sources  
5. Remove other layouts like **“ABC”** or **“U.S.”** to make it the default

### Disable “Natural Scrolling”

**Steps:**
1. Open **System Settings → Trackpad → Scroll & Zoom**  
2. Toggle **“Natural Scrolling”** off

## Start using

### Raycast

```sh
open -a "Raycast"
```

> - Follow the instructions. Skip all
> - Click `Alt + Space`
> - Write `raycast settings general`
> - Click `Replace Spotlight`
> - Click `Cloud Sync` and enable it

### 1password

```sh
open -a "1password"
```

> - Log in.
> - Click on `Developer`
> - Click on `SSH Agent`, then `Configure the SSH agent`
> - Go back and click on `CLI`. `Enable the integration`
