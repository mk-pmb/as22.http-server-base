/*

This module provides a simple CLI without cluttering the system command
namespace, by instead utilizing the `-r` option of node.js:

* Print H-S-B directory path:
  `nodejs -r @ubhd-as22/http-server-base -p basedir`

* Print H-S-B default launch command path:
  `nodejs -r @ubhd-as22/http-server-base -p runServer`

*/

const { dirname: basedir, resolve } = import.meta;

Object.assign(global, {
  basedir,
  resolve,
  runServer: basedir + '/src/runServer.sh',
});
