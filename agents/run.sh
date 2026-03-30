#!/bin/bash
#
# propSearch Agent Orchestrator
# Usage: agents/run.sh <agent> [task-id] [extra-context]
# Example: agents/run.sh data-engineer DE-140
# Example: agents/run.sh analyst "research NW3 properties"
#

set -e

AGENTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_DIR="$(dirname "$AGENTS_DIR")"
cd "$PROJECT_DIR"

# Source the project's .claude/settings.json.env if it exists
# This exports the env vars from claude settings
if [ -f "$PROJECT_DIR/.claude/settings.json.env" ]; then
    set -a
    source "$PROJECT_DIR/.claude/settings.json.env"
    set +a
fi

# Agent definitions: name -> display_name
declare -A AGENTS
AGENTS[po]="Product Owner & Strategic Lead"
AGENTS[analyst]="Senior Real Estate Data Analyst"
AGENTS[data]="Senior Real Estate Data Engineer"
AGENTS[de]="Senior Real Estate Data Engineer"
AGENTS[fe]="Lead Frontend Engineer & UX Architect"
AGENTS[qa]="UI/UX Quality Assurance Engineer"

# Load AGENTS.md for behavioral rules
load_agents_context() {
    if [ -f "$PROJECT_DIR/AGENTS.md" ]; then
        echo "=== AGENTS.md (Behavioral Rules) ==="
        cat "$PROJECT_DIR/AGENTS.md"
        echo ""
        echo "=== END AGENTS.md ==="
        echo ""
    fi
}

# Load agent-specific README
load_agent_readme() {
    local agent=$1
    local readme=""

    case $agent in
        po|product_owner)
            readme="$PROJECT_DIR/agents/product_owner/README.md"
            ;;
        analyst|data_analyst)
            readme="$PROJECT_DIR/agents/data_analyst/README.md"
            ;;
        data|data_engineer|de)
            readme="$PROJECT_DIR/agents/data_engineer/README.md"
            ;;
        fe|frontend|frontend_engineer)
            readme="$PROJECT_DIR/agents/frontend_engineer/README.md"
            ;;
        qa|ui_ux_qa)
            readme="$PROJECT_DIR/agents/ui_ux_qa/README.md"
            ;;
        *)
            echo "Unknown agent: $agent" >&2
            exit 1
            ;;
    esac

    if [ -f "$readme" ]; then
        echo "=== $(basename "$readme") ==="
        cat "$readme"
        echo ""
        echo "=== END $(basename "$readme") ==="
        echo ""
    fi
}

# Load task context from Tasks.md
load_task_context() {
    local task_id=$1
    if [ -z "$task_id" ]; then
        return
    fi

    # Grep for task in Tasks.md
    local task_line=$(grep -n "^|.*$task_id.*|" "$PROJECT_DIR/Tasks.md" 2>/dev/null | head -1 || true)
    if [ -n "$task_line" ]; then
        echo "=== Task: $task_id ==="
        echo "$task_line" | sed 's/|/| /g'
        echo ""
        echo "=== END Task ==="
        echo ""
    fi
}

# Show available agents
show_help() {
    echo "propSearch Agent Orchestrator"
    echo ""
    echo "Usage: agents/run.sh <agent> [task-id] [context]"
    echo ""
    echo "Agents:"
    echo "  po, product_owner       - Product Owner & Strategic Lead"
    echo "  analyst, data_analyst    - Senior Real Estate Data Analyst"
    echo "  de, data_engineer       - Senior Real Estate Data Engineer"
    echo "  data                    - Senior Real Estate Data Engineer (alias)"
    echo "  fe, frontend            - Lead Frontend Engineer & UX Architect"
    echo "  qa, ui_ux_qa            - UI/UX Quality Assurance Engineer"
    echo ""
    echo "Examples:"
    echo "  agents/run.sh po                              # Start PO agent with full context"
    echo "  agents/run.sh analyst DE-140                  # Start Analyst with specific task"
    echo "  agents/run.sh fe \"refactor PropertyTable\"     # Start FE with custom context"
    echo ""
    echo "RTK is used automatically for all operations."
}

# Main
if [ $# -lt 1 ] || [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    show_help
    exit 0
fi

AGENT=$1
TASK=${2:-}
EXTRA=${3:-}

# Build context string
CONTEXT=""
CONTEXT+=$(load_agents_context)
CONTEXT+=$(load_agent_readme "$AGENT")
CONTEXT+=$(load_task_context "$TASK")

if [ -n "$EXTRA" ]; then
    CONTEXT+="=== Additional Context ==="$'\n'
    CONTEXT+="$EXTRA"$'\n'
    CONTEXT+="=== END Additional Context ==="$'\n'
fi

# Build the prompt
SYSTEM_PROMPT="You are the ${AGENTS[$AGENT]:-Agent} for the propSearch project (private London property acquisition research dashboard)."

# Execute via claude with project directory as working dir
# This ensures claude picks up .claude/settings.json
cd "$PROJECT_DIR"
exec claude -p "$SYSTEM_PROMPT

$CONTEXT

Begin your work now."
