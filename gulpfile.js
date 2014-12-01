var gulp       = require('gulp'),
	util       = require('gulp-util'),
	plugins    = require('gulp-load-plugins')(),
	del        = require('del'),
	package, config, patterns = [];

module.exports = gulp;

/**************************************************
 * helper
 **************************************************/
	function handleError (error) {
		util.log(error);
	}

	function loadPackageFile() {
		delete require.cache[require.resolve('./package.json')];

		package = require('./package.json');
	}

	function loadConfigFile() {
		delete require.cache[require.resolve('./gulpconfig.json')];

		config = require('./gulpconfig.json');
	}

	function preparePatterns(node, prefix) {
		var key, id, item;

		node = node || package;

		for(key in node) {
			id   = (prefix) ? prefix + '.' + key : 'package.' + key;
			item = node[key];

			if(typeof item === 'string') {
				patterns.push({ pattern: new RegExp('{{gulp:' + id + '}}', 'g'), replacement: item });
			} else if(Object.prototype.toString.call(item) === '[object Object]') {
				preparePatterns(item, id);
			}
		}
	}

	function getDatePatterns() {
		var date  = new Date(),
			month = ''.concat('0', (date.getMonth() + 1).toString()).slice(-2),
			day   = ''.concat('0', date.getDate().toString()).slice(-2),
			time  = ''.concat('0', date.getHours().toString()).slice(-2) + ':' + ''.concat('0', date.getMinutes().toString()).slice(-2) + ':' + ''.concat('0', date.getSeconds().toString()).slice(-2);

		return [
			{ pattern: new RegExp('{{gulp:date.year}}', 'g'), replacement: date.getFullYear() },
			{ pattern: new RegExp('{{gulp:date.month}}', 'g'), replacement: month },
			{ pattern: new RegExp('{{gulp:date.day}}', 'g'), replacement: day },
			{ pattern: new RegExp('{{gulp:date.time}}', 'g'), replacement: time }
		];
	}

/**************************************************
 * initialization
 **************************************************/
	loadPackageFile();
	loadConfigFile();
	preparePatterns();

/**************************************************
 * tasks (private)
 **************************************************/
	gulp.task('bump', ['javascript:all:build', 'less:all:build', 'image:all:build', 'html:all:build'], function() {
		loadPackageFile();
	});

	gulp.task('javascript:all:clean', function(callback) {
		return del(config.tasks.javascript.all.clean || [ config.tasks.javascript.all.destination.min + '**/*', config.tasks.javascript.all.destination.max + '**/*' ], callback);
	});

	gulp.task('javascript:all:lint', function() {
		return gulp.src(config.tasks.javascript.all.lint || config.tasks.javascript.all.watch)
			.pipe(plugins.jshint('./.jshintrc'))
			.pipe(plugins.jshint.reporter('jshint-stylish'));
	});

	gulp.task('javascript:all:build', [ 'javascript:all:clean', 'javascript:all:lint' ], function() {
		return gulp.src(config.tasks.javascript.all.build || config.tasks.javascript.all.watch)
			.pipe(plugins.plumber({ errorHandler: handleError}))
			// max
			.pipe(plugins.uglify({ compress: false, mangle: false, preserveComments: 'none', output: { beautify: true } }))
			.pipe(plugins.header(config.strings.banner.max.join('\n')))
			.pipe(plugins.frep(patterns))
			.pipe(plugins.frep(getDatePatterns()))
			.pipe(gulp.dest(config.tasks.javascript.all.destination.max))
			// mins
			.pipe(plugins.uglify({ preserveComments: 'none' }))
			.pipe(plugins.header(config.strings.banner.min.join('\n')))
			.pipe(plugins.frep(patterns))
			.pipe(plugins.frep(getDatePatterns()))
			.pipe(gulp.dest(config.tasks.javascript.all.destination.min));
	});

	gulp.task('less:all:clean', function(callback) {
		return del(config.tasks.less.all.clean || [ config.tasks.less.all.destination.min + '**/*', config.tasks.less.all.destination.max + '**/*' ], callback);
	});

	gulp.task('less:all:build', [ 'less:all:clean' ], function() {
		return gulp.src(config.tasks.less.all.build || config.tasks.less.all.watch)
			.pipe(plugins.plumber({ errorHandler: handleError}))
			.pipe(plugins.less({ compress: false }))
			.pipe(plugins.autoprefixer(config.settings.autoprefixer))
			// max
			.pipe(plugins.header(config.strings.banner.max.join('\n')))
			.pipe(plugins.frep(patterns))
			.pipe(plugins.frep(getDatePatterns()))
			.pipe(gulp.dest(config.tasks.less.all.destination.max))
			// min
			.pipe(plugins.minifyCss({ keepSpecialComments: 0 }))
			.pipe(plugins.header(config.strings.banner.min.join('\n')))
			.pipe(plugins.frep(patterns))
			.pipe(plugins.frep(getDatePatterns()))
			.pipe(gulp.dest(config.tasks.less.all.destination.min));
	});

	gulp.task('image:all:clean', function(callback) {
		return del(config.tasks.image.all.clean || config.tasks.image.all.destination + '**/*', callback);
	});

	gulp.task('image:all:build', [ 'image:all:clean' ], function() {
		return gulp.src(config.tasks.image.all.build || config.tasks.image.all.watch)
			.pipe(plugins.plumber({ errorHandler: handleError}))
			.pipe(plugins.imagemin({ progressive: true, optimizationLevel: 7 }))
			.pipe(gulp.dest(config.tasks.image.all.destination));
	});

	gulp.task('html:all:clean', function(callback) {
		return del(config.tasks.html.all.clean || config.tasks.html.all.destination + '**/*', callback);
	});

	gulp.task('html:all:build', [ 'html:all:clean' ], function() {
		return gulp.src(config.tasks.html.all.build || config.tasks.html.all.watch)
			.pipe(plugins.frep(patterns))
			.pipe(plugins.frep(getDatePatterns()))
			.pipe(gulp.dest(config.tasks.html.all.destination));
	});

/**************************************************
 * tasks (public)
 **************************************************/
	gulp.task('bump:patch', function() {
		return gulp.src(config.tasks.bump.watch)
			.pipe(plugins.bump({ type: 'patch' }))
			.pipe(gulp.dest(config.tasks.bump.destination));
	});

	gulp.task('bump:minor', function() {
		return gulp.src(config.tasks.bump.watch)
			.pipe(plugins.bump({ type: 'minor' }))
			.pipe(gulp.dest(config.tasks.bump.destination));
	});

	gulp.task('bump:major', function() {
		return gulp.src(config.tasks.bump.watch)
			.pipe(plugins.bump({ type: 'major' }))
			.pipe(gulp.dest(config.tasks.bump.destination));
	});

	gulp.task('all', [ 'bump' ]);

	gulp.task('watch', function() {
		plugins.livereload.listen();

		gulp
			.watch(config.tasks.bump.watch, [ 'bump' ])
			.on('change', plugins.livereload.changed);

		gulp
			.watch(config.tasks.javascript.all.watch, [ 'javascript:all:build' ])
			.on('change', plugins.livereload.changed);

		gulp
			.watch(config.tasks.less.all.watch, [ 'less:all:build' ])
			.on('change', plugins.livereload.changed);

		gulp
			.watch(config.tasks.image.all.watch, [ 'image:all:build' ])
			.on('change', plugins.livereload.changed);

		gulp
			.watch(config.tasks.html.all.watch, [ 'html:all:build' ])
			.on('change', plugins.livereload.changed);
	});

	gulp.task('default', [ 'watch' ]);