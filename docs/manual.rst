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

It is published at https://vomlehn.github.io/tcswebasm/: see
`Publishing it`_.

What runs
=========

Two of tcspecial's examples, chosen by the page's address: the thermostat,
at the page's own address or with ``?example=thermostat``, and the lunar
lander, with ``?example=lander``. The links at the top of the page switch
between them.

The thermostat
--------------

The thermostat example, as ``make runmocy
TCSPECIAL_CONFIG_FILE=examples/thermostat/thermostat`` runs it on a desk,
under ``--simulate=all``. The page starts tcs-moc, the ground station;
tcs-moc starts tcs-sim and waits for it to say it is ready, then starts
tcspecial, whose supervisor starts it again as its child, exactly as on
Linux. Their windows are drawn in the page, one under another:

* tcs-sim's, with a panel for each simulated payload: the three
  temperature sensors and the two heaters.
* tcs-moc's, with the command link, the beacon and a panel for each data
  handler.
* tcs-moc's plot of the zone's temperature against the thermostat's band.

To watch the thermostat work:

#. In tcs-moc's window, press **Connect**. tcspecial answers with its
   configuration's checksum, which matches the window's.
#. In tcs-sim's window, press **Enable** on each payload: the sensors start
   reporting and the heaters can be driven.
#. In tcs-moc's window, press **Enable** on each data handler. Readings
   arrive in the panels, and the plot draws the temperature, which tcspecial
   holds within the band by switching the heaters.

The lunar lander
----------------

The lander example: two tcspecials, ``lander-a`` flying the X axis and
``lander-b`` the Y, and one tcs-sim simulating both in one world. On Linux
its ground station is ``lander_yamcs.py``, through Yamcs; neither Python
nor Yamcs runs in a page, so the page runs ``lander-station``, the
example's ground station in Rust, which does the same without them and
runs on Linux as well (``make run-lander-station`` in tcspecial). It makes
a landscape at random, says the seed in its window, starts tcs-sim and
waits for it to be ready, then starts both tcspecials and sends each
CONNECT until it answers with its configuration's checksum. Everything
between it and the vehicles is held 1.3 s each way, the time light takes
between the Moon and the Earth. Two windows are drawn:

* tcs-sim's, with the lander's pane -- the landscape, the lander, its
  values and the joystick it is flown with -- and a panel for each
  simulated payload.
* lander-station's, with the lander as the vehicles report it: the same
  landscape, the stars as lander-a sends them down, the lander where it was
  last said to be, carried on between reports, its values, its fuel, the
  joystick as it was held, and whether it has landed or crashed.

To fly it:

#. The lander starts falling as soon as the vehicles ask the simulator for
   their first readings, before anyone flies it, so the first flight
   crashes. In lander-station's window, press **Restart**: the lander
   starts again at the top left, and the station sees it 1.3 s later.
#. In tcs-sim's window, press **Autoland** for the autopilot to land it, or
   hold the button down in the joystick's middle square and drag along an
   arm: left or right for the side thrusters, up for the engine.
#. **Enable Autorestart** in lander-station's window has the lander start
   again by itself a few seconds after each crash.

What each program prints is in the browser's console.

How the programs run in a page
==============================

A page has no processes, no sockets and no files. What the programs ask of
the system goes through ``tcsos``, in tcspecial's repository, which on
Linux is Linux and in a page is the page's own substitutes:

Programs
  Each program -- tcs-moc, lander-station, tcs-sim, tcspecial and its
  supervisor's child, segsend -- is a
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

Windows
  A page draws on its own thread alone, and every program runs on a
  worker; so a program sends the part of it that makes a window to the
  page's thread, and waits there for the window to close. Each window has a
  canvas of its own, shown while the window is. The page's thread never
  waits for a lock or a message: it takes either by trying until it is
  free, which a lock the windows share, held for a moment, soon is.

Output
  What a program prints, on its standard output or error, is shown in the
  browser's console a line at a time.

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
* Close a window from its frame. A page's windows have no title bar:
  tcs-moc's **Quit** ends the run, as on Linux.
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
workers cannot share its memory. Open it, and the browser's console to
see what the programs print.

Any server that sends those headers will do. One that cannot, such as
GitHub Pages, still works: ``web/coi.js``, which the page loads first,
installs itself as the page's service worker and loads the page again
through it, once; the service worker adds the two headers to everything
the page and its workers fetch. Until then the page says it is setting
up. A browser that refuses service workers, as some private windows do,
cannot run the page from such a server.

Publishing it
=============

``.github/workflows/pages.yml`` builds the page on GitHub and publishes
``web/`` as the repository's GitHub Pages site on every push to main. It
builds from tcspecial's main, checked out beside this repository, with
the dated nightly the workflow names and the ``wasm-bindgen`` that
``Cargo.lock`` names. A change to tcspecial alone is published by running
the workflow by hand, from the repository's Actions tab or with:

.. code-block:: console

   $ gh workflow run pages.yml
