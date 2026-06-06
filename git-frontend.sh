#!/usr/bin/env bash
set -euo pipefail

GIT_DIR="/home/solieman/.gitdirs/sales-app-frontend"
WORK_TREE="/mnt/Projects/demoSalesAPP/frontend"

export GIT_DIR
export GIT_WORK_TREE="$WORK_TREE"
export GIT_CONFIG_GLOBAL=/dev/null

exec git \
  -c core.filemode=false \
  -c safe.directory="$GIT_DIR" \
  -c safe.directory="$WORK_TREE" \
  "$@"
