import _ from 'underscore';
import fs from 'fs';
import loopback from 'loopback';
import explorer from 'loopback-component-explorer';

const lbApp = loopback();

lbApp.set('legacyExplorer', false);

let lbAppServer, mainWindow;

export const io = require('socket.io')();

const app = require('electron').app;
const BrowserWindow = require('electron').BrowserWindow;
const publicDir = __dirname + '/www';

const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

if (shouldQuit) {
    app.quit();
}

const embedApFile = (name, file, type, params) => {
    if (fs.statSync(file).isFile()) {
        let currentItem = require(file);
        switch (type) {
            case 'boot':
            case 'routes':
                currentItem(params);
                break;
            case 'models':
                let model;
                if (typeof currentItem.options === 'undefined') {
                    currentItem.options = {};
                }
                if (/.*\.user\.js$/.test(name)) {
                    model = loopback.User.extend(currentItem.name, currentItem.properties, currentItem.settings);
                    ds.attach(model);
                } else {
                    model = params.ds.createModel(currentItem.name, currentItem.properties, currentItem.options);
                }
                params.app.model(model, {datasource: ds});
                break;
        }
    }
};

const embedApp = (params, type) => {
    const targetPath = './node_modules/'.concat(params.dir);
    if (fs.statSync(targetPath).isFile()) {
        embedApFile(targetPath.split('/').pop(), targetPath, type, params.passParams);
    } else {
        fs.readdir(targetPath, (err, files) => {
            files.forEach((file) => {
                const filePath = targetPath.concat("/".concat(file));
                embedApFile(file, filePath, type, params.passParams);
            });
        });
    }
};

const ds = loopback.createDataSource({
    connector: loopback.Memory,
    file: "db.json"
});

ds.attach(loopback.Email);
lbApp.model(loopback.Email);
ds.attach(loopback.Application);
lbApp.model(loopback.Application);
ds.attach(loopback.AccessToken);
lbApp.model(loopback.AccessToken);
ds.attach(loopback.User);
ds.attach(loopback.RoleMapping);
lbApp.model(loopback.RoleMapping);
ds.attach(loopback.Role);
lbApp.model(loopback.Role);
ds.attach(loopback.ACL);
lbApp.model(loopback.ACL);
ds.attach(loopback.Scope);
lbApp.model(loopback.Scope);
ds.attach(loopback.Change);
lbApp.model(loopback.Change);
ds.attach(loopback.Checkpoint);
lbApp.model(loopback.Checkpoint);

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
            embedApp({passParams: {app: lbApp, io: io, conf: config}, dir: module.concat(cfg.boot)}, 'boot');
        }
    });

    io.attach(lbAppServer);

    mainWindow = new BrowserWindow({
        width: 1100,
        height: 700
    });
    mainWindow.loadURL('http://localhost:1235');
    mainWindow.openDevTools();
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
});

app.on('before-quit', function () {
    lbAppServer.close();
    app.exit(1);
});

