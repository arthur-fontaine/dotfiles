fpath+=( "$HOME/.config/zsh/completions" )

if [[ ! -d "$HOME/.config/zsh/completions/_bun" ]] && command -v bun &> /dev/null; then
  bun completions zsh &> ~/.config/zsh/completions/_bun
fi
