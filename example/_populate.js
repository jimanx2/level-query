var levelup = require('levelup');
var crypto = require('crypto');
var concat = require('concat-stream');

var db = levelup(__dirname + '/db');
var h = crypto.createHash('sha1', { encoding: 'hex' });

var hash, body, pending = 2;
function ready () { if (--pending === 0) db.put(hash, body) }

process.stdin.pipe(h).pipe(concat(function (hash_) {
    hash = hash_;
    ready();
}));
process.stdin.pipe(concat(function (body_) {
    body = body_.toString('utf8');
    ready();
}));
