var hyperquest = require('hyperquest');
var path = require('path');

var rows = require(path.resolve(process.argv[2]));
var idKey = process.argv[3];

for (var i = 4; i < process.argv.length; i++) {
    rows = rows[process.argv[i]];
}

rows.forEach(function (row) {
    var hq = hyperquest.post('http://localhost:4000/' + row[idKey]);
    hq.end(JSON.stringify(row));
});
