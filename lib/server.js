const http = require("http");
const https = require("https");
const fs = require("fs");
const url = require("url");
const path = require("path");
const util = require("util");
const StringDecoder = require("string_decoder").StringDecoder;
const config = require("./config");
const handlers = require("./handlers");
const helpers = require("./helpers");
const debug = util.debuglog("server");
const server = {
	processHandlerResponse: function(response, method, trimmedPath, statusCode, payload, contentType, headers){
		contentType = typeof(contentType) == "string" ? contentType : "json";
		statusCode = typeof(statusCode) == "number" ? statusCode : 200;
		headers = typeof(headers) == "object" && headers instanceof Array && headers.length > 0 ? headers : [];
		response.setHeader("Access-Control-Allow-Origin", "*");
		for(let i = 0; i < headers.length; i++){
			response.setHeader(headers[i].name, headers[i].value);
		}
		let payloadString = '';
		if(contentType == "json"){
			response.setHeader("Content-Type","application/json");
			payload = typeof(payload) == "object" ? payload : {};
			payloadString = JSON.stringify(payload);
		}
		if(contentType == "html"){
			response.setHeader("Content-Type","text/html");
			payloadString = typeof(payload) == "string" ? payload : '';
		}
		if(contentType == "favicon"){
			response.setHeader("Content-Type","image/x-icon");
			payloadString = typeof(payload) !== "undefined" ? payload : '';
		}
		if(contentType == "javascript"){
			response.setHeader("Content-Type","text/javascript");
			payloadString = typeof(payload) !== "undefined" ? payload : '';
		}
		if(contentType == "css"){
			response.setHeader("Content-Type","text/css");
			payloadString = typeof(payload) !== "undefined" ? payload : '';
		}
		if(contentType == "png"){
			response.setHeader("Content-Type","image/png");
			payloadString = typeof(payload) !== "undefined" ? payload : '';
		}
		if(contentType == "jpg"){
			response.setHeader("Content-Type","image/jpeg");
			payloadString = typeof(payload) !== "undefined" ? payload : '';
		}
		if(contentType == "plain"){
			response.setHeader("Content-Type","text/plain");
			payloadString = typeof(payload) !== "undefined"? payload : '';
		}
		response.writeHead(statusCode);
		response.end(payloadString);
		if(statusCode = 200){
			debug("\x1b[32m%s\x1b[0m", method.toUpperCase() + " /" + trimmedPath + ' ' + statusCode);
		}
		else {
			debug("\x1b[31m%s\x1b[0m", method.toUpperCase() + " /" + trimmedPath + ' ' + statusCode);
		}
	},
	httpsServerOptions: {
		"key": fs.readFileSync(path.join(__dirname, "/../https/key.pem")),
		"cert": fs.readFileSync(path.join(__dirname, "/../https/cert.pem"))
	},
	router: {
			"ingredients": handlers.ingredients,
			"orders": handlers.orders,
			"auth": handlers.auth
	}
};
server.unifiedServer = function(request, response){
	const parsedURL = url.parse(request.url, true);
	const path = parsedURL.pathname;
	const trimmedPath = path.replace(/^\/+|\/+$/g,"");
	const queryStringObject = parsedURL.query;
	const method = request.method.toLowerCase();
	const headers = request.headers;
	const decoder = new StringDecoder("utf-8");
	let buffer = "";
	request.on("data", function(data){
		buffer += decoder.write(data);
	});
	request.on("end",function(){
		buffer += decoder.end();
		let chosenHandler = typeof(server.router[trimmedPath]) !== "undefined" ?
				server.router[trimmedPath] : handlers.notFound;
		chosenHandler = trimmedPath.indexOf("public/") > -1 ? handlers.public : chosenHandler;
		const data = {
			"trimmedPath": trimmedPath,
			"queryStringObject": queryStringObject,
			"method": method,
			"headers": headers,
			"payload": helpers.parseJSONToObject(buffer)
		};
		try {
			chosenHandler(data, function(statusCode, payload, contentType, headers){
				server.processHandlerResponse(response, method, trimmedPath, statusCode, payload, contentType, headers);
			});
		}
		catch(e){
			debug(e);
			server.processHandlerResponse(response, method, trimmedPath, 500, {"Error": "An unknown error has occured"}, "json");
		}
	});
};
server.httpServer = http.createServer(server.unifiedServer),
server.httpsServer = https.createServer(server.httpsServerOptions,server.unifiedServer),
server.init = function(){
	server.httpServer.listen(config.httpPort, function(){
		console.log("\x1b[36m%s\x1b[0m","The server is listening on port " + config.httpPort);
	});
	server.httpsServer.listen(config.httpsPort, function(){
		console.log("\x1b[35m%s\x1b[0m","The server is listening on port " + config.httpsPort);
	});
}
module.exports = server;