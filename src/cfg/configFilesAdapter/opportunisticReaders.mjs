// -*- coding: utf-8, tab-width: 2 -*-

import fsPromises from 'fs/promises';

import readDataFile from 'read-data-file';


const EX = {

  undefToNull(x) { return (x === undefined ? null : x); },

  async ignoreENoEnt(pr) {
    try {
      return await pr;
    } catch (err) {
      if (err.code === 'ENOENT') { return undefined; }
      throw err;
    }
  },

  async readConfigFileIfExists(path) {
    return EX.ignoreENoEnt(readDataFile(path).then(EX.undefToNull));
  },

  async scanConfigDirIfExists(path) {
    return EX.ignoreENoEnt(fsPromises.readdir(path));
  },

};


export default EX;
