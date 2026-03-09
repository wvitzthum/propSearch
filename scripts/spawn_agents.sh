#!/bin/bash

# Simple script to spawn multiple terminals in VS Code
# Note: This uses the 'code' CLI if available, otherwise it just suggests the tasks.json route.

if command -v code &> /dev/null
then
    echo "Spawning agent terminals via VS Code CLI..."
    code --terminal --command "make agent-po"
    code --terminal --command "make agent-analyst"
    code --terminal --command "make agent-data"
    code --terminal --command "make agent-fe"
    code --terminal --command "make agent-qa"
else
    echo "VS Code 'code' command not found."
    echo "Please use 'Run Task' -> 'Spawn All Agents' from the Command Palette (Ctrl+Shift+P)."
fi
