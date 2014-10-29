// ---------------------------------------

if (require.main === module)
	throw (new Error ());
require ("./reloader") (module);

// ---------------------------------------

var _ = require ("underscore");
var crypto = require ("crypto");

var configuration = require ("./configuration");
var transcript = require ("./transcript") (module, configuration.libTranscriptLevel);
var tools = require ("./tools");

// ---------------------------------------

function _hmac (_algorithm, _key, _data, _data_encoding, _hmac_encoding) {
	var _engine = crypto.createHmac (_algorithm, _key);
	_engine.update (_data, _data_encoding);
	return (_engine.digest (_hmac_encoding));
}

module.exports.hmac = _hmac;

// ---------------------------------------
