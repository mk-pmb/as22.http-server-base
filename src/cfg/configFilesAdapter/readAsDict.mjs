// -*- coding: utf-8, tab-width: 2 -*-

import pathLib from 'path';

import getOwn from 'getown';
import mapKeys from 'lodash.mapkeys';
import mergeOpt from 'merge-options';
import mustBe from 'typechecks-pmb/must-be.js';

import coreApi from './coreApi.mjs';
import oppoRead from './opportunisticReaders.mjs';


const suf = mustBe.nest('suffix', coreApi.cfgFileSuffix);
const cutSuf = -suf.length;


const EX = async function readAsDict(topic) {
  mustBe.nest('Config topic', topic);
  const ad = this;
  const descr = ('config for topic ' + topic);
  let basePath = (getOwn(ad, topic) || topic);
  mustBe.nest('Path to ' + descr, basePath);
  if (!pathLib.isAbsolute(basePath)) {
    basePath = pathLib.join(ad.cfgDir, basePath);
  }

  const singleFilePr = oppoRead.readConfigFileIfExists(basePath + suf);
  const dirFiles = await oppoRead.scanConfigDirIfExists(basePath);
  const dirCfgFiles = (dirFiles
    || []).filter(coreApi.isPluggableConfigFilename).sort();
  let hadPlaceholder = false;
  const dirConfigPrs = dirCfgFiles.map(async function oneCfgFile(name) {
    const bfn = name.slice(0, cutSuf);
    const fullPath = pathLib.join(basePath, name);
    let cfg = await oppoRead.readConfigFileIfExists(fullPath);
    if (cfg === undefined) {
      // File not found => probably broken symlink => treat as non-existing.
      return;
    }
    if ((cfg === null) && EX.acceptedPlaceholderNames.includes(bfn)) {
      hadPlaceholder = true;
      return;
    }
    if (Array.isArray(cfg)) {
      // NB:  This is just to make it available as bfn. If you use it with
      //      learnTopicDict, the latter will wrap it again, as `rawList`.
      cfg = { [bfn]: cfg };
    } else {
      mustBe.dictObj('Config data in file ' + fullPath, cfg);
      cfg = mapKeys(cfg, (v, k) => k.replace(/\^/g, bfn));
    }
    return cfg;
  });

  let allConfig = (await Promise.all([
    singleFilePr,
    ...dirConfigPrs,
  ])).filter(Boolean);
  try {
    allConfig = mergeOpt({}, ...allConfig);
  } catch (mergeErr) {
    mergeErr.configTopic = topic;
    throw mergeErr;
  }

  (function maybeWarnNoFilesAtAll() {
    if (hadPlaceholder) { return; }
    if (Object.keys(allConfig).length) { return; }
    // Potentially the config dir is a broken symlink.
    const msg = ('Found no config settings AT ALL for topic '
      + JSON.stringify(topic)
      + '. Please double-check your config directory path '
      + JSON.stringify(basePath));
    throw new Error(msg);
  }());

  return allConfig;
};


Object.assign(EX, {

  acceptedPlaceholderNames: [
    'PLACEHOLDER',
  ],



});



export default EX;
