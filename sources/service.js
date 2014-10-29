// ---------------------------------------

if (require.main === module)
	throw (new Error ());
require ("./reloader") (module);

// ---------------------------------------

var _ = require ("underscore");
var connect = require ("connect");
var dispatch = require ("dispatch");

var configuration = require ("./configuration");
var transcript = require ("./transcript") (module, configuration.libTranscriptLevel);
var tools = require ("./tools");

// ---------------------------------------

var _Service = tools.EventEmitterClass ();

_Service.prototype._buildError = tools.thisBuildError;
_Service.prototype._emitError = tools.thisEmitError;
_Service.prototype._emitReady = tools.thisEmitReady;

// ---------------------------------------

_Service.prototype._initialize = function (_backend) {
	transcript.traceInformation ("initializing the HTTP service...");
	var self = this;
	self._backend = _backend;
	self._server = connect.createServer ();
	self._server.use (function (_request, _response, _next) {
		var _clientEndpoint;
		if ((_clientEndpoint === undefined) && (_request.socket !== undefined))
			_clientEndpoint = _request.socket.remoteAddress;
		if (_clientEndpoint === undefined)
			_clientEndpoint = "unknown";
		transcript.traceDebugging ("handling `%s` for `%s` from `%s`...", _request.method, _request.originalUrl, _clientEndpoint);
		_next ();
	});
	self._server.use (dispatch ({
			
			"GET /modules" : self._handleRequestCallback (self._handleModulesList),
			"GET /modules/:module" : self._handleRequestCallback (self._handleModuleDescribe),
			"PUT /modules/:module" : self._handleRequestCallback (self._handleModuleCreate),
			
			"GET /modules/:module/operations" : self._handleRequestCallback (self._handleOperationsList),
			"GET /modules/:module/operations/:operation" : self._handleRequestCallback (self._handleOperationDescribe),
			"POST /modules/:module/operations/:operation/:credential" : self._handleRequestCallback (self._handleOperationExecute),
			
			"GET /credentials" : self._handleRequestCallback (self._handleCredentialsList),
			"GET /credentials/:credential" : self._handleRequestCallback (self._handleCredentialExport),
			"PUT /credentials/:credential" : self._handleRequestCallback (self._handleCredentialImport),
	}));
	self._server.listen (configuration.servicePort, configuration.serviceHost);
	self._emitReady ();
};

function _initialize (_backend) {
	var _service = new _Service ();
	_service._initialize (_backend);
	return (_service);
}

module.exports.initialize = _initialize;

// ---------------------------------------

_Service.prototype._handleModulesList = function (_request, _response, _next) {
	this._backend.modulesList (
			this._handleOutcomeCallback (_request, _response, _next),
			this._handleErrorCallback (_request, _response, _next));
};

_Service.prototype._handleModuleDescribe = function (_request, _response, _next, _module) {
	this._backend.moduleDescribe (_module,
			this._handleOutcomeCallback (_request, _response, _next),
			this._handleErrorCallback (_request, _response, _next));
};

_Service.prototype._handleModuleCreate = function (_request, _response, _next, _module) {
	this._backend.moduleCreate (_module, _request.body,
			this._handleOutcomeCallback (_request, _response, _next),
			this._handleErrorCallback (_request, _response, _next));
};

// ---------------------------------------

_Service.prototype._handleOperationsList = function (_request, _response, _next, _module) {
	this._backend.operationsList (_module,
			this._handleOutcomeCallback (_request, _response, _next),
			this._handleErrorCallback (_request, _response, _next));
};

_Service.prototype._handleOperationDescribe = function (_request, _response, _next, _module, _operation) {
	this._backend.operationDescribe (_module, _operation, _request.body,
			this._handleOutcomeCallback (_request, _response, _next),
			this._handleErrorCallback (_request, _response, _next));
};

_Service.prototype._handleOperationExecute = function (_request, _response, _next, _module, _operation, _credential) {
	this._backend.operationExecute (_module, _operation, _credential, _request.body,
			this._handleOutcomeCallback (_request, _response, _next),
			this._handleErrorCallback (_request, _response, _next));
};

// ---------------------------------------

_Service.prototype._handleCredentialsList = function (_request, _response, _next) {
	this._backend.credentialsList (
			this._handleOutcomeCallback (_request, _response, _next),
			this._handleErrorCallback (_request, _response, _next));
};

_Service.prototype._handleCredentialExport = function (_request, _response, _next, _credential) {
	this._backend.credentialExport (_credential,
			this._handleOutcomeCallback (_request, _response, _next),
			this._handleErrorCallback (_request, _response, _next));
};

_Service.prototype._handleCredentialImport = function (_request, _response, _next, _credential) {
	this._backend.credentialImport (_credential, _request.body,
			this._handleOutcomeCallback (_request, _response, _next),
			this._handleErrorCallback (_request, _response, _next));
};

// ---------------------------------------

_Service.prototype._handleRequestCallback = function (_callback) {
	var self = this;
	var _postWrapper = function (_request, _response, _next) {
		var _arguments = arguments;
		var _bodyChunks = [];
		var _bodySize = 0;
		_request.on ("data", function (_bodyChunk) {
			_bodyChunks.push (_bodyChunk);
			_bodySize += _bodyChunk.length;
			if (_bodySize > 1024 * 1024) {
				_request.pause ();
				var _error = self._buildError ("http-service", "body-content-overflow", null, {x_size : _bodySize});
				self._handleError (_request, _response, _next, _error);
			}
		});
		_request.on ("end", function () {
			try {
				var _body = JSON.parse (_bodyChunks.join (""));
			} catch (_exception) {
				var _error = self._buildError ("http-service", "body-content-invalid", _exception);
				return (self._handleError (_request, _response, _next, _error));
			}
			_request.body = _body;
			return (_callback.apply (self, _arguments));
		});
		_request.on ("close", _.bind (self._emitError, self, "http-service", "request-failure"));
	};
	var _wrapper = function (_request, _response, _next) {
		switch (_request.method) {
			case "GET" :
				return (_callback.apply (self, arguments));
				break;
			case "POST" :
			case "PUT" :
				var _contentType = _request.headers["content-type"];
				if (_contentType !== undefined) {
					_contentType = _contentType.split (";") [0] .trim () .toLowerCase ();
					if (_contentType == "application/json") {
						return (_postWrapper.apply (self, arguments));
					} else {
						var _error = self._buildError ("http-service", "body-content-type-invalid", null, {x_contentType : _request.headers["content-type"]});
						return (self._handleError (_request, _response, _next, _error));
					}
				} else {
					_request.pause ();
					var _error = self._buildError ("http-service", "body-content-type-undefined");
					return (self._handleError (_request, _response, _next, _error));
				}
				break;
			default :
				return (_next ());
				break;
		}
	};
	return (_wrapper);
};

_Service.prototype._handleOutcomeCallback = function (_request, _response, _next) {
	return (_.bind (this._handleOutcome, this, _request, _response, _next));
};

_Service.prototype._handleErrorCallback = function (_request, _response, _next) {
	return (_.bind (this._handleError, this, _request, _response, _next));
};

_Service.prototype._handleOutcome = function (_request, _response, _next, _outcome) {
	_response.writeHead (200, "ok", {"content-type" : "application/json"});
	_response.write (JSON.stringify (_outcome));
	_response.end ();
};

_Service.prototype._handleError = function (_request, _response, _next, _error) {
	_response.writeHead (400, "error", {"content-type" : "application/json"});
	_response.write (JSON.stringify ({
		error : _error.type + ":" + _error.reason,
		message : _error.message,
	}));
	_response.end ();
};

// ---------------------------------------
