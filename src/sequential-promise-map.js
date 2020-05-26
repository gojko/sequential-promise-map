module.exports = function sequentialPromiseMap(array, generator, batchArg) {
	'use strict';
	if (!Array.isArray(array)) {
		throw new Error('the first argument must be an array');
	}
	if (typeof generator !== 'function') {
		throw new Error('the second argument must be a function');
	}
	if (batchArg && (!Number.isInteger(batchArg) || batchArg < 1)) {
		throw new Error('the third argument must be undefined or a positive integer');
	}
	const batchSize = batchArg || 1,
		results = [],
		processBatch = function (batch, startIndex) {
			const shiftIndexAndProcess = (element, index) => generator(element, index + startIndex, array);
			return Promise.all(batch.map(shiftIndexAndProcess));
		},
		sendNextBatch = function (startIndex) {
			if (startIndex >= array.length) {
				return Promise.resolve();
			}
			const next = array.slice(startIndex, startIndex + batchSize);
			return processBatch(next, startIndex)
				.then(nextResults => results.push.apply(results, nextResults))
				.then(() => sendNextBatch(startIndex + batchSize));
		};
	return sendNextBatch(0)
		.then(() => results);
};
