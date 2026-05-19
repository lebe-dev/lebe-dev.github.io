# Personal site + blog (Astro) and crypto-calculator PWA (public/cc/)

# Install dependencies
install:
    npm install

# Start Astro dev server on http://localhost:4200
dev:
    npm run dev

# Type / content check
check:
    npm run check

# Lint: type-check + ban console.log/debugger in shipped JS of the calculator
lint: check
    @echo "Checking for console.log and debugger in public/cc/js/..."
    @! grep -rn "console\\.log\\|debugger" public/cc/js/ || (echo "❌ Found console.log or debugger statements" && exit 1)
    @echo "✓ Lint passed"

# Production build to dist/
build: lint
    npm run build
    @test -f dist/index.html || (echo "❌ Missing dist/index.html" && exit 1)
    @test -d dist/en || (echo "❌ Missing dist/en/" && exit 1)
    @test -d dist/ru || (echo "❌ Missing dist/ru/" && exit 1)
    @test -f dist/cc/index.html || (echo "❌ Missing dist/cc/index.html (calculator)" && exit 1)
    @echo "✓ Build validation passed"

# Preview production build
preview: build
    npm run preview

# Create a new blog post: just new-post en my-slug "My title"
new-post LANG SLUG TITLE:
    @test "{{LANG}}" = "en" -o "{{LANG}}" = "ru" || (echo "LANG must be 'en' or 'ru'" && exit 1)
    @mkdir -p src/content/blog/{{LANG}}
    @test ! -f src/content/blog/{{LANG}}/{{SLUG}}.md || (echo "❌ Post already exists" && exit 1)
    @printf -- "---\ntitle: %s\ndescription: \npubDate: %s\nlang: %s\ndraft: true\ntags: []\n---\n\n" "{{TITLE}}" "$(date -u +%Y-%m-%d)" "{{LANG}}" > src/content/blog/{{LANG}}/{{SLUG}}.md
    @echo "✓ Created src/content/blog/{{LANG}}/{{SLUG}}.md"

# Deploy: build, push dist/ to gh-pages branch via git worktree
deploy: build
    @echo "→ Preparing gh-pages worktree..."
    @rm -rf .gh-pages-worktree
    @git worktree add -B gh-pages .gh-pages-worktree 2>/dev/null \
      || (git fetch origin gh-pages && git worktree add -B gh-pages .gh-pages-worktree origin/gh-pages)
    @echo "→ Cleaning worktree..."
    @find .gh-pages-worktree -mindepth 1 -maxdepth 1 -not -name '.git' -exec rm -rf {} +
    @echo "→ Copying dist/..."
    @cp -R dist/. .gh-pages-worktree/
    @touch .gh-pages-worktree/.nojekyll
    @echo "→ Committing & pushing..."
    @cd .gh-pages-worktree && git add -A \
      && (git diff --cached --quiet && echo "(no changes)" \
          || git commit -m "deploy: $(git -C .. rev-parse --short HEAD)") \
      && git push -u origin gh-pages
    @git worktree remove --force .gh-pages-worktree
    @echo "✓ Deployed. Make sure GitHub Pages source = 'gh-pages' branch in repo settings."
