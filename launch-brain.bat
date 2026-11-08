@echo off
REM ==============================================================================
REM Brain - One-Click Launcher for Windows
REM ==============================================================================
set VAULT_DIR=%~dp0
echo Launching Brain Vault in Obsidian...
start "" "obsidian://open?path=%VAULT_DIR%"
exit

