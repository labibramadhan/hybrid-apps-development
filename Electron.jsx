import _ from 'underscore';
import fs from 'fs';
import loopback from 'loopback';
import explorer from 'loopback-component-explorer';
import {client} from 'electron-connect';

const lbApp = loopback();

lbApp.set('legacyExplorer', false);

let lbAppServer;

export const io = require('socket.io')();

const app = require('electron').app;
const BrowserWindow = require('electron').BrowserWindow;
const publicDir = __dirname + '/www/public';

const embedApFile = (file, type, params) => {
    if (fs.statSync(file).isFile()) {
        let currentItem = require(file);
        switch (type) {
            case 'boot':
            case 'routes':
                currentItem(params);
                break;
            case 'models':
                if (typeof currentItem.options === 'undefined') {
                    currentItem.options = {};
                }
                let model = params.ds.createModel(currentItem.name, currentItem.properties, currentItem.options);
                params.app.model(model);
                break;
        }
    }
};

const embedApp = (params, type) => {
    const targetPath = './node_modules/'.concat(params.dir);
    if (fs.statSync(targetPath).isFile()) {
        embedApFile(targetPath, type, params.passParams);
    } else {
        fs.readdir(targetPath, (err, files) => {
            files.forEach((file) => {
                const filePath = targetPath.concat("/".concat(file));
                embedApFile(filePath, type, params.passParams);
            });
        });
    }
};

const ds = loopback.createDataSource({
    connector: loopback.Memory,
    file: "db.json"
});

const config = JSON.parse(fs.readFileSync('.rsrc', 'utf8'));

if (typeof config.modules !== 'undefined') {
    _.each(config.modules, (cfg, module) => {
        if (typeof cfg.routes !== "undefined") {
            embedApp({passParams: {app: lbApp, io: io}, dir: module.concat(cfg.routes)}, 'routes');
        }
        if (typeof cfg.models !== "undefined") {
            embedApp({passParams: {app: lbApp, io: io, ds: ds}, dir: module.concat(cfg.models)}, 'models');
        }
    });
}

app.on('window-all-closed', function () {
    app.quit();
});

app.on('ready', function () {
    lbApp.use(config.apiEndpoint, loopback.rest());
    lbApp.use(loopback.static(publicDir));
    lbApp.use(loopback.compress());
    explorer(lbApp, {basePath: config.apiEndpoint, mountPath: config.swaggerEndpoint});
    lbApp.use(config.swaggerEndpoint, explorer.routes(lbApp, {basePath: config.apiEndpoint}));
    lbApp.use(loopback.urlNotFound());
    lbApp.use(loopback.errorHandler());

    lbAppServer = lbApp.listen(1234);

    _.each(config.modules, (cfg, module) => {
        if (typeof cfg.boot !== "undefined") {
            embedApp({passParams: {app: lbApp, io: io}, dir: module.concat(cfg.boot)}, 'boot');
        }
    });

    io.attach(lbAppServer);

    let mainWindow = new BrowserWindow({width: 1100, height: 700});
    mainWindow.loadURL('http://localhost:8080/');
    mainWindow.openDevTools();
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
    client.create(mainWindow);
});

app.on('before-quit', function () {
    lbAppServer.close();
    app.exit(1);
});