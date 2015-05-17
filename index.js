

var p = require('path');
var ftp = require('ftp');
var Stat = require('deployk-utils').Stat;


module.exports = function(options) {
	return function(cb) {
		return new FTP(options, cb);
	};
};


/**
 * @param {Object}
 * @param {function}
 */
function FTP(options, cb)
{
	/** @var {ftp} */
	this.ftp = new ftp();

	/** @var {function} */
	this.ready = false;

	var self = this;
	this.ftp.on('ready', function() {
		if (self.ready === false) {
			self.ready = true;

			if (typeof cb === 'function') {
				cb.call(self, self);
			}
		}
	});

	if (options.secure) {
		options.secureOptions = options.secureOptions||{};
		options.secureOptions.rejectUnauthorized = options.secureOptions.rejectUnauthorized||false;
	}

	this.ftp.connect(options);
};


/**
 * @param {string}
 * @param {function}
 */
FTP.prototype.readdir = function(path, cb)
{
	this.ftp.list(path, function(err, files) {

		if (files && !err) {
			var _files = {};
			files.forEach(function(file) {
				if (file.name!=='.' && file.name!=='..') {
					if (typeof file === 'object') {
						_files[file.name] = new Stat(
							file.type==='d' ? 'directory' : (file.type==='l' ? 'symlink' : 'file'),
							file.date, file.size, file.rights
						);
					}
				}
			});

			files = _files;
		}

		cb(err, files);
	});
};


/**
 * @param {string}
 * @param {function}
 */
FTP.prototype.stat = function(path, cb)
{
	this.readdir(p.dirname(path), function(err, files) {
		if (files && (p.basename(path) in files)) {
			cb(null, files[p.basename(path)]);

		} else {
			cb('Path '+path+' not found.', undefined);
		}
	});
};


FTP.prototype.putSymlink = function(dest, source, cb)
{
	cb && cb();
};


FTP.prototype.putDir = function(path, chmod, cb)
{
	self = this;
	this.ftp.mkdir(path, function(err) {
		if (err) {
			cb && cb(err);

		} else {
			self.chmod(path, chmod, cb);
		}
	});
};


FTP.prototype.putFile = function(dest, source, chmod, cb)
{
	this.putContent.apply(this, arguments);
};


FTP.prototype.putContent = function(dest, source, chmod, cb)
{
	var self = this;
	source.createReadStream(function(stream) {
		self.ftp.put(stream||'', dest, function(err) {
			if (err) {
				cb && cb(err);

			} else {
				self.chmod(dest, chmod, cb);
			}
		});
	});
};


FTP.prototype.deleteFile = function(path, cb)
{
	this.ftp.delete(path, cb || function(err) {});
};


FTP.prototype.deleteDir = function(path, cb)
{
	this.ftp.rmdir(path, true, cb || function(err) {});
};


FTP.prototype.chmod = function(path, chmod, cb)
{
	this.ftp.site('CHMOD ' + chmod + ' ' + path, function(err, responseText, responseCode) {
		cb && cb(responseCode===200 ? undefined : responseText);
	});
};


FTP.prototype.rename = function(oldPath, newPath, cb)
{
	this.ftp.rename(oldPath, newPath, cb || function(err) {});
}
