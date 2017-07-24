module.exports = function sequentialPromiseMap(array, generator) {
	'use strict';
	let index = 0;
	const results = [],
		items = (array && array.slice()) || [],
		sendSingle = function (item) {
			return generator(item, index++)
			.then(result => results.push(result));
		},
		sendAll = function () {
			if (!items.length) {
				return Promise.resolve(results);
			} else {
				return sendSingle(items.shift())
				.then(sendAll);
			}
		};
	return sendAll();
};
