#!/usr/bin/env bash
# DESIGN.md compliance gate. A failing design check is a failing build.
# Scans app/ components/ lib/ for the banned patterns the design system
# outlaws: radius, shadows, gradients, icon libraries, accent colours,
# transform/scale motion, emoji in UI code.
set -uo pipefail

fail=0
targets=(app components lib)
existing=()
for t in "${targets[@]}"; do [ -d "$t" ] && existing+=("$t"); done

check() {
  local label="$1"; shift
  local pattern="$1"; shift
  local hits
  hits=$(grep -rn -E "$pattern" "${existing[@]}" \
    --include='*.tsx' --include='*.ts' --include='*.css' \
    | grep -v -E 'check-design|rounded-none|shadow-none|design-exempt' || true)
  if [ -n "$hits" ]; then
    echo "✗ $label"
    echo "$hits" | head -8
    fail=1
  fi
}

check "corner radius (0px everywhere)" 'rounded-(sm|md|lg|xl|2xl|3xl|full)|border-radius:\s*[1-9]'
check "shadows" 'shadow-(sm|md|lg|xl|2xl)|box-shadow:\s*[^n]'
check "gradients" 'bg-gradient|linear-gradient|radial-gradient|conic-gradient|from-\w+-[0-9]{3}|via-\w+-[0-9]{3}'
# Owner's call 2026-08-01: icons allowed, lucide-react ONLY — one cohesive set.
check "icon libraries other than lucide" "from ['\"](react-icons|@heroicons|@radix-ui/react-icons|@tabler/icons|@phosphor-icons|react-feather)"
check "accent colours" '(text|bg|border|ring|fill|stroke)-(indigo|violet|purple|blue|teal|pink|rose|amber|emerald|cyan|fuchsia|sky|lime|orange|yellow|green|red)-[0-9]'
check "transform motion" 'hover:(scale|translate|rotate)|animate-(bounce|spin|pulse|ping)|transition-transform'
check "monospace (retired 2026-08-01 — Inter sans + Anton only)" 'JetBrains|font-mono|font-jetbrains'
# Emoji check via perl — BSD grep has no \x{} ranges.
emoji_hits=$(find "${existing[@]}" -type f \( -name '*.tsx' -o -name '*.ts' \) \
  -exec perl -CSD -ne 'print "$ARGV:$.: $_" if /[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]/' {} + 2>/dev/null || true)
if [ -n "$emoji_hits" ]; then
  echo "✗ emoji in UI code"
  echo "$emoji_hits" | head -8
  fail=1
fi

if [ "$fail" -eq 0 ]; then
  echo "✓ DESIGN.md checks passed"
else
  echo ""
  echo "DESIGN.md violations found. Fix them — do not exempt them."
  exit 1
fi
