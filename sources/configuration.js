// ---------------------------------------

if (require.main === module)
	throw (new Error ());
require ("./reloader") (module);

// ---------------------------------------

var _defaultTranscriptLevel = "debugging";

// ---------------------------------------

var fs = require ("fs");
var path = require ("path");

var transcript = require ("./transcript") (module, _defaultTranscriptLevel);

// ---------------------------------------

var _configuration = null;

function _configurationLoad () {
	
	transcript.traceDebugging ("loading configuration file...");
	
	var _configurationPath = process.env["mosaic_service_configuration"];
	if (_configurationPath === undefined) {
		transcript.traceWarning ("undefined configuration file (i.e. undefined environment variable `mosaic_service_configuration`); ignoring!");
		_configuration = {};
		return;
	}
	
	if (! path.existsSync (_configurationPath)) {
		transcript.traceError ("non-existent configuration file `%s`; aborting!", _configurationPath);
		_abort ();
	}
	
	try {
		_configuration = fs.readFileSync (_configurationPath, 'utf8');
	} catch (_error) {
		transcript.traceError ("error encountered while reading configuration file `%s`: `%s`; aborting!", _configurationPath, _error.toString ());
		_abort ();
	}
	
	try {
		_configuration = JSON.parse (_configuration);
	} catch (_error) {
		transcript.traceError ("error encountered while parsing configuration file `%s`: `%s`; aborting!", _configurationPath, _error.toString ());
		_abort ();
	}
	
	transcript.traceDebuggingObject ("loaded configuration file `%s`;", _configuration);
}

function _configurationExport () {
	
	module.exports.mainTranscriptLevel = _configurationGet ("logging.level.main", _defaultTranscriptLevel);
	module.exports.libTranscriptLevel = _configurationGet ("logging.level.lib", _defaultTranscriptLevel);
	
	module.exports.serviceHost = _configurationGet ("service.endpoint.host", "127.0.0.1");
	module.exports.servicePort = _configurationGet ("service.endpoint.port", 60606);
}

function _configurationGet (_key, _default) {
	if (_configuration[_key] === undefined) {
		if (_default !== undefined) {
			transcript.traceWarning ("initializing configuration key `%s` with default value `%s`...", _key, _default);
			_configuration[_key] = _default;
		} else {
			transcript.traceError ("undefined configuration key `%s`; aborting!", _key);
			_abort ();
		}
	}
	return (_configuration[_key]);
}

function _abort () {
	process.exit (1);
	throw (new Error ());
}

// ---------------------------------------

_configurationLoad ();
_configurationExport ();

// ---------------------------------------
