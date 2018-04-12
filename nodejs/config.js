var path = require('path');
var fs = require('fs');

module.exports = {
  LOG_LEVELS: {
		levels: {
			error: 0,
			warn: 1,
			info: 2,
			boot: 3,
			chunkAssembly: 4,
			chunkPOST: 5,
			unzipping: 6,
			completed: 7,
			chunkGET: 8,
			database: 9,
			http: 9,
			streamOPEN: 10,
			streamCLOSE: 10,
			debug: 11,
		},
		colors: {
			error : 'red',
			warn : 'yellow',
			info : 'cyan',
			chunkGET : 'yellow',
			chunkPOST : 'blue',
			chunkAssembly : 'blue',
			unzipping : 'cyan',
			completed : 'green',
			database : 'magenta',
			boot : 'magenta',
			streamOPEN: 'red',
			streamCLOSE: 'red',
			debug: 'red'
		},
	},
	UPLOAD_DIRECTORY: path.join(path.dirname(require.main.filename) , '/uploads/'),
  TEMP_DIRECTORY: path.join(path.dirname(require.main.filename) , '/uploadTmp/'),
  STAGING_DIRECTORY: path.join(path.dirname(require.main.filename) , '/uploadStaging/'),
	LOG_FILE: path.dirname(require.main.filename) + '/logs/log.log',
  LOG_FOLDER: path.dirname(require.main.filename) + '/logs/',
  CORS_ALLOW : '*',
  PORT: 8080
};
