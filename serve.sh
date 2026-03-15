#!/bin/sh
# -*- coding: utf-8, tab-width: 2 -*-
exec "$(nodejs -r @ubhd-as22/http-server-base -p runServer
  )" --invoked-via "$0" "$@"; exit $?
