# tcswebasm: the TCSpecial examples in a web page.
#
#   make build   build the page's WebAssembly into web/pkg: nightly Rust,
#                with std rebuilt for threads
#   make serve   serve web/ at http://127.0.0.1:8000, cross-origin isolated
#   make page-check
#                check, in headless Chrome, that the built page starts each
#                example, served as GitHub Pages serves it: Node 22 and
#                Chrome, CHROME naming it where google-chrome is not it
#   make html    write index.html from README.md, and docs/manual.html
#                from docs/manual.rst
#   make check   fail where either page is behind its source
#   make hooks   have git run tcs-helpers' pre-commit hook here, which
#                rebuilds index.html or docs/manual.html with each commit
#                that changes its source, and adds it to the commit

TCS_HELPERS ?= ../tcs-helpers
TCS_HELPERS_REQUIRED := 0.13.0

# Threads: atomic instructions, and memory the page's workers share, which
# the linker makes only when told, with the thread-local storage each
# worker's start sets up exported for wasm-bindgen's shim to call.
RUSTFLAGS_THREADS := -C target-feature=+atomics,+bulk-memory,+mutable-globals \
	-C link-arg=--shared-memory -C link-arg=--import-memory \
	-C link-arg=--max-memory=1073741824 \
	-C link-arg=--export=__wasm_init_tls -C link-arg=--export=__tls_size \
	-C link-arg=--export=__tls_align -C link-arg=--export=__tls_base
TARGET := wasm32-unknown-unknown
# The nightly toolchain: GitHub's build names a dated one.
NIGHTLY ?= nightly

.PHONY: build
# tcslog finds the clock's resolution where it is built, which for a page
# it cannot: 1 has the writer find it as it runs.
build:
	TIMER_RESOLUTION=1 RUSTFLAGS='$(RUSTFLAGS_THREADS)' \
		cargo +$(NIGHTLY) build --release \
		--target $(TARGET) -Z build-std=std,panic_abort
	wasm-bindgen target/$(TARGET)/release/tcswebasm.wasm \
		--out-dir web/pkg --target web

.PHONY: serve
serve:
	python3 serve.py

.PHONY: page-check
page-check: node_modules
	node check-page.mjs

# What check-page.mjs needs, as package-lock.json names it.
node_modules: package.json package-lock.json
	npm ci --no-audit --no-fund
	touch node_modules

.PHONY: html
html: index.html
	$(MAKE) -C docs html

# index.html, the README as a page of its own, its links followed in a
# browser: pandoc, standalone, its first heading the page's title.
index.html: README.md
	pandoc --standalone --shift-heading-level-by=-1 \
		--metadata pagetitle=tcswebasm README.md -o index.html

.PHONY: check
check: rust-current
	$(TCS_HELPERS)/bin/html-pages check . docs

# Stop, saying what to do, unless the tcs-helpers checkout is there and
# at least TCS_HELPERS_REQUIRED.
.PHONY: tcs-helpers
tcs-helpers:
	@if [ ! -x "$(TCS_HELPERS)/bin/tcs-helpers" ]; then \
		echo "No tcs-helpers checkout at $(TCS_HELPERS): clone" \
			"https://github.com/vomlehn/tcs-helpers beside this" \
			"repository, or set TCS_HELPERS to where it is." >&2; \
		exit 1; \
	fi
	@"$(TCS_HELPERS)/bin/tcs-helpers" --require $(TCS_HELPERS_REQUIRED)

# Fail where the Rust this would be built with is not the newest stable:
# see "The newest stable Rust" in tcs-helpers' README. rust-toolchain.toml
# keeps the build on the stable channel; this notices a newer release.
.PHONY: rust-current
rust-current: tcs-helpers
	"$(TCS_HELPERS)/bin/rust-current"

.PHONY: hooks
hooks:
	git config core.hooksPath $(TCS_HELPERS)/githooks
