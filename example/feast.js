var http = require('http');
var levelup = require('levelup');
var sublevel = require('level-sublevel');

var crypto = require('crypto');
var concat = require('concat-stream');
var through = require('through');
var duplexer = require('duplexer');

var db = sublevel(levelup(__dirname + '/db', { encoding: 'json' }));
var feast = require('../')(db);

var stringify = require('JSONStream').stringify;

var server = http.createServer(function (req, res) {
    if (req.method === 'POST') {
        req.pipe(putHash()).pipe(concat(function (hash) {
            res.end(hash + '\n');
        }));
    }
    else if (req.method === 'GET') {
        var s = feast(req.url);
        s.on('head', res.writeHead.bind(res));
        s.pipe(res);
    }
    else {
        res.statusCode = 404;
        res.end();
    }
});
server.listen(4000);

function putHash () {
    var input = through();
    var sha1 = crypto.createHash('sha1', { encoding: 'hex' });
    
    input.pipe(concat(function (body) {
        try { var obj = JSON.parse(body) }
        catch (err) {
            return dup.emit('error', err);
        }
        
        sha1.pipe(concat(function (hash) {
            db.put(hash, obj);
        }));
        sha1.end(JSON.stringify(obj));
    }));
    
    var dup = duplexer(input, sha1);
    return dup;
}
