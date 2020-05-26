# sequential-promise-map

A simple sequential version of `Promise.map`, useful to transform an array of values into asynchronous promises, when you need to limit parallel execution of promise generators (eg to prevent hitting external resource thresholds, or to guarantee that things need to happen in a particular sequence).

The function  has no dependencies so it will work in Node or browsers, as long as native Promises are supported.

### Installation

```bash
npm install sequential-promise-map
```

### Usage

```js
sequentialPromiseMap(arrayOfValues, promiseGenerator, /*batchSize*/).then(....) 
```

* `arrayOfValues` should be an `Array` of elements that will be asynchronously processed
* `promiseGenerator` parameter should be a function to process each element of the array, receiving up to three arguments:
```js
promiseGenerator = function(currentElement, indexOfCurrent, originalArray) {
  ...
}
```
* `batchSize` is an optional argument, a positive integer specifying the maximum batch size for parallel processing. If not set, the elements will be processed one by one. Set this to a value greater than 1 to allow for parallelisation. 

The function will resolve will contain an array of `Promise` results, in the same order as the arguments, or reject with the first rejection.


### Example

```js
const sequentialPromiseMap = require('sequential-promise-map');

const fruits = ['apples', 'oranges', 'grapes'];

const invert = function (name/*, index, array*/) {
  return new Promise(resolve => {
    resolve(name.split('').reverse().join(''));
  });
};

sequentialPromiseMap(fruits, invert).then(results => console.log('got results', results));
```

### License

MIT
