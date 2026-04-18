#!/bin/bash
# Remind Claude to check the graph report before broad searches.
# Exit 0 = allow tool, output is shown as hook feedback.
if [ -f "graphify-out/GRAPH_REPORT.md" ]; then
  echo "[graph-first] Consult graphify-out/GRAPH_REPORT.md to identify the relevant module/path before searching broadly. Use a targeted path instead of repo-wide patterns."
fi
