/*global describe, it, expect, require, beforeEach, Promise,setTimeout */
const sequentialPromiseMap = require('../src/sequential-promise-map');
describe('sequentialPromiseMap', () => {
	'use strict';
	let promises, timeouts;
	const waitFor = function (index) {
			return new Promise(resolve => {
				const poll = function () {
					if (promises[index]) {
						resolve({ promise: promises[index] });
					} else {
						timeouts.push(setTimeout(poll, 50));
					}
				};
				poll();
			});
		},
		generator = function (arg) {
			let next = {}, res, rej;
			next = new Promise((resolve, reject) => {
				res = resolve;
				rej = reject;
			});
			next.reject = rej;
			next.resolve = res;
			next.arg = arg;
			promises.push(next);
			return next;
		};
	beforeEach(() => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = 200;
		promises = [];
		timeouts = [];
	});
	afterEach(() => {
		timeouts.map(t => clearTimeout(t));
	});
	it('resolves immediately if no arguments', done => {
		sequentialPromiseMap([], generator).then(result => {
			expect(promises.length).toEqual(0);
			expect(result).toEqual([]);
		}).then(done, done.fail);
	});
	it('calls the generator with the argument, index and array', done => {
		sequentialPromiseMap(['a', 'b', 'c'], (txt, index, arr) => Promise.resolve(txt + index + JSON.stringify(arr)))
			.then(result => expect(result).toEqual(['a0["a","b","c"]', 'b1["a","b","c"]', 'c2["a","b","c"]']))
			.then(done, done.fail);
	});
	it('executes a single promise mapping', done => {
		sequentialPromiseMap(['a'], generator).then(result => {
			expect(promises.length).toEqual(1);
			expect(result).toEqual(['eee']);
			expect(promises[0].arg).toEqual('a');
		}).then(done, done.fail);
		waitFor(0).then(promiseContainer => {
			expect(promiseContainer.promise.arg).toEqual('a');
			promiseContainer.promise.resolve('eee');
		}).catch(done.fail);
	});
	it('does not resolve until all promises resolve', done => {
		sequentialPromiseMap(['a', 'b', 'c'], generator).then(done.fail, done.fail);
		waitFor(0).then(promiseContainer => promiseContainer.promise.resolve('eee'));
		waitFor(1).then(() => expect(promises.length).toEqual(2)).then(done);
	});
	it('resolves after all the promises resolve', done => {
		sequentialPromiseMap(['a', 'b'], generator)
			.then(result => expect(result).toEqual(['aaa', 'bbb']))
			.then(done, done.fail);
		waitFor(0).then(promiseContainer => promiseContainer.promise.resolve('aaa'));
		waitFor(1).then(promiseContainer => promiseContainer.promise.resolve('bbb'));
	});
	it('does not modify the original array', done => {
		const originalArray = ['a', 'b'];
		sequentialPromiseMap(originalArray, generator)
			.then(() => expect(originalArray).toEqual(['a', 'b']))
			.then(done, done.fail);
		waitFor(0).then(promiseContainer => promiseContainer.promise.resolve('aaa'));
		waitFor(1).then(promiseContainer => promiseContainer.promise.resolve('bbb'));
	});
	it('does not execute subsequent promises after a failure', done => {
		sequentialPromiseMap(['a', 'b'], generator).then(done.fail, () => {
			expect(promises.length).toEqual(1);
			done();
		});
		waitFor(0).then(promiseContainer => promiseContainer.promise.reject('aaa'));
	});
	it('rejects with the error of the first rejected promise', done => {
		sequentialPromiseMap(['a', 'b', 'c'], generator)
		.then(done.fail, err => {
			expect(err).toEqual('boom');
			done();
		});
		waitFor(0).then(promiseContainer => promiseContainer.promise.resolve('aaa'));
		waitFor(1).then(promiseContainer => promiseContainer.promise.reject('boom'));
	});
	it('rejects if the first argument is not an array', () => {
		expect(() => sequentialPromiseMap({}, generator)).toThrowError('the first argument must be an array');
	});
	it('rejects if the second argument is not a function', () => {
		expect(() => sequentialPromiseMap(['x'], 2)).toThrowError('the second argument must be a function');
	});

	describe('batching', () => {
		it('calls the generator with the argument, index and array', done => {
			const logGenerator = (txt, index, arr) => Promise.resolve(txt + index + JSON.stringify(arr));
			sequentialPromiseMap(['a', 'b', 'c'], logGenerator, 2)
				.then(result => expect(result).toEqual(['a0["a","b","c"]', 'b1["a","b","c"]', 'c2["a","b","c"]']))
				.then(done, done.fail);
		});
		it('does not run batches if not requested', done => {
			sequentialPromiseMap(['a', 'b', 'c', 'd'], generator).then(done.fail, (e) => {
				expect(e).toEqual('aaa');
				expect(promises.length).toEqual(1);
				done();
			});
			waitFor(0).then(promiseContainer => promiseContainer.promise.reject('aaa'));
			waitFor(1).then(promiseContainer => promiseContainer.promise.reject('boom'));

		});
		it('does not run batches if batch size is 1', done => {
			sequentialPromiseMap(['a', 'b', 'c', 'd'], generator, 1).then(done.fail, (e) => {
				expect(e).toEqual('aaa');
				expect(promises.length).toEqual(1);
				done();
			});
			waitFor(0).then(promiseContainer => promiseContainer.promise.reject('aaa'));
			waitFor(1).then(promiseContainer => promiseContainer.promise.reject('boom'));

		});

		it('executes promises in a batch if specified', done => {
			sequentialPromiseMap(['a', 'b', 'c', 'd'], generator, 2).then(done.fail, () => {
				expect(promises.length).toEqual(2);
				done();
			});
			waitFor(1)
				.then(promiseContainer => promiseContainer.promise.resolve('b'))
				.then(() => waitFor(0))
				.then(promiseContainer => promiseContainer.promise.reject('aaa'));
		});

		it('rejects with the error of the first rejected promise in a batch', done => {
			sequentialPromiseMap(['a', 'b', 'c'], generator, 2)
				.then(done.fail)
				.catch(err => {
					expect(err).toEqual('boom');
					done();
				});
			waitFor(0).then(promiseContainer => promiseContainer.promise.resolve('aaa'));
			waitFor(1).then(promiseContainer => promiseContainer.promise.reject('boom'));
		});
		it('rejects if the third argument is not a valid batch size', () => {
			expect(() => sequentialPromiseMap([1, 2, 3], generator, -1)).toThrowError('the third argument must be undefined or a positive integer');
			expect(() => sequentialPromiseMap([1, 2, 3], generator, 1.15)).toThrowError('the third argument must be undefined or a positive integer');
			expect(() => sequentialPromiseMap([1, 2, 3], generator, 'x')).toThrowError('the third argument must be undefined or a positive integer');
			expect(() => sequentialPromiseMap([1, 2, 3], generator, '2')).toThrowError('the third argument must be undefined or a positive integer');
		});

	});

});
