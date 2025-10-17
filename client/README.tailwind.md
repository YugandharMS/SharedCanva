# Tailwind Setup Notes

If you see `Unknown at rule @tailwind` in editors, ensure the following:

1. Packages installed (Tailwind v3):
   - tailwindcss
   - postcss
   - autoprefixer
2. Config files present:
   - tailwind.config.ts
   - postcss.config.cjs (CommonJS)
3. Restart TypeScript/ESLint language server after installing.
4. The file including `@tailwind` directives is within the `content` globs or root.

This project uses a custom `.app-container` utility instead of Tailwind's default `.container` class name.
