# docs: the manual as a page of its own, for a reader without a checkout.
#
#   make html   write manual.html from manual.rst
#
# tcs-helpers' pre-commit hook, which make hooks in the top directory turns
# on, rebuilds manual.html with this rule whenever a commit changes
# manual.rst, and adds it to the commit.

.PHONY: html
html: manual.html

manual.html: manual.rst
	rst2html manual.rst manual.html
