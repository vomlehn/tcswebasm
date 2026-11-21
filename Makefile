# tcswebasm: the TCSpecial examples in a web page.
#
#   make build   build the page's WebAssembly into web/pkg: nightly Rust,
#                with std rebuilt for threads
#   make serve   serve web/ at http://127.0.0.1:8000, cross-origin isolated
#   make page-check
#                check, in headless Chrome, that the built page starts each
#                example, served as GitHub Pages serves it: Node 22 and
#                Chrome, CHROME naming it where google-chrome is not it
#   make html    write README.html from README.md, and docs/manual.html
#                from docs/manual.rst
#   make check   fail where either page is behind its source
#   make hooks   have git run tcs-helpers' pre-commit hook here, which
#                rebuilds README.html or docs/manual.html with each commit
#                that changes its source, and adds it to the commit

TCS_HELPERS ?= ../tcs-helpers

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
html: README.html
	$(MAKE) -C docs html

# README.html, the README as a page of its own, its links followed in a
# browser: pandoc, standalone, its first heading the page's title.
README.html: README.md
	pandoc --standalone --shift-heading-level-by=-1 \
		--metadata pagetitle=tcswebasm README.md -o README.html

.PHONY: check
check:
	$(TCS_HELPERS)/bin/html-pages check . docs

.PHONY: hooks
hooks:
	git config core.hooksPath $(TCS_HELPERS)/githooks
