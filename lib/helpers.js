const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const querystring = require("querystring");
const https = require("https");
const mysql = require("mysql");
const jwt = require("jsonwebtoken");
const config = require("./config");
const helpers = {
	hash: function(string) {
		if(typeof(string) == "string" && string.length > 0) {
			const hash = crypto.createHmac("sha256", config.hashingSecret).update(string).digest("hex");
			return hash;
		}
		else {
			return false;
		}
	},
	parseJSONToObject: function(string) {
		try{
			const object = JSON.parse(string);
			return object;
		}
		catch(e) {
			return {};
		}
	},
	createRandomString: function(length){
		length = typeof(length) == "number" && length > 0 ? length : false;
		if(length){
			const possibleCharacters = "abcdefghijklmnopqrstuvwxyz0123456789";
			let str = "";
			for(let i = 1; i <= length; i++){
				const randomCharacter = possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
				str += randomCharacter;
			}
			return str;
		}
		else {
			return false;
		}
	},
	getTemplate: function(templateName, data, callback) {
		templateName = typeof(templateName) == "string" && templateName.length > 0 ? templateName : false;
		data = typeof(data) == "object" && data !== null ? data : {};
		if(templateName){
			const templatesDir = path.join(__dirname, "/../templates/");
			fs.readFile(templatesDir + templateName+".html", "utf8", function(error, string){
				if(!error && string && string.length){
					const finalString = helpers.interpolate(string, data);
					callback(false, finalString);
				}
				else {
					callback("No template could be found");
				}
			});
		}
		else {
			callback("A valid template name was not specified");
		}
	},
	addUniversalTemplates: function(string, data, callback) {
		string = typeof(string) == "string" && string.length > 0 ? string : '';
		data = typeof(data) == "object" && data !== null ? data : {};
		helpers.getTemplate("_header", data, function(error, headerString){
			if(!error && headerString){
				helpers.getTemplate("_footer", data, function(error, footerString){
					if(!error && footerString){
						const fullString = headerString + string + footerString;
						callback(false, fullString);
					}
					else {
						callback("Could not find the footer template");
					}
				});
			}
			else {
				callback("Could not find the header template");
			}
		});
	},
	interpolate: function(string, data) {
		string = typeof(string) == "string" && string.length > 0 ? string : '';
		data = typeof(data) == "object" && data !== null ? data : {};
		for(let keyName in config.templateGlobals){
			if(config.templateGlobals.hasOwnProperty(keyName)){
				data["global." + keyName] = config.templateGlobals[keyName];
			}
		}
		for(let key in data){
			if(data.hasOwnProperty(key) && typeof(data[key]) == "string"){
				const replace = data[key];
				const find = "{" + key + "}";
				string = string.replace(find, replace);
			}
		}
		return string;
	},
	getStaticAsset: function(fileName, callback) {
		fileName = typeof(fileName) == "string" && fileName.length > 0 ? fileName : false;
		if(fileName){
			const publicDir = path.join(__dirname, "/../public/");
			fs.readFile(publicDir + fileName, function(error, data){
				if(!error && data){
					callback(false, data);
				}
				else {
					callback("No file could be found");
				}
			});
		}
		else {
			callback("A valid file name was not specified");
		}
	},
	generateToken: function(userData) {
		const databaseConnection = mysql.createConnection(config.mysql);
		const tokenQuery = "SELECT signature, expiration FROM settings";
		const promise = new Promise(function(resolve, reject){
			databaseConnection.connect(function(error){
				if(!error){
					databaseConnection.query(tokenQuery, function(error, results, fields){
						const data = {
							id: userData.id,
							email: userData.email
						};
						const signature = results[0].signature;
						const expiration = results[0].expiration;
						const token = jwt.sign(data, signature, {expiresIn: expiration});
						resolve({token: token, expiresIn: expiration});
					});
				}
				else {
					reject(error);
				}
			});
		});
		return promise;
	},
	verifyToken: function(token) {
		const promise = new Promise(function(resolve, reject){
			const databaseConnection = mysql.createConnection(config.mysql);
			const tokenQuery = "SELECT signature FROM settings";
			databaseConnection.connect(function(error){
				if(!error){
					databaseConnection.query(tokenQuery, function(error, results, fields){
						const signature = results[0].signature;
						jwt.verify(token, signature, function(error, tokenData) {
							if(error) {
								reject(error);
							}
							else {
								resolve(tokenData);
							}
						});
					});
				}
			});
		});
		return promise;
	}
};
module.exports = helpers;