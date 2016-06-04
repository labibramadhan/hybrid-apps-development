'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.io = undefined;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _loopback = require('loopback');

var _loopback2 = _interopRequireDefault(_loopback);

var _loopbackComponentExplorer = require('loopback-component-explorer');

var _loopbackComponentExplorer2 = _interopRequireDefault(_loopbackComponentExplorer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var lbApp = (0, _loopback2.default)();

lbApp.set('legacyExplorer', false);

var lbAppServer = void 0,
    mainWindow = void 0;

var io = exports.io = require('socket.io')();

var app = require('electron').app;
var BrowserWindow = require('electron').BrowserWindow;
var publicDir = __dirname + '/www';

var shouldQuit = app.makeSingleInstance(function (commandLine, workingDirectory) {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

if (shouldQuit) {
    app.quit();
}

var embedApFile = function embedApFile(name, file, type, params) {
    if (_fs2.default.statSync(file).isFile()) {
        var currentItem = require(file);
        switch (type) {
            case 'boot':
            case 'routes':
                currentItem(params);
                break;
            case 'models':
                var model = void 0;
                if (typeof currentItem.options === 'undefined') {
                    currentItem.options = {};
                }
                if (/.*\.user\.js$/.test(name)) {
                    model = _loopback2.default.User.extend(currentItem.name, currentItem.properties, currentItem.settings);
                    ds.attach(model);
                } else {
                    model = params.ds.createModel(currentItem.name, currentItem.properties, currentItem.options);
                }
                params.app.model(model, { datasource: ds });
                break;
        }
    }
};

var embedApp = function embedApp(params, type) {
    var targetPath = './node_modules/'.concat(params.dir);
    if (_fs2.default.statSync(targetPath).isFile()) {
        embedApFile(targetPath.split('/').pop(), targetPath, type, params.passParams);
    } else {
        _fs2.default.readdir(targetPath, function (err, files) {
            files.forEach(function (file) {
                var filePath = targetPath.concat("/".concat(file));
                embedApFile(file, filePath, type, params.passParams);
            });
        });
    }
};

var ds = _loopback2.default.createDataSource({
    connector: _loopback2.default.Memory,
    file: "db.json"
});

ds.attach(_loopback2.default.Email);
lbApp.model(_loopback2.default.Email);
ds.attach(_loopback2.default.Application);
lbApp.model(_loopback2.default.Application);
ds.attach(_loopback2.default.AccessToken);
lbApp.model(_loopback2.default.AccessToken);
ds.attach(_loopback2.default.User);
ds.attach(_loopback2.default.RoleMapping);
lbApp.model(_loopback2.default.RoleMapping);
ds.attach(_loopback2.default.Role);
lbApp.model(_loopback2.default.Role);
ds.attach(_loopback2.default.ACL);
lbApp.model(_loopback2.default.ACL);
ds.attach(_loopback2.default.Scope);
lbApp.model(_loopback2.default.Scope);
ds.attach(_loopback2.default.Change);
lbApp.model(_loopback2.default.Change);
ds.attach(_loopback2.default.Checkpoint);
lbApp.model(_loopback2.default.Checkpoint);

var config = JSON.parse(_fs2.default.readFileSync('.rsrc', 'utf8'));

if (typeof config.modules !== 'undefined') {
    _underscore2.default.each(config.modules, function (cfg, module) {
        if (typeof cfg.routes !== "undefined") {
            embedApp({ passParams: { app: lbApp, io: io }, dir: module.concat(cfg.routes) }, 'routes');
        }
        if (typeof cfg.models !== "undefined") {
            embedApp({ passParams: { app: lbApp, io: io, ds: ds }, dir: module.concat(cfg.models) }, 'models');
        }
    });
}

app.on('window-all-closed', function () {
    app.quit();
});

app.on('ready', function () {
    lbApp.use(config.apiEndpoint, _loopback2.default.rest());
    lbApp.use(_loopback2.default.static(publicDir));
    lbApp.use(_loopback2.default.compress());
    (0, _loopbackComponentExplorer2.default)(lbApp, { basePath: config.apiEndpoint, mountPath: config.swaggerEndpoint });
    lbApp.use(config.swaggerEndpoint, _loopbackComponentExplorer2.default.routes(lbApp, { basePath: config.apiEndpoint }));
    lbApp.use(_loopback2.default.urlNotFound());
    lbApp.use(_loopback2.default.errorHandler());

    lbAppServer = lbApp.listen(1234);

    _underscore2.default.each(config.modules, function (cfg, module) {
        if (typeof cfg.boot !== "undefined") {
            embedApp({ passParams: { app: lbApp, io: io, conf: config }, dir: module.concat(cfg.boot) }, 'boot');
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