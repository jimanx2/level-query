# level-feast

expose your time-stamped leveldb data as realtime, searchable feeds over http

# example

``` js
```
# query string parameters

Specify any of the following on the query string:

## search

An array of key strings that define a path into a nested document
using [level-search](https://npmjs.org/package/level-search).

This is the same approach that
[JSONStream](https://npmjs.org/package/JSONStream)
and [pathway](https://github.com/substack/node-pathway) use.

## mode

* dead
* live
* follow

## format

* "json" - the default: results are complete json documents you can call
JSON.parse() on the entire response. Note that 

* "ndj" - [newline delimited json](http://trephine.org/t/index.php?title=Newline_delimited_JSON):
newline-separated lines of json 

