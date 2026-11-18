===========================
Running TCS in a Browser
===========================

What this is
============

TCS -- tcspecial, the flight software, with tcs-sim, which stands in for a
vehicle's hardware, and tcs-moc, a ground station -- runs on Linux. This
repository runs the same programs, built from the same source, in a web
page: nothing to install, and nothing to build for whoever opens the page.
It is for showing TCS to anyone with a browser, not for flying: everything
in it is simulated.

What runs
=========

The page starts tcspecial on an example's configuration, as ``tcsx`` does on
a desk, under ``--simulate=all``. tcspecial runs under its supervisor, which
starts it again as its child, exactly as on Linux; the child loads the
configuration, opens its nodes, and sends its beacons. So far the page shows
what it does in the browser's console: the thermostat's beacons, heard by a
listener of the page's own. tcs-sim's and tcs-moc's windows come next.

How the programs run in a page
==============================

A page has no processes, no sockets and no files. What the programs ask of
the system goes through ``tcsos``, in tcspecial's repository, which on
Linux is Linux and in a page is the page's own substitutes:

Programs
  Each program -- tcspecial, its supervisor's child, segsend -- is a
  function the page registers under its name and starts on a thread of its
  own, with its own arguments, variables, directory and stop flag. A stop
  asked of a program is what SIGTERM is on Linux.

Threads
  Each is a Web Worker sharing the page's memory, which needs the page to be
  cross-origin isolated: see `Serving it`_.

Sockets
  UDP and TCP are queues in the page's memory, at the addresses the
  configurations give, on one host. A program waits on them as it waits on
  sockets on Linux. An app node's interfaces are TCP connections of the
  page's, carrying the same packets as on Linux: four bytes of length, then
  that many bytes.

Files
  Held in the page's memory. The examples' configurations are put there
  before anything starts; what the programs write is kept for as long as
  the page is open.

What a page cannot do
=====================

* Lock memory into RAM. The page starts tcspecial with ``--no-memlock``, as
  a desk whose limit on locked memory is too small does. On Linux tcspecial
  locks its memory as always.
* Reach hardware. GPIO lines, I2C devices and SPI peripherals are reached
  only where they are simulated, at their ``sim_address``. Unix-domain
  sockets, and the ``process`` computation, which runs a program of its
  own, are Linux's alone.
* Keep a telemetry log. tcslog, which writes it, is built on the standard
  library's files and clock, so the page takes the ``log`` section out of
  the configurations it loads.
* Recover from a panic. A page's WebAssembly cannot unwind, so a panic in
  any program ends the page.

Building it
===========

It needs tcspecial's repository beside this one, nightly Rust with the
standard library's source and the WebAssembly target, and the
``wasm-bindgen`` command at the version the crate pins:

.. code-block:: console

   $ rustup toolchain install nightly
   $ rustup component add rust-src --toolchain nightly
   $ rustup target add wasm32-unknown-unknown --toolchain nightly
   $ cargo install wasm-bindgen-cli --version 0.2.129
   $ make build

Nightly, because threads need the standard library rebuilt with atomic
instructions and shared memory, which ``-Z build-std`` does. The page and
its WebAssembly are in ``web/``.

Serving it
==========

.. code-block:: console

   $ make serve

serves ``web/`` at http://127.0.0.1:8000 with the two headers that make a
page cross-origin isolated, ``Cross-Origin-Opener-Policy: same-origin`` and
``Cross-Origin-Embedder-Policy: require-corp``, without which a page's
workers cannot share its memory. Open it, and the browser's console.
