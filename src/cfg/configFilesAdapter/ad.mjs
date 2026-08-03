// -*- coding: utf-8, tab-width: 2 -*-

import osLib from 'os';
import pathLib from 'path';

import crObAss from 'create-object-and-assign';
import makeExtendedOrderedMap from 'ordered-map-extended-pmb';
import mustBe from 'typechecks-pmb/must-be.js';
import objPop from 'objpop';


import coreApi from './coreApi.mjs';
import readAsDict from './readAsDict.mjs';


const initialWorkingDirectory = process.cwd();

const hostname = (process.env.HOSTNAME
  || osLib.hostname()
  || 'localhost');


const EX = {

  hostname,

  async make(how) {
    const { popCfg } = how;
    const cfgDict = popCfg('obj', 'cfgfiles');
    const cfgPop = objPop.d(cfgDict);
    const ad = crObAss(EX.api, {
      cfgDict,
      cfgDir: cfgPop('dir'),
    });
    ad.customData = await ad.readAsDict('custom_data');
    return ad;
  },


  getConfigDefaults() {
    const df = {
      dir: pathLib.join(initialWorkingDirectory, 'cfg.@' + hostname),
    };
    return df;
  },


  api: {
    ...coreApi,
    readAsDict,

    async readMustPop(topic) {
      const cfgDict = await this.readAsDict(topic);
      const mustPop = objPop(cfgDict, { mustBe }).mustBe;
      return mustPop;
    },

    async readAsMap(topic) {
      const cfgDict = await this.readAsDict(topic);
      return makeExtendedOrderedMap().upd(cfgDict);
    },

  },

};


export default EX;
