// ---------------------------------------

if (require.main !== module)
	throw (new Error ());
require ("./reloader") (module);

// ---------------------------------------

var _ = require ("underscore");
var path = require ("path");

var configuration = require ("./configuration");
var transcript = require ("./transcript") (module, configuration.mainTranscriptLevel);

var backend = require ("./backend");
var service = require ("./service");

// ---------------------------------------

function _main ()
{
	if (process.argv.length != 2) {
		transcript.traceError ("invalid arguments; aborting!");
		_abort ();
	}
	
	process.stdin.on ("data", function (_data) {
		transcript.traceError ("unexpected data received on stdin; aborting!");
		process.exit (1);
	});
	process.stdin.on ("end", function () {
		transcript.traceInformation ("input stream closed; exiting!");
		process.exit (0);
	});
	process.stdin.resume ();
	
	var _backend = backend.initialize ();
	_backend.on ("ready", function () {
		_loadTests (_backend);
	});
	_backend.on ("error", _abort);
	
	var _service = service.initialize (_backend);
	_service.on ("error", _abort);
}

function _loadTests (_backend) {
	
	var _modules = ["aws"];
	
	var _credentials = {
			"amazon" : {"access-key" : "AKIDEXAMPLE", "secret-key" : "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY"},
	};
	
	_.each (_modules, function (_identifier) {
		_loadModule (_backend, _identifier);
	});
	_.each (_credentials, function (_data, _identifier) {
		_loadCredential (_backend, _identifier, _data);
	});
}

function _loadModule (_backend, _identifier) {
	_backend.moduleCreateFromFile (_identifier, path.join (path.dirname (module.filename), "./modules/" + _identifier + ".js"),
			function (_outputs) {},
			function (_error) {
				transcript.traceErrorObject ("loading module `%s` failed...", _identifier, _error);
				_abort ();
			});
}

function _loadCredential (_backend, _identifier, _data) {
	_backend.credentialImport (_identifier, _data,
			function (_outputs) {},
			function (_error) {
				transcript.traceErrorObject ("loading credential `%s` failed...", _identifier, _error);
				_abort ();
			});
}

function _abort () {
	process.exit (1);
	throw (new Error ());
}

// ---------------------------------------

_main ();

// ---------------------------------------
