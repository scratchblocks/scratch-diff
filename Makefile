
all:
	echo "Hi!"

test: node_modules
	npm run test

node_modules:
	npm install

.PHONY: all test

