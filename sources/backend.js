// ---------------------------------------

if (require.main === module)
	throw (new Error ());
require ("./reloader") (module);

// ---------------------------------------

var _ = require ("underscore");
var fs = require ("fs");
var vm = require ("vm");

var configuration = require ("./configuration");
var transcript = require ("./transcript") (module, configuration.libTranscriptLevel);
var tools = require ("./tools");

// ---------------------------------------

var _Backend = tools.EventEmitterClass ();

_Backend.prototype._buildError = tools.thisBuildError;
_Backend.prototype._throwError = tools.thisThrowError;
_Backend.prototype._emitError = tools.thisEmitError;
_Backend.prototype._emitReady = tools.thisEmitReady;

// ---------------------------------------

_Backend.prototype._initialize = function () {
	this.transcript = transcript;
	this.transcript.traceInformation ("initializing the backend...");
	this._modules = {}
	this._credentials = {}
	this._emitReady ();
};

function _initialize () {
	var _backend = new _Backend ();
	_backend._initialize ();
	return (_backend);
}

module.exports.initialize = _initialize;

// ---------------------------------------

_Backend.prototype.modulesList = function (_onSuccess, _onError) {
	this.transcript.traceDebugging ("listing modules...");
	var _outputs = _.keys (this._modules);
	_onSuccess (_outputs);
};

// ---------------------------------------

_Backend.prototype.moduleDescribe = function (_moduleIdentifier, _onSuccess, _onError) {
	this.transcript.traceDebugging ("describing module `%s`...", _moduleIdentifier);
	if (!_.has (this._modules, _moduleIdentifier)) {
		_onError (this._buildError ("backend", "module-undefined", null, {x_module : _moduleIdentifier}));
		return;
	}
	var _outputs = true;
	_onSuccess (_outputs);
};

// ---------------------------------------

_Backend.prototype.moduleCreateFromFile = function (_identifier, _path, _onSuccess, _onError) {
	this.transcript.traceDebugging ("creating the module `%s` from file `%s`...", _identifier, _path);
	this.transcript.traceDebugging ("opening the file...");
	try {
		var _stream = fs.createReadStream (_path);
	} catch (_exception) {
		this.transcript.traceWarning ("creating the module `%s` failed (opening the file `%s`)!", _identifier, _path);
		_onError (this._buildError ("backend", "module-definition-stream-error", _error, {x_path : _path}));
		return;
	}
	this.moduleCreateFromStream (_identifier, _stream, _onSuccess, _onError);
};

_Backend.prototype.moduleCreateFromUrl = function (_identifier, _url, _onSuccess, _onError) {
	this.transcript.traceDebugging ("creating the module `%s` from URL `%s`...", _identifier, _url);
	_onError (this._buildError ("unsupported-operation"));
};

_Backend.prototype.moduleCreateFromStream = function (_identifier, _stream, _onSuccess, _onError) {
	var self = this;
	var _chunks = [];
	var _size = 0;
	_stream.on ("data", function (_chunk) {
		_chunks.push (_chunk);
		_size += _chunk.length;
		if (_size > 1024 * 1024) {
			_stream.pause ();
			_onError (self._buildError ("backend", "module-definition-stream-overflow", null, {x_size : _size}));
		}
	});
	_stream.on ("end", function () {
		var _data = _chunks.join ("")
		self.moduleCreateFromData (_identifier, _data, _onSuccess, _onError);
	});
	_stream.on ("error", function (_error) {
		_onError (self._buildError ("backend", "module-definition-stream-error", _error, {x_size : _size}));
	});
};

_Backend.prototype.moduleCreateFromData = function (_identifier, _data, _onSuccess, _onError) {
	this.transcript.traceDebugging ("initializing the module `%s`...", _identifier);
	if (_.has (this._modules, _identifier)) {
		_onError (this._buildError ("backend", "module-exists", null, {x_module : _identifier}));
		return;
	}
	this.transcript.traceDebugging ("compiling the script...");
	try {
		var _script = vm.createScript (_data, _identifier + ".js");
	} catch (_exception) {
		this.transcript.traceWarning ("initializing the module `%s` failed (compiling the script)!", _identifier);
		_onError (this._buildError ("backend", "module-definition-invalid", _exception));
		return;
	}
	this.transcript.traceDebugging ("preparing the script...");
	var _module = this.modulePrepare (_identifier, _script);
	this.transcript.traceDebugging ("executing the script...");
	try {
		_script.runInNewContext (_module.globals);
	} catch (_exception) {
		this.transcript.traceWarning ("initializing the module `%s` failed (executing the script)!", _identifier);
		_onError (this._buildError ("backend", "module-execution-failed", _exception));
	}
	this._modules[_identifier] = _module;
	_onSuccess (true);
};

_Backend.prototype.modulePrepare = function (_identifier, _script) {
	var self = this;
	var _operations = {};
	var _globals = {};
	var _module = {
			identifier : _identifier,
			script : _script,
			globals : _globals,
			operations : _operations,
	};
	_globals.module = {};
	_globals.module.identifier = _identifier;
	_globals.module.operations = {};
	_globals.module.operations.register = function (_descriptor) {
		var _operation = {
				identifier : _descriptor.identifier,
				execute : _descriptor.execute,
		};
		_operations[_operation.identifier] = _operation;
	};
	_globals.transcript = require ("./transcript") ("module/" + _identifier + ".js", configuration.libTranscriptLevel);
	_globals.crypto = require ("./crypto");
	_globals.printf = require ("printf");
	return (_module);
};

// ---------------------------------------

_Backend.prototype.operationsList = function (_moduleIdentifier, _onSuccess, _onError) {
	this.transcript.traceDebugging ("listing module `%s` operations...", _moduleIdentifier);
	if (!_.has (this._modules, _moduleIdentifier)) {
		_onError (this._buildError ("backend", "module-undefined", null, {x_module : _moduleIdentifier}));
		return;
	}
	var _module = this._modules[_moduleIdentifier];
	var _outputs = _.keys (_module.operations);
	_onSuccess (_outputs);
};

// ---------------------------------------

_Backend.prototype.operationDescribe = function (_moduleIdentifier, _operationIdentifier, _inputs, _onSuccess, _onError) {
	var self = this;
	self.transcript.traceDebugging ("executing module `%s` operation `%s`...", _moduleIdentifier, _operationIdentifier);
	if (!_.has (this._modules, _moduleIdentifier)) {
		_onError (this._buildError ("backend", "module-undefined", null, {x_module : _moduleIdentifier}));
		return;
	}
	var _module = self._modules[_moduleIdentifier];
	if (!_.has (_module.operations, _operationIdentifier)) {
		_onError (this._buildError ("backend", "module-operation-undefined", null, {x_module : _moduleIdentifier, x_operation : _operationIdentifier}));
		return;
	}
	var _outputs = true;
	_onSuccess (_outputs);
}

// ---------------------------------------

_Backend.prototype.operationExecute = function (_moduleIdentifier, _operationIdentifier, _credentialIdentifier, _inputs, _onSuccess, _onError) {
	var self = this;
	self.transcript.traceDebugging ("executing module `%s` operation `%s` for credential `%s`...", _moduleIdentifier, _operationIdentifier, _credentialIdentifier);
	if (!_.has (this._credentials, _credentialIdentifier)) {
		_onError (this._buildError ("backend", "credential-undefined", null, {x_credential : _credentialIdentifier}));
		return;
	}
	var _credential = this._credentials[_credentialIdentifier];
	if (!_.has (this._modules, _moduleIdentifier)) {
		_onError (this._buildError ("backend", "module-undefined", null, {x_module : _moduleIdentifier}));
		return;
	}
	var _module = self._modules[_moduleIdentifier];
	if (!_.has (_module.operations, _operationIdentifier)) {
		_onError (this._buildError ("backend", "module-operation-undefined", null, {x_module : _moduleIdentifier, x_operation : _operationIdentifier}));
		return;
	}
	var _operation = _module.operations[_operationIdentifier];
	try {
		_operation.execute (_credential, _inputs,
				function (_outputs) {
					_onSuccess (_outputs);
				},
				function (_type, _reason, _message) {
					_onError (self._buildError ("backend", "module-operation-execution-failed", null, {x_type : _type, x_reason : _reason, x_message : _message}));
				});
	} catch (_exception) {
		self.transcript.traceWarningObject ("executing module `%s` operation `%s` failed (exception)!", _moduleIdentifier, _operationIdentifier, _exception.stack);
		_onError (self._buildError ("backend", "module-operation-execution-failed", _exception, {x_module : _moduleIdentifier, x_operation : _operationIdentifier}));
		return;
	}
};

// ---------------------------------------

_Backend.prototype.credentialsList = function (_onSuccess, _onError) {
	this.transcript.traceDebugging ("listing credentials...");
	var _outputs = _.keys (this._credentials);
	_onSuccess (_outputs);
}

// ---------------------------------------

_Backend.prototype.credentialExport = function (_credentialIdentifier, _onSuccess, _onError) {
	this.transcript.traceDebugging ("exporting credential `%s` data...", _credentialIdentifier);
	if (!_.has (this._credentials, _credentialIdentifier)) {
		_onError (this._buildError ("backend", "credential-undefined", null, {x_credential : _credentialIdentifier}));
		return;
	}
	var _credential = this._credentials[_credentialIdentifier];
	var _outputs = _credential;
	_onSuccess (_outputs);
}

// ---------------------------------------

_Backend.prototype.credentialImport = function (_credentialIdentifier, _credentialData, _onSuccess, _onError) {
	this.transcript.traceDebugging ("importing credential `%s` data...", _credentialIdentifier);
	if (_.has (this._credentials, _credentialIdentifier)) {
		_onError (this._buildError ("backend", "credential-exists", null, {x_credential : _credentialIdentifier}));
		return;
	}
	this._credentials[_credentialIdentifier] = _credentialData;
	_onSuccess (true);
}

// ---------------------------------------
