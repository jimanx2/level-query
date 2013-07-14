var qs = require('querystring');
var url = require('url');
var search = require('level-search');
var Transform = require('readable-stream/transform');
var PassThrough = require('readable-stream/passthrough');
var through = require('through');
var literalParse = require('json-literal-parse');
var pathway = require('pathway');

var nextTick = typeof setImmediate !== 'undefined'
    ? setImmediate : process.nextTick
;

module.exports = function (db) {
    var index = search(db, 'index');
    
    return function (params) {
        if (typeof params === 'string') {
            params = qs.parse(url.parse(params).query);
            params.raw = false; // can only pass raw in as an object argument
            if (params.format === 'raw') delete params.format;
        }
        if (!params) params = {};
        
        var format = params.format;
        if (format === undefined) format = 'json';
        if (parseBoolean(params.raw)) format = 'raw';
        
        var stringify = createStringify(format);
        if (!stringify) return errorStream(400, 
            'Unknown format: ' + JSON.stringify(format) + '.\n'
            + 'Supported formats: json, pretty, ndj.'
        );
        
        var mode = params.mode;
        if (mode === undefined) mode = 'dead';
        if (mode !== 'dead' && mode !== 'live' && mode !== 'follow') {
            return errorStream(400, 
                'Unknown mode: ' + JSON.stringify(mode) + '.\n'
                + 'Supported modes: dead, live, follow.'
            );
        }
        
        var reverse = parseBoolean(params.reverse);
        if (reverse === undefined && params.order) {
            var order = params.order.toUpperCase();
            if (order === 'ASC' || order === 'ASCEND') {
                reverse = false;
            }
            else if (order === 'DESC' || order === 'DESCEND') {
                reverse = true;
            }
        }
        
        var stream;
        var end = params.end;
        if (end > '~' || end === undefined) end = '~';
        
        var dbOpts = defined({
            min: params.min,
            max: params.max,
            start: params.start,
            end: end,
            reverse: parseBoolean(reverse),
            keys: parseBoolean(params.keys),
            values: parseBoolean(params.values),
            limit: params.limit && parseInt(params.limit, 10),
            keyEncoding: params.keyEncoding,
            valueEncoding: params.valueEncoding,
            encoding: params.encoding
        });
        if (dbOpts.keys === false && dbOpts.values === false) {
            return errorStream(400,
                '"keys" and "values" parameters can\'t both be false'
            );
        }
        
        if (params.sort || (params.filter && !params.sort)) {
            var query = params.sort || params.filter;
            if (typeof query === 'string') {
                try { query = literalParse(query) }
                catch (err) {}
            }
            if (!Array.isArray(query)) query = [ query ];
            stream = index.createSearchStream(query, dbOpts);
        }
        else {
            stream = db.createReadStream(dbOpts);
        }
        
        stream.on('error', function (err) {
            stringify.emit('error', err);
        });
        
        var filter = params.filter && params.sort && (function (str) {
            // TODO: move upstream to level-search using approximateSize tricks
            
            var f = str;
            if (typeof str === 'string') {
                try { f = literalParse(str) }
                catch (err) {}
            }
            if (!Array.isArray(f)) f = [f];
            
            return function (row) {
                return pathway(row.value, f).length > 0;
            };
        })(params.filter);
        
        if (params.map) {
            var map = params.map;
            if (typeof map === 'string') {
                try { var map = literalParse(map) }
                catch (err) {}
            }
            if (typeof map === 'object' && !Array.isArray(map)) {
                return stream.pipe(through(function (row) {
                    if (filter && !filter(row)) return;
                    this.queue(Object.keys(map).reduce(function (acc, key) {
                        var isary = Array.isArray(map[key]);
                        var x = pathway(row.value, isary ? map[key] : [map[key]]);
                        acc[key] = x[0];
                        return acc;
                    }, {}));
                })).pipe(stringify);
            }
            if (!Array.isArray(map)) map = [ map ];
            
            return stream.pipe(through(function (row) {
                if (filter && !filter(row)) return;
                this.queue(pathway(row.value, map));
            })).pipe(stringify);
        }
        else if (filter) {
            return stream.pipe(through(function (row) {
                if (filter(row)) this.queue(row);
            })).pipe(stringify);
        }
        else return stream.pipe(stringify);
    };
};

function errorStream (code, msg) {
    var tr = through();
    nextTick(function () {
        var err = new Error(msg);
        err.code = code;
        tr.emit('error', err);
    });
    return tr;
}

function parseBoolean (s) {
    if (typeof s === 'boolean') return s;
    if (s === undefined) return undefined;
    if (s === '') return true;
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

function createStringify (format) {
    if (format === 'json' || format === 'pretty') {
        var stringify = format === 'pretty'
            ? function (row) { return JSON.stringify(row, null, 2) }
            : JSON.stringify
        ;
        
        var tr = new Transform({ objectMode: true });
        var first = true;
        tr._transform = function (row, enc, next) {
            if (first) {
                first = false;
                this.push(stringify(row));
            }
            else {
                this.push(',\n' + stringify(row));
            }
            next();
        };
        tr._flush = function (next) {
            this.push(']\n');
            this.push(null);
            next();
        };
        tr.push('[');
        return tr;
    }
    else if (format === 'ndj') {
        var tr = new Transform({ objectMode: true });
        tr._transform = function (row, enc, next) {
            this.push(JSON.stringify(row) + '\n');
            next();
        };
        return tr;
    }
    else if (format === 'raw') {
        return new PassThrough();
    }
}

function isRegExp (r) {
    return Object.prototype.toString.call(r) === '[object RegExp]';
}
