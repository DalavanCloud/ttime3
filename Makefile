export PATH := node_modules/.bin:$(PATH)

ALL_TARGETS = closure test lint

ifdef TESTLOOP_FIX
	ALL_TARGETS := fix $(ALL_TARGETS)
endif

all: $(ALL_TARGETS)

lint:
	eslint *.js spec/*.js

test:
	jasmine

closure:
	google-closure-compiler \
		--js='*.js' \
		--js='spec/*.js' \
		--externs=externs/externs.js \
		--externs=node_modules/google-closure-compiler/contrib/externs/jasmine-2.0.js \
		--externs=node_modules/google-closure-compiler/contrib/externs/jquery-3.3.js \
		--compilation_level=ADVANCED \
		--checks_only \
		--jscomp_error='*'

fix:
	eslint --fix *.js spec/*.js

serve:
	http-server

.PHONY: test lint closure all fix serve
