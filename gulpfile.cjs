const gulp = require('gulp');
const htmlmin = require('gulp-htmlmin');
const cheerio = require('cheerio');
const through2 = require('through2');

// Task to process HTML and inject JS
gulp.task('html', () => {
	return gulp.src('./dist/index.html')
		.pipe(htmlmin({ collapseWhitespace: true }))
		.on('error', (err) => console.error('Error in html task', err))
		.pipe(gulp.dest('build'))
		.pipe(injectFiles())
		.pipe(gulp.dest('build'))
		.on('end', () => console.log('HTML processing complete.'));
});

function injectFiles() {
	return through2.obj((file, enc, cb) => {
		if (file.isNull()) {
			cb(null, file);
			return;
		}

		const $ = cheerio.load(file.contents.toString(), { decodeEntities: false });
		// Remove existing tags
		$('script').remove();

		// Append the new tags
		const jsContent = `<script type="module">${getFileContents('./dist/assets/index.js')}</script>`;
		$('head').append(jsContent);
		const cssContent = `<style>${getFileContents('./dist/assets/style.css')}</style>`;
		$('head').append(cssContent);

		file.contents = Buffer.from($.html());
		cb(null, file);
	});
}

function getFileContents(filePath) {
	const fs = require('fs');
	return fs.readFileSync(filePath, 'utf8');
}

// Default task to run all tasks
gulp.task('default', gulp.series('html'));