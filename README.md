# Dotfiles

Dotfiles managed with [Nix](https://nixos.org/) and [Home Manager](https://github.com/nix-community/home-manager).

## Prerequisites

### Install Nix

```sh
curl --proto '=https' --tlsv1.2 -sSf -L https://install.determinate.systems/nix | sh -s -- install
```

### macOS: Install Xcode Command Line Tools and Homebrew

```sh
sudo xcode-select --install
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## Setup

### 1. Clone this repository

```sh
git clone --depth 1 git@github.com:arthur-fontaine/dotfiles.git ~/.dotfiles
cd ~/.dotfiles
```

### 2. Apply Home Manager configuration

For macOS (Apple Silicon):
```sh
nix run home-manager -- switch --flake .#arthur-fontaine@darwin-aarch64
```

For macOS (Intel):
```sh
nix run home-manager -- switch --flake .#arthur-fontaine@darwin-x86_64
```

For Linux (x86_64):
```sh
nix run home-manager -- switch --flake .#arthur-fontaine@linux-x86_64
```

For Linux (ARM64):
```sh
nix run home-manager -- switch --flake .#arthur-fontaine@linux-aarch64
```

### 3. macOS: Install GUI applications with Homebrew

```sh
brew bundle --file=~/.config/homebrew/Brewfile
```

### 4. Generate Zsh plugins

```sh
antidote bundle < ~/.config/zsh/zsh_plugins.txt > ~/.config/zsh/zsh_plugins.zsh
```

### 5. Install development tools with mise

```sh
mise install
```

## Set some defaults

```sh
defaults write -g NSPreferredExternalTerminalApp -string "Ghostty"
/Applications/KekaExternalHelper.app/Contents/MacOS/KekaExternalHelper --set-as-default
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

### Screenshot settings

```sh
mkcd ~/Pictures/Screenshots
```

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

### AirBattery

```sh
open -a "AirBattery"
```

> - Open System Settings, and go to Security settings
> - Allow to launch AirBattery
> - You can add the AirBattery widget on the desktop or the sidebar

### Lunar

```sh
open -a "Lunar"
```

> - Open Lunar settings and go to Hotkeys
> - In `Brightness keys adjust > In other modes`, set `Display with cursor`
> - Change brightness on all monitors and follow the steps of the Lunar window that just openedx

### Ice

```sh
open -a "Ice"
```

> - Grant accessibility permission and continue in limited mode
> - Open Ice settings and enable "Launch at login"

### Alcove

```sh
open -a /Applications/Alcove.app
```

> - Grant all permissions asked
