# Playwright: Writing Test Files Without Breaking Regex

## The Problem

Bash heredocs, Python heredocs, and the `Edit` tool collapse double-backslashes (`\\`) into single backslashes (`\`). This breaks:
- Playwright locators with regex: `text=/\\d+K/` → `text=/\d+K/` (non-functional)
- RegExp constructors in JS/TS files
- Any pattern using backslash-escaped characters

**Symptom:** Tests pass locally but fail in CI — or locators never match.

## The Fix

### Option 1: Python Indexed Write (Preferred for multi-line)

```python
with open('tests/pages/AffordabilityCalculator.spec.ts') as f:
    lines = f.readlines()
lines[17] = "    const rate = page.getByText(/\\d+\\.\\d{2}%/).first();\n"
with open('tests/pages/AffordabilityCalculator.spec.ts', 'w') as f:
    f.writelines(lines)
```

### Option 2: sed for Simple Inline Substitutions

```bash
sed -i "s|text=/\\\\d+K/|text=/\\\\d+K/|g" tests/pages/MyTest.spec.ts
```

### Option 3: Avoid Heredocs for Problematic Content

Write the base file with heredoc, then use Python indexed write to patch the specific problematic lines.

## What to Watch For

| Pattern | Example | Breakage |
|---------|---------|----------|
| Regex with digits | `/\\d+K/` | `/\\d+K/` → `/\d+K/` |
| Escape sequences | `/\./`, `/\\./` | Double → single backslash |
| CSS selectors with `\` | `[data-testid="foo\\.bar"]` | Breaks attribute matching |

## Quick Detection

After writing a test file, verify:
```bash
grep -n '\\\\d\|\\\\.\|\\\\{' tests/pages/*.spec.ts
```
If nothing comes back, the file needs a check — the patterns should be double-escaped in the source.

## Related

See also: `PROTOCOLS/03_TESTING.md` for Playwright setup and commands.
