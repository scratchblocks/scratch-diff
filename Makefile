
all:
	echo 1

test: node_modules
	yarn test

node_modules:
	yarn

.PHONY: all test


