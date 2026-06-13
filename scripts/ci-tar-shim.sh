#!/bin/sh
# CI tar compatibility shim for fpm 1.9.3 (bundled with electron-builder 24.13.3).
# fpm invokes tar as:  tar -I<prog> -cf out.tar.xz ...
# GNU tar 1.35+ rejects the -I<prog> flag syntax. This shim strips -I
# and injects the appropriate compression flag (-J / -z / -j) based on
# the output filename's extension.
# Used only by .github/workflows/build-linux.yml. Safe to delete locally.

args=""
cf_arg=""
while [ $# -gt 0 ]; do
  case "$1" in
    -I*) shift ;;
    -cf) args="$args \"$1\" \"$2\""; cf_arg="$2"; shift 2 ;;
    -c|-f|-J|-j|-z|-a) args="$args \"$1\""; [ "$1" = "-f" ] && cf_arg="$2" && args="$args \"$2\"" && shift 2; [ "$1" != "-f" ] && shift ;;
    *) args="$args \"$1\""; shift ;;
  esac
done
case "$cf_arg" in
  *.tar.xz)  args="$args -J" ;;
  *.tar.gz)  args="$args -z" ;;
  *.tar.bz2) args="$args -j" ;;
esac
eval exec /usr/bin/tar $args
