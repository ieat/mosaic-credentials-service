// ---------------------------------------

if (require.main === module)
	throw (new Error ());

// ---------------------------------------

var fs = require ("fs");
var printf = require ("printf");

// ---------------------------------------

module.exports = function (_module) {
	fs.watchFile (_module.filename, function () {
		process.stderr.write (printf ("[%5d][%-16s][ee] module source file `%s` was modified; aborting!\n", process.pid, "reloader.js", _module.filename));
		process.stderr.write (printf ("[%5d][%-16s][--] ----------------------------------------\n", process.pid, ""));
		process.exit (2);
	});
}

module.exports (module);

// ---------------------------------------
