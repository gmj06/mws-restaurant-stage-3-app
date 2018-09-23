const gulp = require('gulp');
//const concat = require('gulp-concat');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const uglify = require('gulp-uglify-es').default;
const babel = require('gulp-babel');
const sourcemaps = require('gulp-sourcemaps');
const imagemin = require('gulp-imagemin');

//const browserSync = require('browser-sync').create();



 gulp.task('default', ['copy-html', 'copy-images', 'styles', 'scripts'], function(){
//    gulp.task('default', ['scripts','dist'], function(){
    gulp.watch('sass/**/*.scss', ['styles']);
    gulp.watch(['js/dbhelper.js', 'js/idb.js', 'js/idbhelper.js', 'js/register_service_worker.js'], ['scripts']);
    gulp.watch('*.html', ['copy-html']);
    //gulp.watch('./dist/*.html').on('change', browserSync.reload);

    // browserSync.init({
    //     server: './dist'//,
    //     //index: 'index.html'
    // });   
});

gulp.task('dist', [
    'copy-html',
    'copy-images',
    'styles',    
    'scripts-dist'
]);

gulp.task('copy-html', function(){
    gulp.src('*.html')    
    .pipe(gulp.dest('dist'));
    // .pipe(browserSync.stream());
});

gulp.task('copy-images', function(){
    gulp.src('img/**/*.jpg')
    .pipe(imagemin({
        progressive: true
    }))
    .pipe(gulp.dest('./dist/img'));
});

gulp.task('styles', function(){
    gulp.src('sass/**/*.scss')
         .pipe(sourcemaps.init())
        .pipe(sass({outputStyle: 'compressed'}).on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions']
        }))
         .pipe(sourcemaps.write())
        .pipe(gulp.dest('./css'))
        .pipe(gulp.dest('./dist/css'));
        // .pipe(browserSync.stream());
});

gulp.task('scripts', function(){   
    gulp.src('js/*.js')
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('./dist/js'));
});


gulp.task('scripts-dist', function(){
    gulp.src('js/*.js')
    .pipe(babel())
    .pipe(uglify({ compress: { drop_console: true } }))
    .pipe(gulp.dest('./dist/js'));
});




