# docs: the manual as a page of its own, for a reader without a checkout.
#
#   make html   write index.html from README.rst, and manual.html from
#               manual.rst
#
# tcs-helpers' pre-commit hook, which make hooks in the top directory turns
# on, rebuilds manual.html with this rule whenever a commit changes
# manual.rst, and adds it to the commit.

.PHONY: html
html: index.html manual.html

# The page the site gives at docs/: what each document here is, made from
# README.rst, which GitHub shows when the directory is browsed.
index.html: README.rst
	rst2html README.rst index.html

manual.html: manual.rst
	rst2html manual.rst manual.html
