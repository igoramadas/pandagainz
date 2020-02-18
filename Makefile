TYPEDOC:= ./node_modules/.bin/typedoc
TSC:= ./node_modules/.bin/tsc

build:
	$(TSC)

certificate:
	openssl genrsa -out pandagainz.local.key 4096
	openssl req -new -x509 -key pandagainz.local.key -out pandagainz.local.crt -days 999 -subj /C=DE/L=Berlin/CN=pandagainz.local

clean:
	rm -rf ./lib
	rm -rf ./node_modules
	rm -f package-lock.json

docs:
	rm -rf ./docs/assets
	rm -rf ./docs/classes
	rm -rf ./docs/interfaces
	rm -rf ./docs/modules
	$(TYPEDOC) --disableOutputCheck

run:
	$(TSC)
	npm start

update:
	-ncu -u
	-npm version $(shell date '+%y.%-V.%u%H') --force --allow-same-version
	npm install
	$(TSC)

.PHONY: docs
