'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.io = undefined;

var _underscore = require('underscore');

var _underscore2 = _interopRequireDefault(_underscore);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _loopback = require('loopback');

var _loopback2 = _interopRequireDefault(_loopback);

var _loopbackComponentExplorer = require('loopback-component-explorer');

var _loopbackComponentExplorer2 = _interopRequireDefault(_loopbackComponentExplorer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var lbApp = (0, _loopback2.default)();

var io = exports.io = require('socket.io')();

var app = require('electron').app;
var BrowserWindow = require('electron').BrowserWindow;

var publicDir = __dirname + '/www/public';

var embedApFile = function embedApFile(file, type, params) {
    if (_fs2.default.statSync(file).isFile()) {
        var currentItem = require(file);
        switch (type) {
            case 'boot':
            case 'routes':
                currentItem(params);
                break;
            case 'models':
                if (typeof currentItem.options === 'undefined') {
                    currentItem.options = {};
                }
                var model = params.ds.createModel(currentItem.name, currentItem.properties, currentItem.options);
                params.app.model(model);
                break;
        }
    }
};

var embedApp = function embedApp(params, type) {
    var targetPath = './node_modules/'.concat(params.dir);
    if (_fs2.default.statSync(targetPath).isFile()) {
        embedApFile(targetPath, type, params.passParams);
    } else {
        _fs2.default.readdir(targetPath, function (err, files) {
            files.forEach(function (file) {
                var filePath = targetPath.concat("/".concat(file));
                embedApFile(filePath, type, params.passParams);
            });
        });
    }
};

var ds = _loopback2.default.createDataSource('memory');

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
    (0, _loopbackComponentExplorer2.default)(lbApp, { basePath: config.apiEndpoint, mountPath: config.swaggerEndpoint });
    lbApp.use(config.swaggerEndpoint, _loopbackComponentExplorer2.default.routes(lbApp, { basePath: config.apiEndpoint }));

    lbApp.use(_express2.default.static(publicDir));

    var lbAppServer = lbApp.listen(1234);

    _underscore2.default.each(config.modules, function (cfg, module) {
        if (typeof cfg.boot !== "undefined") {
            embedApp({ passParams: { app: lbApp, io: io }, dir: module.concat(cfg.boot) }, 'boot');
        }
    });

    io.attach(lbAppServer);

    var mainWindow = new BrowserWindow({ width: 800, height: 400 });
    mainWindow.loadURL('http://localhost:1234/');
    mainWindow.openDevTools();
    mainWindow.on('closed', function () {
        mainWindow = null;
    });
});
