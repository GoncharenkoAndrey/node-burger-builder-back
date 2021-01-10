const fs = require("fs");
const path = require("path");
const helpers = require("./helpers");
const lib = {
	baseDir: path.join(__dirname,"/../.data/"),
	create: createDataFile,
	read: readDataFile,
	update: updateDataFile,
	delete: deleteDataFile,
	list: listFiles
};
function createDataFile(directory,file,data,callback){
	fs.open(lib.baseDir+directory+'/'+file+".json","wx",function(error,fileDescriptor){
		if(!error && fileDescriptor){
			const stringData = JSON.stringify(data);
			fs.write(fileDescriptor,stringData,function(error){
				if(!error){
					fs.close(fileDescriptor,function (error){
						if(!error){
							callback(false);
						}
						else{
							callback("Error closing new file");
						}
					});
				}
				else{
					callback("Error writing to new file");
				}
			});
		}
		else{
			callback("Could not create new file, it may already exist");
		}
	});
}
function readDataFile(directory,file,callback){
	fs.readFile(lib.baseDir+directory+'/'+file+".json","utf8",function(error,data){
		if(!error && data) {
			const parsedData = helpers.parseJSONToObject(data);
			callback(false, parsedData)
		}
		else {
			callback(error,data);
		}
	});
}
function updateDataFile(directory,file,data,callback){
	fs.open(lib.baseDir+directory+'/'+file+".json","r+",function(error,fileDescriptor){
		if(!error && fileDescriptor){
			const stringData = JSON.stringify(data);
			fs.ftruncate(fileDescriptor,function(error){
				if(!error){
					fs.writeFile(fileDescriptor,stringData,function(error){
						if(!error){
							fs.close(fileDescriptor,function(error){
								if(!error){
									callback(false);
								}
								else{
									callback("Error closing existing file");
								}
							});
						}
						else{
							callback("Error writing to existing file");
						}
					});
				}
				else{
					callback("Error truncating file");
				}
			});
		}
		else{
			callback("Could not open file for updating, it may not exist");
		}
	});
}
function deleteDataFile(directory,file,callback){
	fs.unlink(lib.baseDir+directory+'/'+file+".json",function(error){
		if(!error){
			callback(false);
		}
		else{
			callback("Error deleting file");
		}
	});
}
function listFiles(dir, callback){
	fs.readdir(lib.baseDir + dir+"/", function(error, data){
		if(!error && data && data.length > 0){
			const trimmedFileNames = [];
			data.forEach(function(fileName){
				trimmedFileNames.push(fileName.replace(".json", ''));
			});
			callback(false, trimmedFileNames);
		}
		else {
			callback(error, data);
		}
	});
}
module.exports = lib;