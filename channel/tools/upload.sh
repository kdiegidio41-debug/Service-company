#!/usr/bin/env bash
# Uploads a finished video to Higgsfield storage. The presigned URL comes from the Higgsfield
# media_upload tool; afterwards call media_confirm (type "video") with its media_id.
#   bash tools/upload.sh out/<id>/final.mp4 '<upload_url>'
set -euo pipefail
file="$1"; url="$2"
code=$(curl -sS -o /dev/null -w "%{http_code}" -X PUT -H "Content-Type: video/mp4" -H "If-None-Match: *" --upload-file "$file" "$url")
echo "upload $file -> HTTP $code"
[ "$code" = "200" ]
