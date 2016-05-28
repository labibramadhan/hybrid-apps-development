import _ from 'underscore';
import fs from 'fs';
import express from "express";
import loopback from 'loopback';
import explorer from 'loopback-explorer';

const lbApp = loopback();

const app = require('electron').app;
const BrowserWindow = require('electron').BrowserWindow;

const publicDir = __dirname + '/www/public';

const embedApp = (params, type) => {
    let mainDir = './node_modules/'.concat(params.dir);
    fs.readdir(mainDir, (err, files) => {
        files.forEach((file) => {
            let currentItem = require(mainDir.concat("/".concat(file)));
            switch (type) {
                case 'routes':
                    currentItem(params.app);
                    break;
                case 'models':
                    if (typeof currentItem.options === 'undefined') {
                        currentItem.options = {};
                    }
                    let model = params.ds.createModel(currentItem.name, currentItem.properties, currentItem.options);
                    params.app.model(model);
                    break;
            }
        });
    });
};

const ds = loopback.createDataSource('memory');

const config = JSON.parse(fs.readFileSync('.rsrc', 'utf8'));

if (typeof config.modules !== 'undefined') {
    _.each(config.modules, (cfg, module) => {
        if (typeof cfg.routes !== "undefined") {
            embedApp({app: lbApp, dir: module.concat(cfg.routes)}, 'routes');
        }
        if (typeof cfg.models !== "undefined") {
            embedApp({app: lbApp, ds: ds, dir: module.concat(cfg.models)}, 'models');
        }
    });
}

app.on('window-all-closed', function () {
    app.quit();
});

app.on('ready', function () {
    lbApp.use(config.apiEndpoint, loopback.rest());
    explorer(lbApp, {basePath: config.apiEndpoint, mountPath: config.swaggerEndpoint});
    lbApp.use(config.swaggerEndpoint, explorer.routes(lbApp, {basePath: config.apiEndpoint}));

    lbApp.use(express.static(publicDir));
    lbApp.listen(1995);

    let mainWindow = new BrowserWindow({width: 800, height: 400});
    mainWindow.loadURL('http://localhost:1234/');
    mainWindow.openDevTools();
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
});