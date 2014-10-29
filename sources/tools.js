// ---------------------------------------

if (require.main === module)
	throw (new Error ());
require ("./reloader") (module);

// ---------------------------------------

var _ = require ("underscore");
var events = require ("events");
var printf = require ("printf");
var util = require ("util");

// ---------------------------------------

function _EventEmitterClass () {
	var _Class = function () {
		events.EventEmitter.call (this);
	};
	util.inherits (_Class, events.EventEmitter);
	return (_Class);
}

module.exports.EventEmitterClass = _EventEmitterClass;

// ---------------------------------------

function _thisBuildError () {
	
	var _type = undefined;
	var _reason = undefined;
	var _message = undefined;
	var _exception = undefined;
	var _extra = undefined;
	
	switch (arguments.length) {
		case 4 : _extra = arguments[3];
		case 3 : _message = arguments[2];
		case 2 : _reason = arguments[1];
		case 1 : _type = arguments[0]; break;
		default : throw (new Error ("wtf!"));
	}
	
	if (_.isArray (_message))
		_message = printf.call (null, _message);
	else if (_.isObject (_message)) {
		if (_message["stack"] !== undefined)
			_exception = _message;
		_message = _message.toString ();
	}
	
	if (_type === undefined) _type = null;
	if (_reason === undefined) _reason = null;
	if (_message === undefined) _message = null;
	if (_exception === undefined) _exception = null;
	if (_extra === undefined) _extra = null;
	
	if (! (_.isString (_type) || (_type === null))) throw (new Error ("wtf!"));
	if (! (_.isString (_reason) || (_reason === null))) throw (new Error ("wtf!"));
	if (! (_.isString (_message) || (_message === null))) throw (new Error ("wtf!"));
	
	var _error = {
			type : _type,
			reason : _reason,
			message : _message,
			// source : this,
	};
	if (_exception !== null)
		_error["exception"] = _exception;
	if (_extra !== null)
		_.extend (_error, _extra);
	
	return (_error);
}

module.exports.thisBuildError = _thisBuildError;

// ---------------------------------------

function _thisThrowError () {
	var _error = undefined;
	switch (arguments.length) {
		case 1 : _error = arguments[0]; break;
		default : _error = _thisBuildError.call (this, arguments); break;
	}
	var _throw = new Error (_error.message);
	_throw.error = _error;
	throw (_throw);
}

module.exports.thisThrowError = _thisThrowError;

// ---------------------------------------

function _thisEmitError () {
	var _error = undefined;
	switch (arguments.length) {
		case 1 : _error = arguments[0]; break;
		default : _error = _thisBuildError.call (this, arguments); break;
	}
	this.emit ("error", _error);
}

function _thisEmitReady () {
	_.defer (_.bind (this.emit, this, "ready"));
}

module.exports.thisEmitError = _thisEmitError;
module.exports.thisEmitReady = _thisEmitReady;

// ---------------------------------------
