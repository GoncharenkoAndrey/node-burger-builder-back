/*
* Library for storing and rotating logs
*
*/

//Dependencies
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

//Container for the module
const lib = {
	//Base directory of the logs folder
	baseDir: path.join(__dirname,"/../.data/logs"),
	append: appendLogFile,
	list: listLogFiles,
	compress: compressLogFile,
	decompress: decompressLogFile,
	truncate: truncateLogFile
};
//Append a string to a file. Create the file if it does not exist.
function appendLogFile(file, string, callback){
	fs.open(lib.baseDir + file + ".log", 'a', function(error, fileDescriptor){
		if(!error && fileDescriptor){
			fs.appendFile(fileDescriptor, string + '\n', function(error){
				if(!error){
					fs.close(fileDescriptor, function(error){
						if(!error){
							callback(false);
						}
						else {
							callback("Error closing file that was being appended");
						}
					});
				}
				else {
					callback("Error appending to file");
				}
			});
		}
		else {
			callback("Could not open file for appending");
		}
	});
}
//List all the logs, and optionally include the compressed logs
function listLogFiles(includeCompressedLogs, callback){
	fs.readdir(lib.baseDir, function(error, data){
		if(!error && data && data.length > 0){
			const trimmedFileNames = [];
			data.forEach(function(fileName){
				// Add the .log files
				if(fileName.indexOf(".log") > -1){
					trimmedFileNames.push(fileName.replace(".log", ''));
				}
				// Add on the .gz files
				if(fileName.indexOf(".gz.b64") > -1 && includeCompressedLogs){
					trimmedFileNames.push(fileName.replace(".gz.b64", ''));
				}
			});
			callback(false, trimmedFileNames);
		}
		else {
			callback(error, data);
		}
	});
}
// Compress the contents of one .log file into a .gz.b64 file within the same directory
function compressLogFile(logId, newFileId, callback){
	const sourceFile = logId + ".log";
	const destFile = newFileId + ".gz.b64";
	// Read the source file
	fs.readFile(lib.baseDir + sourceFile, "utf8", function(error, inputString){
		if(!error && inputString){
			// Compress the data using gzip
			zlib.gzip(inputString, function(error, buffer){
				if(!error && buffer){
					// Send the data to the destination file
					fs.open(lib.baseDir + destFile, "wx", function(error, fileDescriptor){
						if(!error && fileDescriptor){
							// Write to the destination file
							fs.writeFile(fileDescriptor, buffer.toString("base64"), function(error){
								if(!error){
									// Close the destination file
									fs.close(fileDescriptor, function(error){
										if(!error){
											callback(false);
										}
										else {
											callback(error);
										}
									});
								}
								else {
									callback(error);
								}
							});
						}
						else {
							callback(error);
						}
					});
				}
				else {
					callback(error);
				}
			});
		}
		else {
			callback(error);
		}
	});
}
//Decompress the contents of a .gz.b64 file into a string variable 
function decompressLogFile(fileId, callback){
	const fileName = fileId + ".gz.b64";
	fs.readFile(lib.baseDir + fileName, "utf8", function(error, string){
		if(!error && string){
			//Decompress the data
			const inputBuffer = Buffer.from(string, "base64");
			zlib.unzip(inputBuffer, function(error, outputBuffer){
				if(!error && outputBuffer){
					// Callback
					const str = outputBuffer.toString();
					callback(false, str);
				}
				else {
					callback(error);
				}
			});
		}
		else {
			callback(error);
		}
	});
}
// Truncate a log file
function truncateLogFile(logId, callback){
	fs.open(lib.baseDir + logId + ".log", "w", function(error, fileDescriptor){
		if(!error && fileDescriptor){
			fs.ftruncate(fileDescriptor, function(error){
				if(!error){
					callback(false);
				}
				else {
					callback(error);
				}
			});
		}
		else {
			callback(error);
		}
	});
	
}
//Export the module
module.exports = lib;