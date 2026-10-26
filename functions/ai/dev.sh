#!/bin/bash
# Local dev runner for the AI service — ALLOW_UNAUTH=1 is for localhost only.
cd "$(dirname "$0")"
ALLOW_UNAUTH=1 PORT=8081 node index.js
