const https = require("https");
const http = require("http");
const url = require("url");
const util = require("util");
const _data = require("./data");
const helpers = require("./helpers");
const _logs = require("./logs");
const debug = util.debuglog("workers");
const workers = {
	log: function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck){
		const logData = {
			"check": originalCheckData,
			"outcome": checkOutcome,
			"state": state,
			"alert": alertWarranted,
			"time": timeOfCheck
		};
		const logString = JSON.stringify(logData);
		const logFileName = originalCheckData.id;
		_logs.append(logFileName, logString, function(error){
			if(!error){
				debug("Logging to file succeeded");
			}
			else {
				debug("Logging to file failed");
			}
		});
	},
	alertUserToStatusChange: function(newCheckData){
		const message = "Alert: Your check for " + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + "://" + newCheckData.url + " is currently " + newCheckData.state;
		helpers.sendTwilioSms(newCheckData.userPhone, message, function(error){
			if(!error){
				debug("Success: User was alerted to a status change in their check, via sms");
			}
			else {
				debug("Error: Could not send sms alert to user who had a state change in their check");
			}
		});
	},
	processCheckOutcome: function(originalCheckData, checkOutcome){
		const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responceCode) > -1 ? "up" : "down";
		const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;
		const timeOfCheck = Date.now();
		this.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);
		const newCheckData = originalCheckData;
		newCheckData. state = state;
		newCheckData.lastChecked = timeOfCheck;
		workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);
		_data.update("checks", newCheckData.id, newCheckData, function(error){
			if(!error){
				if(alertWarranted){
					this.alertUserToStatusChange(newCheckData);
				}
				else {
					debug("Check outcome has not changed, no alert needed");
				}
			}
			else {
				debug("Error trying to save updates to one of the checks");
			}
		});
	},
	preformCheck: function(originalCheckData){
		const checkOutcome = {
			"error": false,
			"responceCode": false
		};
		let outcomeSent = false;
		const parsedUrl = url.parse(originalCheckData.protocol + "://" + originalCheckData.url);
		const hostName = parsedUrl.hostname;
		const path = parsedUrl.path;
		const requestDetails = {
			"protocol": originalCheckData.protocol + ":",
			"hostname": hostName,
			"method": originalCheckData.method.toUpperCase(),
			"path": path,
			"timeout": originalCheckData.timeoutSeconds * 1000
		};
		const _moduleToUse = originalCheckData.protocol == "http" ? http : https;
		const request = _moduleToUse.request(requestDetails, function(response){
			const status = response.statusCode;
			checkOutcome.responseCode = status;
			if(!outcomeSent){
				workers.processCheckOutcome(originalCheckData, checkOutcome);
				outcomeSent = true;
			}
		});
		request.on("error", function(e){
			checkOutcome.error = {
				"error": true,
				"value": e
			};
			if(!outcomeSent){
				workers.processCheckOutcome(originalCheckData, checkOutcome);
				outcomeSent = true;
			}
		});
		request.on("timeout", function(e){
			checkOutcome.error = {
				"error": true,
				"value": "timeout"
			};
			if(!outcomeSent){
				workers.processCheckOutcome(originalCheckData, checkOutCome);
				outcomeSent = true;
			}
		});
		request.end();
	},
	validateCheckData: function(originalCheckData){
		originalCheckData = typeof(originalCheckData) == "object" && originalCheckData !== null ? originalCheckData : {};
		originalCheckData.id = typeof(originalCheckData.id) == "string" && originalCheckData.id.trim().length == 20 ? originalCheckData.id.trim() : false;
		originalCheckData.userPhone = typeof(originalCheckData.userPhone) == "string" && originalCheckData.userPhone.trim().length == 10 ? originalCheckData.userPhone.trim() : false;
		originalCheckData.protocol = typeof(originalCheckData.protocol) == "string" && ["http", "https"].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false;
		originalCheckData.url = typeof(originalCheckData.url) == "string" && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false;
		originalCheckData.method = typeof(originalCheckData.method) == "string" && ["post", "get", "put", "delete"].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false;
		originalCheckData.successCodes = typeof(originalCheckData.successCodes) == "object" && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
		originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) == "number" && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds >= 1 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;
		originalCheckData.state = typeof(originalCheckData.state) == "string" && ["up", "down"].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : "down";
		originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) == "number" && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;
		if(originalCheckData.id &&
			originalCheckData.userPhone &&
			originalCheckData.protocol && 
			originalCheckData.url &&
			originalCheckData.method &&
			originalCheckData.successCodes &&
			originalCheckData.timeoutSeconds){
				workers.preformCheck(originalCheckData);
		}
		else {
			debug("Error: One of the checks is not properly formatted. Skipping it.");
		}
	},
	gatherAllChecks: function(){
		_data.list("checks", function(error, checks){
			if(!error && checks && checks.length > 0){
				checks.forEach(function(check){
					_data.read("checks", check, function(error, originalCheckData){
						if(!error && originalCheckData){
							workers.validateCheckData(originalCheckData);
						}
					});
				});
			}
			else {
				console.log("Error: Could not find any checks to process");
			}
		});
	},
	log: function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck){
		const logData = {
			"check": originalCheckData,
			"outcome": checkOutcome,
			"state": state,
			"alert": alertWarranted,
			"time": timeOfCheck
		};
		const logString = JSON.stringify(logData);
		const logFileName = originalCheckData.id;
		_logs.append(logFileName, logString, function(error){
			if(!error){
				debug("Logging to file succeeded");
			}
			else {
				debug("Logging to file failed");
			}
		});
	},
	rotateLogs: function(){
		_logs.list(false, function(error, logs){
			if(!error && logs && logs.length > 0){
				logs.forEach(function(logName){
					const logId = logName.replace(".log", '');
					const newFileId = logId + '-' + Date.now();
					_logs.compress(logId, newFileId, function(error){
						if(!error){
							_logs.truncate(logId, function(error){
								if(!error){
									debug("Success truncating logFile");
								}
								else {
									debug("Error truncating logFile");
								}
							});
						}
						else {
							debug("Error compressing one of the log files", error);
						}
					});
				});
			}
			else {
				debug("Error : could not find any logs to rotate");
			}
		});
	},
	loop: function(){
		setInterval(function(){
			workers.gatherAllChecks();
		}, 1000 * 60);
	},
	logRotationLoop: function(){
		setInterval(function(){
			workers.rotateLogs();
		}, 1000 * 60 * 60 * 24);
	},
	init: function(){
		console.log("\x1b[33m%s\x1b[0m","Background workers are running");
		workers.gatherAllChecks();
		workers.loop();
		workers.rotateLogs();
		workers.logRotationLoop();
	}
};
module.exports = workers;