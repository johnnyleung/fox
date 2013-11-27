var url = require('url');

exports.request = function (outgoingRequestObject) {

	var requestUrl = url.format({
		hostname: outgoingRequestObject.hostname,
		port: outgoingRequestObject.port,
		pathname: outgoingRequestObject.path
	});

	console.log(outgoingRequestObject.client +
		'\t' + outgoingRequestObject.method +
		'\t' + 'http:' + requestUrl);

	return outgoingRequestObject;

};

exports.response = function (outgoingResponseObject) {

	var requestUrl = url.format({
		hostname: outgoingResponseObject.hostname,
		port: outgoingResponseObject.port,
		pathname: outgoingResponseObject.path
	});

	console.log(outgoingResponseObject.client +
		'\t' + outgoingResponseObject.statusCode +
		'\t' + 'http:' + requestUrl);


	return outgoingResponseObject;

};