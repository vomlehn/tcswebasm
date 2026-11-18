# tcswebasm: the TCSpecial examples in a web page.
#
#   make build   build the page's WebAssembly into web/pkg: nightly Rust,
#                with std rebuilt for threads
#   make serve   serve web/ at http://127.0.0.1:8000, cross-origin isolated
#   make html    write docs/manual.html from docs/manual.rst
#   make check   fail where docs/manual.html is behind docs/manual.rst
#   make hooks   have git run tcs-helpers' pre-commit hook here, which
#                rebuilds docs/manual.html with each commit that changes
#                docs/manual.rst, and adds it to the commit

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

.PHONY: html
html:
	$(MAKE) -C docs html

.PHONY: check
check:
	$(TCS_HELPERS)/bin/html-pages check docs

.PHONY: hooks
hooks:
	git config core.hooksPath $(TCS_HELPERS)/githooks
