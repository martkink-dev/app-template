# Moves the existing pages with git mv so Git keeps their history.
# Run from the repository root in PowerShell, BEFORE copying the ZIP contents.
New-Item -ItemType Directory -Force -Path "src/app/(auth)/invite", "src/app/(app)/admin" | Out-Null

git mv "src/app/login" "src/app/(auth)/login"
git mv "src/app/invite/[token]" "src/app/(auth)/invite/[token]"
git mv "src/app/admin/users" "src/app/(app)/admin/users"

# Remove the now empty folders.
Remove-Item "src/app/invite", "src/app/admin" -Recurse -ErrorAction SilentlyContinue
