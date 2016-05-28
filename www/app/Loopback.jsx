import loopback from 'loopback';
import boot from 'loopback-boot';
import fs from 'browserify-fs';

global.fs = fs;

let client = module.exports = loopback();
boot(client, __dirname);