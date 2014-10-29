
// http://docs.amazonwebservices.com/general/latest/gr/signature-version-4.html

function _queryAuthenticate4 (_credential, _inputs, _onSuccess, _onError) {
	
	transcript.traceDebuggingObject ("authenticating query...", _inputs);
	
	var _accessKey = _credential["access-key"];
	var _secretKey = _credential["secret-key"];
	
	var _timestamp = _inputs.timestamp;
	var _region = _inputs.region;
	var _service = _inputs.service;
	var _request = _inputs.request;
	
	var _termination = "aws4_request";
	var _date = new Date (_timestamp);
	
	var _date1 = printf ("%04d%02d%02dT%02d%02d%02dZ",
			_date.getUTCFullYear (), _date.getUTCMonth () + 1, _date.getUTCDate (),
			_date.getUTCHours (), _date.getUTCMinutes (), _date.getUTCSeconds ());
	var _date2 = printf ("%04d%02d%02d",
			_date.getUTCFullYear (), _date.getUTCMonth () + 1, _date.getUTCDate ());
	
	var _credentialScope = [_date2, _region, _service, _termination].join ("/");
	var _credential = [_accessKey, _credentialScope].join ("/");
	
	var _target = [
			"AWS4-HMAC-SHA256",
			_date1,
			_credentialScope,
			_request,
	].join ("\n");
	
	var _signedDate = crypto.hmac ("sha256", "AWS4" + _secretKey, _date2, "binary", "binary");
	var _signedRegion = crypto.hmac ("sha256", _signedDate, _region, "binary", "binary");
	var _signedService = crypto.hmac ("sha256", _signedRegion, _service, "binary", "binary");
	var _signatureKey = crypto.hmac ("sha256", _signedService, _termination, "binary", "binary");
	
	var _signature = crypto.hmac ("sha256", _signatureKey, _target, "binary", "hex");
	
	var _outcome = {
		credential : _credential,
		signature : _signature,
	};
	
	_onSuccess (_outcome);
}

module.operations.register ({
		identifier : "query-authenticate-v4",
		execute : _queryAuthenticate4,
});
