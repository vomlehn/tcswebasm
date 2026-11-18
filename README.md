# tcswebasm

The TCSpecial examples in a web page: tcspecial, tcs-sim and tcs-moc,
built from tcspecial's source for WebAssembly, running on the browser
substitutes in its `tcsos` crate. The page runs the thermostat example,
windows and all. Nothing to install for whoever
opens the page: https://vomlehn.github.io/tcswebasm/

See [Running TCS in a Browser](docs/manual.rst)
([as a page](docs/manual.html)).

    make build   # nightly Rust: see the manual
    make serve   # then open http://127.0.0.1:8000
