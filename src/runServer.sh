#!/bin/bash
# -*- coding: utf-8, tab-width: 2 -*-


function run_cli_main () {
  export LANG{,UAGE}=en_US.UTF-8  # make error messages search engine-friendly
  local HSB_CLI="$(readlink -m -- "$BASH_SOURCE")"
  local HSB_PATH="$(dirname -- "$(dirname -- "$HSB_CLI")")"
  echo D: "$FUNCNAME[$$]:$(printf -- ' ‹%s›' "$0" "$@") @ $PWD"

  local APP_LDR="$HSB_CLI" APP_PATH="$HSB_PATH"
  if [ "$1" == --invoked-via ]; then
    APP_LDR="$(readlink -m -- "$2")"
    shift 2 # <-- fallible, but guarded by next line:
    [ -f "$APP_LDR" ] || return 4$(echo E: 'Bad file for --invoked-via' >&2)
    APP_PATH="$(dirname -- "$APP_LDR")"
  fi

  cd -- "$APP_PATH" || return $?$(
    echo E: "Failed to chdir to application directory: $APP_PATH" >&2)

  [ -n "$USER" ] || export USER="$(whoami)"

  local -A CFG=(
    [run_task]='run_server_show_log_on_failure'
    [git_safe_subdirs]=
    [lint]=
    [run_prog]='nodejs'
    [log_dest]="logs.@$HOSTNAME/server.log"
    )
  tty --silent || CFG[run_task]='actually_run_server'

  log_progress "Reading config file(s) for host '$HOSTNAME'."
  local ITEM=
  for ITEM in cfg.@{local,"$HOSTNAME"}{/*,.*,}.rc; do
    [ -f "$ITEM" ] || continue
    source_in_func "$ITEM" cfg || return $?
  done

  "${CFG[run_task]}" "$@" || return $?
}


function log_progress () { printf '%(%F %T)T P: %s\n' -1 "$*"; }


function source_in_func () {
  source -- "$@" || return $?$(
    echo W: "$FUNCNAME failed (rv=$?) for '$1'" >&2)
}


function run_server_show_log_on_failure () {
  ( # These parens force a subprocess with separate stdout and stderr,
    # so their redirection to `log_dest` won't interfere with our `less`.
    actually_run_server "$@"
  )
  local RV="$?"
  [ "$RV" == 0 ] || show_log_because_server_failed || return $?
  return "$RV"
}


function show_log_because_server_failed () {
  local LOGF="${CFG[log_dest]}"
  echo
  echo E: "Server failed (rv=$RV)! Gonna show log file: $LOGF"
  echo
  local SHOW_LOG=(
    less
    --chop-long-lines
    --quit-if-one-screen
    +G
    -- "$LOGF"
    )
  "${SHOW_LOG[@]}" || return $?
}


function report_git_status_concisely () {
  ( git log --format=%h -n 5
    git status --porcelain -uno | grep . || echo clean
  ) | tr -s '\r\n \t' ' ' | sed -re '$s~ $~~'
}


function actually_run_server () {
  tee_output_to_logfile || return $?
  verify_sigterm_compat || return $?
  prepare_inside_docker_container || return $?
  verify_run_prog || return $?

  local VAL="hsb: $(cd -- "$HSB_PATH" && report_git_status_concisely) / app: "
  if [ "$HSB_PATH" -ef . ]; then
    VAL+='='
  else
    VAL+="$(report_git_status_concisely)"
  fi
  log_progress "Git status: $VAL"

  local LINT="${CFG[lint]}"
  if [ -n "$LINT" ]; then
    [ "$LINT" == + ] && LINT='elp'
    log_progress "Running linter in hsb path: $LINT"
    ( cd -- "$HSB_PATH" && "$LINT" ) || return $?
    if [ "$HSB_PATH" -ef . ]; then
      true
    else
      log_progress "Running linter in app path: $LINT"
      "$LINT" || return $?
    fi
  fi

  # In case we're process ID 1 (e.g. in docker), we must either forward
  # signals like SIGTERM, or hand over PID 1 to a program that can ensure
  # proper forwarding to the server.
  # The easiest solution is to always hand over our PID to the server
  # itself, independent of whether our PID is 1.
  log_progress "Gonna replace pid $$ with: ${CFG[run_prog]}"
  exec "${CFG[run_prog]}" "$HSB_PATH"/src/runServer.mjs "$@" || return $?$(
    echo "E: server exec failed, rv=$?" >&2)
}


function tee_output_to_logfile () {
  local LOGF="${CFG[log_dest]}"
  [ -n "$LOGF" ] || return 0
  local LOGDIR="$(dirname -- "$LOGF")/"
  LOGDIR="${LOGDIR#./}"
  if [ -n "$LOGDIR" ]; then
    mkdir --parents -- "$LOGDIR"
    [ "$USER" != root ] || chown --reference . --recursive -- "$LOGDIR"
  fi

  local OLD="${LOGDIR}prev.$(basename -- "$LOGF")"
  [ ! -f "$LOGF" ] || mv --verbose --no-target-directory \
    -- "$LOGF" "$OLD" || return $?

  >"$LOGF" || return 4$(echo E: "Cannot write to logfile: $LOGF" >&2)
  exec &> >(tee_output_to_logfile__then_optimize) || return 71
}


function tee_output_to_logfile__then_optimize () {
  tee -- "$LOGF" || return $?
  "$HSB_PATH"/src/unclutter_server_logfile.sed -i -- "$LOGF" || return $?
}


function verify_sigterm_compat () {
  local PID1_CMD="$(ps ho args 1)"
  if <<<"$PID1_CMD" grep -qPe "(^|/)(node|nodejs|npm)\b"; then
    echo E: "Process ID 1 seems to be npm." \
      "This usually causes signal handling problems, mostly with SIGTERM." \
      "If you're running this in a docker container, please use" \
      "'$APP_LDR' as the docker command." >&2
    return 80
  fi
}


function verify_run_prog () {
  local NMBIN="$APP_PATH"/node_modules/.bin
  if [[ ":$PATH:" != *":$NMBIN:"* ]]; then
    PATH="$NMBIN:$PATH:"
    export PATH
  fi

  local PROG="${CFG[run_prog]}"
  case "$PROG" in
    '!no_verify!'* ) CFG[run_prog]="${PROG#!*!}"; return 0;;
  esac

  log_progress "Verify run_prog: $PROG"
  { which "$PROG" && </dev/null "$PROG" -e 0; } &>/dev/null && return 0

  local MAYBE=(
    "$APP_PATH/node_modules/.bin/$PROG"
    "/usr/lib/node_modules/.bin/$PROG"
    "/usr/lib/node_modules/$PROG/bin/$PROG"
    )
  case "$$PROG" in
    /* ) MAYBE=( "$PROG" );;
  esac
  local ALTN=
  for ALTN in "${MAYBE[@]}" ''; do
    if [ -z "$ALTN" ]; then
      log_progress "Using npm to search for run_prog locally." \
        "This may take a few seconds."
      ALTN="$(npm run sh which "$PROG" 2>/dev/null | grep -Pe '^/')"
    fi
    [ -x "$ALTN" ] || continue
    log_progress "Trying probable run_prog: $ALTN"
    </dev/null "$ALTN" -e 0 &>/dev/null || continue
    log_progress "Adjusting run_prog to: $ALTN"
    CFG[run_prog]="$ALTN"
    return 0
  done

  echo E: "Even npm cannot find $PROG." \
    "Is the package installed correctly?" >&2
  return 81
}


function prepare_inside_docker_container () {
  if [ "$USER" != root ]; then
    echo D: "Probably not inside docker: user = $USER ≠ root"
    return 0
  fi
  if [ "$PWD" != /app ]; then
    echo D: "Probably not inside docker: cwd = $PWD ≠ /app"
    return 0
  fi

  echo D: "Probably running inside docker ⇒ configure npm:"
  >"$HOME"/.npmrc sed -nre 's~^ +~~; /^[;a-z]/p' <(echo '
    ; -*- coding: utf-8, tab-width: 4 -*-
    audit           = true
    package-lock    = false
    update-notifier = false
    ')

  echo D: 'Configure git safe directories:'
  local GCG='git config --global --add safe.directory' VAL=
  ${GCG/add/unset-all}
  for VAL in '' ${CFG[git_safe_subdirs]}; do
    [ "${VAL:0:1}" == / ] || VAL="$PWD/$VAL"
    [ "$VAL" == / ] || VAL="${VAL%/}"
    $GCG "$VAL"
  done

  local DONE='node_modules/install.done'
  echo D: "Check if we need to install npm package '$PWD':"
  npm_install_inside_docker_container || return $?
  echo D: "Install date file npm package '$PWD' says: $(cat -- "$DONE")"
  echo D: 'Fix file ownership in node_modules:'
  chown --reference . --recursive -- node_modules
}


function npm_install_inside_docker_container () {
  grep -qPe '^\S' -- "$DONE" 2>/dev/null && return 0

  local NM='node_modules' OVR= UP= DEST=
  [ ! -L "$NM" ] || rm -- "$NM" || return $?
  for OVR in local "$HOSTNAME"; do
    for OVR in "$NM.@$OVR"/{@[a-z]*/,}[a-z]*/package.json ; do
      [ -f "$OVR" ] || continue
      OVR="${OVR%/*}"
      DEST="$NM/${OVR#*/}"
      DEST="${DEST%/*}"
      UP="${OVR//[^'/']/}"
      UP="${UP//'/'/'../'}"
      mkdir --parents -- "$DEST"
      ln --symbolic --force --target-directory="$DEST" "$UP$OVR" || return $?
    done
  done

  npm install . || return $?
  printf '%(%F %T %z (%Z))T success\n' -1 >"$DONE"
}





run_cli_main "$@"; exit $?
