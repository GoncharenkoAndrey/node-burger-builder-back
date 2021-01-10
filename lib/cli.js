/*
* CLI - Related Tasks
*
*/
//Dependencies
const readline = require("readline");
const events = require("events");
const os = require("os");
const v8 = require("v8");
const childProcess = require("child_process");
const _data = require("./data");
const _logs = require("./logs");
const helpers = require("./helpers");
class _events extends events {};
const e = new _events();
//Input handlers
e.on("man", function(string){
	cli.responders.help();
});
e.on("help", function(string){
	cli.responders.help();
});
e.on("exit", function(string){
	cli.responders.exit();
});
e.on("stats", function(string){
	cli.responders.stats();
});
e.on("list users", function(string){
	cli.responders.listUsers();
});
e.on("more user info", function(string){
	cli.responders.moreUserInfo(string);
});
e.on("list checks", function(string){
	cli.responders.listChecks(string);
});
e.on("more check info", function(string){
	cli.responders.moreCheckInfo(string);
});
e.on("list logs", function(string){
	cli.responders.listLogs();
});
e.on("more log info", function(string){
	cli.responders.moreLogInfo(string);
});
// Instantiate the CLI module object
const cli = {
	verticalSpace: function(lines){
		lines = typeof(lines) == "number" && lines > 0 ? lines : 1;
		for (let i = 0; i < lines; i++){
			console.log('');
		}
	},
	horizontalLine: function(){
		// Get the available screen size
		const width = process.stdout.columns;
		let line = '';
		for(let i = 0; i < width; i++){
			line += '-';
		}
		console.log(line);
	},
	centered: function(string){
		string = typeof(string) == "string" && string.trim().length > 0 ? string.trim() : '';
		// Get the available screen size
		const width = process.stdout.columns;
		const leftPadding = Math.floor((width - string.length) / 2);
		let line = '';
		for(let i = 0; i < leftPadding; i++){
			line += ' ';
		}
		line += string;
		console.log(line);
	},
	responders: {
		help: function(){
			const commands = {
				"man": "Show this help page",
				"help": "Alias of the \"man\" command",
				"exit": "Kill the CLI (and the rest of the application)",
				"stats": "Get statistics on the underlying operating system and resource utilization",
				"list users": "Show a list of all the registered (undeleted) users in the system",
				"more user info --{userId}": "Show details of a specific user",
				"list checks --up --down": "Show a list of all the active checks in the system, including their state. The \"--up\" and the \"--down\" flags are both optional",
				"more check info --{checkId}": "Show details of a specified check",
				"list logs": "Show list of all the log files available to be read (compressed only)",
				"more log info --{fileName}": "Show details of a specified log file"
			};
			// Show a header for the help page that is as wide as the screen
			cli.horizontalLine();
			cli.centered("CLI MANUAL");
			cli.horizontalLine();
			cli.verticalSpace(2);
			// Show each command, followed by its explanation, in white and yellow respectively
			for(let key in commands){
				const value = commands[key];
				let line = "\x1b[33m" + key + "\x1b[0m";
				const padding = 60 - line.length;
				for(let i = 0; i < padding; i++){
					line += ' ';
				}
				line += value;
				console.log(line);
				cli.verticalSpace(1);
			}
			cli.verticalSpace(1);
			cli.horizontalLine();
		},
		exit: function(){
			process.exit(0);
		},
		stats: function(){
			const stats = {
				"Load Average": os.loadavg().join(' '),
				"CPU Count": os.cpus().length,
				"Free Memory": os.freemem(),
				"Current Malloced Memory": v8.getHeapStatistics().malloced_memory,
				"Peak Malloced Memory": v8.getHeapStatistics().peak_malloced_memory,
				"Allocated Heap Used (%)": Math.round((v8.getHeapStatistics().used_heap_size / v8.getHeapStatistics().total_heap_size) * 100),
				"Available Heap Allocated (%)": Math.round((v8.getHeapStatistics().total_heap_size / v8.getHeapStatistics().heap_size_limit) * 100),
				"Uptime": os.uptime() + " Seconds"
			};
			// Crearte a header for the stats
			cli.horizontalLine();
			cli.centered("SYSTEM STATISTICS");
			cli.horizontalLine();
			cli.verticalSpace(2);
			for(let key in stats){
				const value = stats[key];
				let line = "\x1b[33m" + key + "\x1b[0m";
				const padding = 60 - line.length;
				for(let i = 0; i < padding; i++){
					line += ' ';
				}
				line += value;
				console.log(line);
				cli.verticalSpace(1);
			}
			cli.verticalSpace(1);
			cli.horizontalLine();
		},
		listUsers: function(){
			_data.list("users", function(error, userIds){
				if(!error && userIds && userIds.length > 0){
					cli.verticalSpace();
					userIds.forEach(function(userId){
						_data.read("users", userId, function(error, userData){
							if(!error && userData){
								let line = "Name: " + userData.firstName + ' ' + userData.lastName + " Phone: " + userData.phone + " Checks";
								const numberOfChecks = typeof(userData.checks) == "object" && userData.checks instanceof Array && userData.checks.length > 0 ? userData.checks.length : 0;
								line += numberOfChecks;
								console.log(line);
								cli.verticalSpace();
							}
						});
					});
				}
			});
		},
		moreUserInfo: function(string){
			const array = string.split("--");
			const userId = typeof(array[1]) == "string" && array[1].trim().length > 0 ? array[1].trim() : false;
			if(userId){
				_data.read("users", userId, function(error, userData){
					if(!error && userData){
						delete userData.hashedPassword;
						cli.verticalSpace();
						console.dir(userData, {"colors": true});
						cli.verticalSpace();
					}
				});
			}
		},
		listChecks: function(string){
			_data.list("checks", function(error, checkIds){
				if(!error && checkIds && checkIds.length > 0){
					cli.verticalSpace();
					checkIds.forEach(function(checkId){
						_data.read("checks", checkId, function(error, checkData){
							const lowerString = string.toLowerCase();
							const state = typeof(checkData.state) == "string" ? checkData.state : "down";
							const stateOrUnknown = typeof(checkData.state) == "string" ? checkData.state : "unknown";
							if(lowerString.indexOf("--"+state) || (lowerString.indexOf("--down") == -1 && lowerString.indexOf("--up") == -1)){
								const line = "ID " + checkData.id + ' ' + checkData.method.toUpperCase() + ' ' + checkData.protocol + "://" + checkData.url + " State: " + stateOrUnknown;
								console.log(line);
								cli.verticalSpace();
							}
						});
					});
				}
			});
		},
		moreCheckInfo: function(string){
			const array = string.split("--");
			const checkId = typeof(array[1]) == "string" && array[1].trim().length > 0 ? array[1].trim() : false;
			if(checkId){
				_data.read("checks", checkId, function(error, checkData){
					if(!error && checkData){
						cli.verticalSpace();
						console.dir(checkData, {"colors": true});
						cli.verticalSpace();
					}
				});
			}
		},
		listLogs: function(){
			const ls = childProcess.spawn("ls", ["./.data/logs", "-h"]);
			ls.stdout.on("data", function(dataObject){
				const dataString = dataObject.toString();
				console.log(dataString);
				const logFileNames = dataString.split('\n');
				cli.verticalSpace();
				logFileNames.forEach(function(logFileName){
					if(typeof(logFileName) == "string" && logFileName.length > 0 && logFileName.indexOf('-') > -1){
						console.log(logFileName.split('.')[0]);
						cli.verticalSpace();
					}
				});
			});
		},
		moreLogInfo: function(string){
			const array = string.split("--");
			const logFileName = typeof(array[1]) == "string" && array[1].trim().length > 0 ? array[1].trim() : false;
			if(logFileName){
				cli.verticalSpace();
				_logs.decompress(logFileName, function(error, stringData){
					if(!error && stringData){
						const data = stringData.split('\n');
						data.forEach(function(jsonString){
							const logObject = helpers.parseJSONToObject(jsonString);
							if(logObject && JSON.stringify(logObject) !== "{}"){
								console.dir(logObject, {"colors": true});
								cli.verticalSpace();
							}
						});
					}
				});
			}
		}
	},
	processInput: function(string){
		string = typeof(string) == "string" && string.trim().length > 0 ? string.trim() : false;
		// Only process the input if the user actually wrote something. Otherwise ignore it.
		if(string){
			// Codify the unique strings that identify the unique questions allowed to be asked.
			const uniqueInputs = [
				"man",
				"help",
				"exit",
				"stats",
				"list users",
				"more user info",
				"list checks",
				"more check info",
				"list logs",
				"more log info"
			];
			// Go through the possible inputs, emit an event when a match is found
			let matchFound = false;
			let counter = 0;
			uniqueInputs.some(function(input){
				if(string.toLowerCase().indexOf(input) > -1){
					matchFound = true;
					// Emit an event matching the unique input, and include the full string given
					e.emit(input, string);
					return true;
				}
			});
			if(!matchFound){
				console.log("Sorry, try again");
			}
		}
	},
	// Init script
	init: function(){
		console.log("\x1b[36m%s\x1b[0m","The CLI is running");
		// Start the interface
		const _interface = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: ''
		});
		// Create an intitial prompt
		_interface.prompt();
		// Handle each line of input separately
		_interface.on("line", function(string){
			this.processInput(string);
			// Re-initialize the prompt afterwards
			_interface.prompt();
		}.bind(this));
		_interface.on("close", function(){
			process.exit(0);
		});
	}
};
module.exports = cli;