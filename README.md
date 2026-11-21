# tcswebasm

The TCSpecial examples in a web page: tcspecial, tcs-sim and tcs-moc,
built from tcspecial's source for WebAssembly, running on the browser
substitutes in its `tcsos` crate, windows and all. Nothing to install
for whoever opens the page.

## Run the examples

**[Open the WebAssembly examples](https://vomlehn.github.io/tcswebasm/)**,
or go straight to one:

- [The thermostat](https://vomlehn.github.io/tcswebasm/?example=thermostat)
- [The lunar lander](https://vomlehn.github.io/tcswebasm/?example=lander)
- [The beacon](https://vomlehn.github.io/tcswebasm/?example=beacon)
- [tees](https://vomlehn.github.io/tcswebasm/?example=tees) and
  [minimal](https://vomlehn.github.io/tcswebasm/?example=minimal), two
  small ones

The links at the top of the page switch between them.

## Building it

See [Running TCS in a Browser](docs/manual.html), the manual
([its source](docs/manual.rst)).

    make build   # nightly Rust: see the manual
    make serve   # then open http://127.0.0.1:8000
    make html    # README.html and docs/manual.html, from their sources

README.html is made from this file, and tcs-helpers' pre-commit hook,
which `make hooks` turns on, makes it again with each commit that
changes README.md.
