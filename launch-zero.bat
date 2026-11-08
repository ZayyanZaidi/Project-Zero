@echo off
REM ==============================================================================
REM Project-Zero - One-Click Launcher for Windows
REM ==============================================================================
set VAULT_DIR=%~dp0
echo Launching Project-Zero in Obsidian...
start "" "obsidian://open?path=%VAULT_DIR%"
exit

