# propSearch Agent Shell Aliases
# Source this from ~/.bashrc or ~/.zshrc: source /path/to/propSearch/agents/aliases.sh

# Agent shortcuts
alias po="cd /workspaces/propSearch && agents/run.sh po"
alias analyst="cd /workspaces/propSearch && agents/run.sh analyst"
alias de="cd /workspaces/propSearch && agents/run.sh de"
alias fe="cd /workspaces/propSearch && agents/run.sh fe"
alias qa="cd /workspaces/propSearch && agents/run.sh qa"

# Task-specific invocations
alias po-task="cd /workspaces/propSearch && agents/run.sh po"
alias analyst-task="cd /workspaces/propSearch && agents/run.sh analyst"
alias de-task="cd /workspaces/propSearch && agents/run.sh de"
alias fe-task="cd /workspaces/propSearch && agents/run.sh fe"
alias qa-task="cd /workspaces/propSearch && agents/run.sh qa"

# RTK shortcuts (already configured in environment)
alias rtk-gain='rtk gain'
alias rtk-history='rtk gain --history'
