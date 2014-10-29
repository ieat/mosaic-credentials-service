
// http://docs.rackspace.com/servers/api/v1.0/cs-devguide/content/Authentication-d1e506.html
// http://docs.rackspace.com/auth/api/v1.1/auth-client-devguide/content/Authenticate-d1e171.html

/*
credential ::= {
	"location" : "us" | "uk",
	// to be used as the `X-Auth-User` header value
	"user" : <string>,
	// to be used as the `X-Auth-Key` header value
	"key" : <string>,
}

inputs ::= {
	none??
}

outputs ::= {
	// to be used as the `X-Auth-User` header value (if needed)
	"credential" : <username:string>,
	// to be used as the `X-Auth-Token' header value
	"token" : <string>,
	"lease" : <seconds:integer>,
	"endpoints" : {
		// the contents of the `X-Server-Management-Url', `X-Storage-Url`, `X-CDN-Management-Url` headers
		// to be used to access the services
		<identifier:string> : <url>,
	}
}
*/
