#!/usr/bin/env bash
# Verifies the Kind System package. Run from anywhere inside the repository.
# Exits non-zero if any check fails.
set -u
root=$(git rev-parse --show-toplevel)
pkg="$root/docs/the-kind-system"
fail=0

echo "== Relative links and images resolve"
# original-document.md is a verbatim historical copy; _template/ holds placeholder links.
while IFS= read -r f; do
  grep -noE '\]\([^)#[:space:]]+\)|src="[^"]+"' "$f" | while IFS=: read -r line match; do
    target=$(printf '%s' "$match" | sed -E 's/^\]\(//; s/\)$//; s/^src="//; s/"$//')
    case "$target" in http*|mailto:*) continue ;; esac
    [ -e "$(dirname "$f")/$target" ] || echo "BROKEN ${f#$root/}:$line -> $target"
  done
done < <(find "$pkg" -name '*.md' -not -name 'original-document.md' -not -path '*/_template/*') | tee /tmp/kind-verify-links.$$
[ -s /tmp/kind-verify-links.$$ ] && fail=1; rm -f /tmp/kind-verify-links.$$

echo "== Repo paths cited in core docs exist"
for f in "$pkg/implementation-status.md" "$pkg/design-tokens.md"; do
  grep -oE '`(apps|supabase|docs|scripts|\.github|\.claude|AGENTS\.md)[^`[:space:]*]*`' "$f" | tr -d '`' | sort -u |
    while read -r p; do [ -e "$root/$p" ] || echo "MISSING ${f#$root/}: $p"; done
done | tee /tmp/kind-verify-paths.$$
[ -s /tmp/kind-verify-paths.$$ ] && fail=1; rm -f /tmp/kind-verify-paths.$$

echo "== Colour tokens match apps/mobile/src/theme/colors.js"
grep -oE '^  [a-zA-Z]+: "[^"]+"' "$root/apps/mobile/src/theme/colors.js" | sed -E 's/^  ([a-zA-Z]+): "([^"]+)"/\1 \2/' |
  while read -r name value; do
    grep -q "$value" "$pkg/design-tokens.md" || echo "TOKEN NOT RECORDED: $name = $value"
  done | tee /tmp/kind-verify-tokens.$$
[ -s /tmp/kind-verify-tokens.$$ ] && fail=1; rm -f /tmp/kind-verify-tokens.$$

echo "== Every decision listed in a RELEASE.md exists"
for r in "$pkg"/decisions/[0-9]*/RELEASE.md; do
  grep -oE '\]\(([0-9]{3}-[^)]+\.md)\)' "$r" | sed -E 's/^\]\(//; s/\)$//' |
    while read -r d; do [ -e "$(dirname "$r")/$d" ] || echo "MISSING DECISION ${r#$root/}: $d"; done
done | tee /tmp/kind-verify-dec.$$
[ -s /tmp/kind-verify-dec.$$ ] && fail=1; rm -f /tmp/kind-verify-dec.$$

echo "== Existing release files modified or deleted (only 'Superseded by' back-links are allowed)"
# New release folders show up as added (A) or untracked. Modified (M) or deleted (D) files are changes to an existing release.
git -C "$root" diff --name-status HEAD -- docs/the-kind-system/decisions/ | grep -E '^[MD]' | grep -v '/_template/' |
  while read -r st path; do
    other=$(git -C "$root" diff HEAD -- "$path" | grep -E '^[-+][^-+]' | grep -vc 'Superseded by')
    [ "$other" -gt 0 ] && echo "CHANGED $st $path ($other non-supersession lines; must be a Proposed release)"
  done

[ "$fail" = 0 ] && echo "OK" || { echo "FAILED"; exit 1; }
