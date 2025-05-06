# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi


# Set the zsh config directory
export ZSHRCD=~/.config/zsh/zshrc.d


# Activate Antidote
source /usr/local/opt/antidote/share/antidote/antidote.zsh
antidote load ~/.config/zsh/zsh_plugins.txt


# The rest of the config is in the ./.config/zshrc.d directory
