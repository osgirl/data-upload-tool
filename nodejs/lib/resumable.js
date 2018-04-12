const utils = require('./utils.js');
const _ = require('underscore');
const uuidv4 = require('uuid/v4');
const logger = require('./logger');
const fs = require('fs');
const fsExtra = require('fs.extra');
const path = require('path');
const constants = require('../config');
const temporaryFolder = constants.TEMP_DIRECTORY;
const uploadFolder = constants.UPLOAD_DIRECTORY;

const MAX_FILE_SIZE = null;
const FILE_PARAMETER_NAME = 'file';

function mkDirByPathSync(targetDir, {isRelativeToScript = false} = {}) {
	const sep = path.sep;
	const initDir = path.isAbsolute(targetDir) ? sep : '';
	const baseDir = isRelativeToScript ? __dirname : '.';
  
	targetDir.split(sep).reduce((parentDir, childDir) => {
	  const curDir = path.resolve(baseDir, parentDir, childDir);
	  try {
		fs.mkdirSync(curDir);
		console.log(`Directory ${curDir} created!`);
	  } catch (err) {
		if (err.code !== 'EEXIST') {
		  throw err;
		}
  
		console.log(`Directory ${curDir} already exists!`);
	  }
  
	  return curDir;
	}, initDir);
  }

module.exports = resumable = function () {
	var $ = this;
	
	try {
		fs.mkdirSync(temporaryFolder);
		fs.mkdirSync(uploadFolder);
	} catch (e) { }


	var cleanIdentifier = function (identifier) {
		return identifier.replace(/^0-9A-Za-z_-/img, '');
	}

	var getChunkFilename = function (chunkNumber, identifier) {
		// Clean up the identifier
		identifier = cleanIdentifier(identifier);
		// What would the file name be?
		return path.join(temporaryFolder, './resumable-' + identifier + '.' + chunkNumber);
	}

	var validateRequest = function (chunkNumber, chunkSize, totalSize, identifier, filename, fileSize) {
		// Clean up the identifier
		identifier = cleanIdentifier(identifier);

		// Check if the request is sane
		if (chunkNumber == 0 || chunkSize == 0 || totalSize == 0 || identifier.length == 0 || filename.length == 0) {
			return 'non_resumable_request';
		}
		var numberOfChunks = Math.max(Math.floor(totalSize / (chunkSize * 1.0)), 1);
		if (chunkNumber > numberOfChunks) {
			return 'invalid_resumable_request1';
		}

		// Is the file too big?
		if (MAX_FILE_SIZE && totalSize > MAX_FILE_SIZE) {
			return 'invalid_resumable_request2';
		}

		if (typeof (fileSize) != 'undefined') {
			if (chunkNumber < numberOfChunks && fileSize != chunkSize) {
				// The chunk in the POST request isn't the correct size
				return 'invalid_resumable_request3';
			}
			if (numberOfChunks > 1 && chunkNumber == numberOfChunks && fileSize != ((totalSize % chunkSize) + chunkSize)) {
				// The chunks in the POST is the last one, and the fil is not the correct size
				return 'invalid_resumable_request4';
			}
			if (numberOfChunks == 1 && fileSize != totalSize) {
				// The file is only a single chunk, and the data size does not fit
				return 'invalid_resumable_request5';
			}
		}

		return 'valid';
	}

	//'found', filename, original_filename, identifier
	//'not_found', null, null, null
	$.get = function (req, callback) {
		
		const chunkNumber = req.query.resumableChunkNumber || 0;
		const chunkSize = req.query.resumableChunkSize || 0;
		const totalSize = req.query.resumableTotalSize || 0;
		const identifier = req.query.resumableIdentifier || "";
		const relocation = req.query.relocation;
		const filename = req.query.resumableFilename || "";
		var numberOfChunks = Math.max(Math.floor(totalSize / (chunkSize * 1.0)), 1);
		const mainDir = path.dirname(require.main.filename)
		const uploadPath = relocation? mainDir+relocation  : uploadFolder;
		const outputFolder = path.join(uploadPath, identifier);
		const outputFilepath = path.join(outputFolder, filename);

		const context = {
			identifier,
			numberOfChunks,
			tempFolder: temporaryFolder,
			filepath: outputFilepath,
			fileSize: totalSize,
			filename,
			userId: null,//req.session.user.id,
			ownername: null,//req.session.user.displayName,
			relocation
		}

		const log = logger.getLogByIdentifier(identifier);

		if (validateRequest(chunkNumber, chunkSize, totalSize, identifier, filename) == 'valid') {
			var chunkFilename = getChunkFilename(chunkNumber, identifier);
			fs.exists(chunkFilename, function (exists) {
				if (exists) {
					if (parseInt(chunkNumber) === numberOfChunks) {
						log.chunkAssembly(`Last chunk received via GET, calling assembly line`, {guid: uuidv4()});
						
						if (!fs.existsSync(outputFolder)) {
							fs.mkdirSync(outputFolder);
						}
						
						callback('done', filename, context.filename, identifier, context)
					}
					else {
						callback('found', filename, context.filename, identifier, context)
					}	
					
				} else {
					callback('not_found', null, null, identifier, context);
				}
			});
		} else {
			callback('not_found', null, null, identifier, context);
		}
	}

	//'partly_done', filename, original_filename, identifier
	//'done', filename, original_filename, identifier
	//'invalid_resumable_request', null, null, null
	//'non_resumable_request', null, null, null
	$.post = function (req, callback) {

		var fields = req.body;
		var files = req.files;

		var chunkNumber = fields['resumableChunkNumber'];
		var chunkSize = fields['resumableChunkSize'];
		var totalSize = fields['resumableTotalSize'];
		var identifier = cleanIdentifier(fields['resumableIdentifier']);
		var filename = fields['resumableFilename'];
		var relocation = fields['relocation'];
		var original_filename = fields['resumableIdentifier'];
		var numberOfChunks = Math.max(Math.floor(totalSize / (chunkSize * 1.0)), 1);
		const mainDir = path.dirname(require.main.filename)
		const uploadPath = relocation? path.join(mainDir, relocation)  : uploadFolder;
		const outputFolder = path.join(uploadPath, identifier);
    const outputFilepath = path.join(outputFolder, filename);
    
		const context = {
			identifier,
			numberOfChunks,
			tempFolder: temporaryFolder,
			filepath: outputFilepath,
			fileSize: parseInt(totalSize),
			userId: null,//req.session.user.id,
			ownername: null,//req.session.user.displayName,
			filename,
			relocation
		}

		const log = logger.getLogByIdentifier(identifier);


		if (!fs.existsSync(uploadPath)) {
			fs.mkdirSync(uploadPath);
		}
		if (!fs.existsSync(outputFolder)) {
			fs.mkdirSync(outputFolder);
		}

		if (!files[FILE_PARAMETER_NAME] || !files[FILE_PARAMETER_NAME].size) {
			callback('invalid_resumable_request', null, null, null);
			return;
		}

		var validation = validateRequest(chunkNumber, chunkSize, totalSize, identifier, files[FILE_PARAMETER_NAME].size);
		if (validation == 'valid') {
			var chunkFilename = getChunkFilename(chunkNumber, identifier);
			// Save the chunk (TODO: OVERWRITE)
      fsExtra.copy(files[FILE_PARAMETER_NAME].path, chunkFilename, { replace: false }, function (err) {
				// Do we have all the chunks?
				var currentTestChunk = 1;
				var testChunkExists = function () {
					fs.exists(getChunkFilename(currentTestChunk, identifier), function (exists) {
						if (exists) {
							currentTestChunk++;
							if (currentTestChunk > numberOfChunks) {
								log.chunkAssembly(`Last chunk received via POST, calling assembly`, {guid: uuidv4()})
								callback('done', filename, context.filename, identifier, context)
							} else {
								// Recursion
								testChunkExists();
							}
						} else {
							callback('partly_done', filename, original_filename, identifier, context);
						}
					});
				}
				testChunkExists();
			});
		} else {
			callback(validation, filename, original_filename, identifier);
		}
	}


	$.write = function (identifier, writableStream, options) {
		options = options || {};
		options.end = (typeof options['end'] == 'undefined' ? true : options['end']);
		const log = logger.getLogByIdentifier(identifier)
		log.chunkAssembly(`Opening write stream for assembly`, {guid: uuidv4()})
		// Iterate over each chunk
		var pipeChunk = function (number) {
			var chunkFilename = getChunkFilename(number, identifier);
			fs.exists(chunkFilename, function (exists) {
				if (exists) {
					log.chunkAssembly(`Piping chunk ${number}`, {guid: uuidv4()});
					// If the chunk with the current number exists,
					// then create a ReadStream from the file
					// and pipe it to the specified writableStream.
					var sourceStream = fs.createReadStream(chunkFilename);
					sourceStream.pipe(writableStream, {
						end: false
					});
					sourceStream.on('end', function () {
						// When the chunk is fully streamed,
						// jump to the next one
						pipeChunk(number + 1);
					});
				} 
				else {
					// When all the chunks have been piped, end the stream
					if (options.end) { writableStream.end(); }
					if (options.onDone) { options.onDone();  }
				}
			});
		}
		
		pipeChunk(1);
	}


	$.clean = function (identifier, options) {
		options = options || {};
		
		// Iterate over each chunk
		var pipeChunkRm = function (number) {

			var chunkFilename = getChunkFilename(number, identifier);

			//logger.info('removing pipeChunkRm ', number, 'chunkFilename', chunkFilename);
			fs.exists(chunkFilename, function (exists) {
				if (exists) {

					try {
						fs.unlink(chunkFilename, function (err) {
							if (err && options.onError) options.onError(err);
						});


					}
					catch (err) {
						logger.info('ERROR removing chunk', err)
					}
					pipeChunkRm(number + 1);

				} else {

					if (options.onDone) options.onDone();

				}
			});
		}
		pipeChunkRm(1);
	}

	return $;
}