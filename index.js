var qs = require('querystring');
var url = require('url');
var search = require('level-search');
var JSONStream = require('JSONStream');
var through = require('through');

var nextTick = typeof setImmediate !== 'undefined'
    ? setImmediate : process.nextTick
;

module.exports = function (db) {
    var index = search(db, 'index');
    
    return function (params, cb) {
        if (typeof params === 'string') {
            params = qs.parse(url.parse(params).query);
        }
        
        var stringify, format = params.format;
        if (format === 'json' || format === undefined) {
            stringify = JSONStream.stringify();
        }
        else if (format === 'ndj') {
            stringify = through(function (row) {
                this.queue(JSON.stringify(row) + '\n');
            });
        }
        else {
            return errorStream(400, 
                'Unknown format: ' + JSON.stringify(format) + '.\n'
                + 'Support formats: json, ndj.\n'
            );
        }
        
        var mode = params.mode;
        if (mode === undefined) mode = 'dead';
        if (mode !== 'dead' && mode !== 'live' && mode !== 'follow') {
            return errorStream(400, 
                'Unknown mode: ' + JSON.stringify(mode) + '.\n'
                + 'Supported modes: dead, live, follow.\n'
            );
        }
        
        var stream;
        if (params.filter) {
            try { var q = JSON.parse(params.filter) }
            catch (err) {
                return errorStream(400, err);
            }
            if (!Array.isArray(q)) {
                return errorStream(400,
                    'filter parameter must be a JSON array\n'
                );
            }
            stream = index.search(q);
        }
        else {
            var end = params.end;
            if (end > '~' || end === undefined) end = '~';
            
            stream = db.createReadStream(defined({
                start: params.start,
                end: end,
                reverse: parseBoolean(params.reverse),
                keys: parseBoolean(params.keys),
                values: parseBoolean(params.values),
                limit: params.limit && parseInt(params.limit, 10),
                keyEncoding: params.keyEncoding,
                valueEncoding: params.valueEncoding,
                encoding: params.encoding
            }));
        }
        return setType(stream.pipe(stringify), 'application/' + format);
    };
};

function errorStream (code, msg) {
    var tr = through();
    nextTick(function () {
        tr.emit('code', code);
        tr.emit('type', 'text/plain');
        tr.emit('head', code, { 'content-type': 'text/plain' });
        tr.queue(msg && msg.message || String(msg));
        tr.queue(null);
    });
    return tr;
}

function setType (stream, type) {
    nextTick(function () {
        stream.emit('code', 200);
        stream.emit('type', type);
        stream.emit('head', 200, { 'content-type': type });
    });
    return stream;
}

function parseBoolean (s) {
    if (s === undefined) return undefined;
    if (!s) return false;
    if (s === 'false') return false;
    if (s === '0') return false;
    return true;
}

function defined (obj) {
    return Object.keys(obj).reduce(function (acc, key) {
        if (obj[key] !== undefined) acc[key] = obj[key];
        return acc;
    }, {});
}
