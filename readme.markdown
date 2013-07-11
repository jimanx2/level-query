# level-feast

expose your time-stamped leveldb data as realtime, searchable feeds over http

# example

``` js
```
# query string parameters

Specify any of the following on the query string:

## mode

* dead
* live
* follow

## format

* "json" - the default: results are complete json documents you can call
JSON.parse() on the entire response. Note that 

* "ndj" - [newline delimited json](http://trephine.org/t/index.php?title=Newline_delimited_JSON):
newline-separated lines of json 

