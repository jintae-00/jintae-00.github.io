#!/usr/bin/env bash
# Deploy this folder to https://jintae-00.github.io
#
# One-time setup: save a GitHub personal access token (classic, scope "repo") as a single line in
#   ~/.github_token        (chmod 600)
# Then run:  ./deploy.sh
# The script creates the jintae-00.github.io repository if it does not exist, pushes main, and
# turns on GitHub Pages for the main branch root. Nothing else in ~/repos is touched.
set -euo pipefail

OWNER="jintae-00"
REPO="${OWNER}.github.io"
TOKEN_FILE="${GITHUB_TOKEN_FILE:-$HOME/.github_token}"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -n "${GITHUB_TOKEN:-}" ]]; then TOKEN="$GITHUB_TOKEN";
elif [[ -f "$TOKEN_FILE" ]]; then TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")";
else echo "No token. Save it to $TOKEN_FILE (one line) or export GITHUB_TOKEN." >&2; exit 1; fi

api() { curl -sS -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" "$@"; }

login="$(api https://api.github.com/user | python3 -c 'import sys,json; print(json.load(sys.stdin).get("login",""))')"
[[ -n "$login" ]] || { echo "Token rejected by GitHub." >&2; exit 1; }
echo "Authenticated as $login"

code="$(api -o /dev/null -w '%{http_code}' "https://api.github.com/repos/$OWNER/$REPO")"
if [[ "$code" == "404" ]]; then
  echo "Creating $OWNER/$REPO ..."
  resp="$(api -X POST https://api.github.com/user/repos \
    -d "{\"name\":\"$REPO\",\"description\":\"Personal site\",\"homepage\":\"https://$REPO/\",\"private\":false,\"has_wiki\":false,\"has_projects\":false}")"
  if ! printf '%s' "$resp" | python3 -c 'import sys,json; d=json.load(sys.stdin); sys.exit(0 if d.get("full_name") else 1)'; then
    echo "Could not create the repository with this token:" >&2
    printf '%s\n' "$resp" | python3 -c 'import sys,json; print("  ", json.load(sys.stdin).get("message"))' >&2
    echo "Fix: create an empty public repo named $REPO at https://github.com/new (no README)," >&2
    echo "     make sure the token can access it (Contents: read/write, Pages: read/write), then rerun." >&2
    exit 1
  fi
else
  echo "Repository exists (HTTP $code)."
fi

cd "$DIR"
git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$OWNER/$REPO.git"
# push with the token, without writing it to disk
git -c "http.https://github.com/.extraheader=Authorization: Basic $(printf 'x-access-token:%s' "$TOKEN" | base64 -w0)" \
    push -u origin main
echo "Pushed main."

# enable Pages (main branch, root); ignore "already exists"
pages_code="$(api -o /dev/null -w '%{http_code}' -X POST "https://api.github.com/repos/$OWNER/$REPO/pages" \
  -d '{"source":{"branch":"main","path":"/"}}')"
echo "Pages API: HTTP $pages_code (201 created, 409 already enabled)"
echo "Site: https://$REPO/  (allow a minute or two for the first build)"
