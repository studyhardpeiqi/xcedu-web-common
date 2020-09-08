const { src, dest, parallel, series } = require('gulp')
const uglify = require('gulp-uglify')
const concat = require('gulp-concat')
const rename = require('gulp-rename')
const cleanCss = require('gulp-clean-css')
const gizp = require('gulp-gzip')
const sass = require('gulp-sass')
const babel = require('gulp-babel')
const wrap = require('gulp-exports')
const replace = require('gulp-replace')
const args = require('yargs').argv

sass.compiler = require('node-sass')

function wrapSystemjsWebpackInterop () {
  return src([
    './node_modules/systemjs-webpack-interop/public-path.js'
  ])
    .pipe(babel({
      presets: ['@babel/preset-env']
    }))
    .pipe(wrap('window', 'SystemjsWebapckInterop'))
    .pipe(uglify())
    .pipe(dest('./build'))
}

function wrapVuexRouterSync () {
  return src([
    './node_modules/vuex-router-sync/index.js'
  ])
    .pipe(babel({
      presets: ['@babel/preset-env']
    }))
    .pipe(wrap('window', 'VuexRouterSync'))
    .pipe(uglify())
    .pipe(dest('./build'))
}

function uglifyVendor () {
  return src([
    './node_modules/nprogress/nprogress.js'
  ])
    .pipe(uglify())
    .pipe(dest('./build'))
}
function vendorPolyfill () {
  return src([
    './polyfill/minified.js'
  ]).pipe(dest('dist/polyfill'))
    .pipe(gizp({ threshold: '1kb', level: 7 }))
    .pipe(dest('dist/polyfill'))
}
function vendorXcBase () {
  return src([
    './xcbase/xcedu-share.js',
    './xcbase/xcedu-components.js'
  ]).pipe(concat('xcbase.js'))
    .pipe(replace(/\/\/# sourceMappingURL=(.+)\.map/g, '/* remove source map */'))
    .pipe(dest('dist/xcbase'))
    .pipe(gizp({ threshold: '1kb', level: 7 }))
    .pipe(dest('dist/xcbase'))
}
function vendorXcBasePublic () {
  return src([
    './xcbase/public/**/*'
  ]).pipe(dest('dist/xcbase/public'))
}
function vendorSpa () {
  return src([
    './node_modules/single-spa/lib/umd/single-spa.min.js',
    './node_modules/single-spa-vue/lib/single-spa-vue.js',
    // './node_modules/import-map-overrides/dist/import-map-overrides.js',
    './workaround/import-map-overrides.js', // IE保护模式下localStorage报错问题
    './node_modules/systemjs/dist/system.min.js',
    './node_modules/systemjs/dist/extras/amd.min.js',
    './node_modules/systemjs/dist/extras/named-exports.min.js'
  ])
    .pipe(concat('vendor-spa.min.js'))
    .pipe(replace(/\/\/# sourceMappingURL=(.+)\.map/g, '/* remove source map */'))
    .pipe(dest('dist/lib'))
    .pipe(gizp({ threshold: '1kb', level: 7 }))
    .pipe(dest('dist/lib'))
}

function vendorVue () {
  return src([
    `./node_modules/vue/dist/${args.env === 'development' ? 'vue.js' : 'vue.min.js'}`,
    './node_modules/vue-router/dist/vue-router.min.js',
    './node_modules/vuex/dist/vuex.min.js',
    './node_modules/axios/dist/axios.min.js',
    './build/*.js'
  ])
    .pipe(concat('vendor.min.js'))
    .pipe(replace(/\/\/# sourceMappingURL=(.+)\.map/g, '/* remove source map */'))
    .pipe(dest('dist/lib'))
    .pipe(gizp({ threshold: '1kb', level: 7 }))
    .pipe(dest('dist/lib'))
}

const vendorFramework = series(
  parallel(wrapSystemjsWebpackInterop, wrapVuexRouterSync, uglifyVendor),
  parallel(vendorVue, vendorSpa)
)

function vendorElementScripts () {
  return src([
    './node_modules/element-ui/lib/index.js'
  ])
    .pipe(rename('element-ui.min.js'))
    .pipe(replace(/\/\/# sourceMappingURL=(.+)\.map/g, '/* remove source map */'))
    .pipe(dest('dist/element'))
    .pipe(gizp({ threshold: '1kb', level: 7 }))
    .pipe(dest('dist/element'))
}

function elementTheme (theme) {
  return function () {
    return src([
      `./themes/${theme}/index.css`
    ])
      .pipe(cleanCss())
      .pipe(rename(`element-${theme}.css`))
      .pipe(dest('dist/element'))
      .pipe(gizp({ threshold: '1kb', level: 7 }))
      .pipe(dest('dist/element'))
  }
}

const elementThemeTasks = ['blue', 'green', 'orange', 'red'].map(item => elementTheme(item))

const vendorElementTheme = parallel(...elementThemeTasks)

function vendorElementAssets () {
  return src([
    './themes/green/fonts/*.*'
  ])
    .pipe(dest('dist/element/fonts'))
}

const vendorElement = parallel(vendorElementScripts, vendorElementTheme, vendorElementAssets)

function xcedCommonScripts (cb) {
  cb()
}

function xceduTheme (theme) {
  return function () {
    return src([
      './node_modules/nprogress/nprogress.css',
      './node_modules/normalize.css/normalize.css',
      `./src/themes/variables-${theme}.scss`,
      './src/mixin.scss',
      './src/reset.scss',
      './src/icon.scss',
      './src/common.scss',
      './src/pages/navbar.scss',
      './src/pages/user.scss',
      './src/pages/email.scss',
      './src/pages/testBank.scss',
      './src/pages/forum.scss'
    ])
      .pipe(concat(`common-${theme}.scss`))
      .pipe(sass({ outputStyle: 'compressed' }))
      .pipe(dest('dist/widget'))
      .pipe(gizp({ level: 7 }))
      //  当前 css 较小， 所以去掉 threshold 统一打包出来的文件名称
      // .pipe(gizp({ threshold: '1kb', level: 7 }))
      .pipe(dest('dist/widget'))
  }
}

const commonThemeTasks = ['blue', 'green', 'orange', 'red'].map(theme => {
  return xceduTheme(theme)
})

const xcedCommonTheme = parallel(...commonThemeTasks)

function xcedCommonAssets () {
  return src([
    './src/fonts/**/*'
  ])
    .pipe(dest('dist/widget/fonts'))
}

const xceduCommon = parallel(xcedCommonScripts, xcedCommonTheme, xcedCommonAssets)

exports.build = parallel(vendorFramework, vendorElement, vendorPolyfill, vendorXcBase, vendorXcBasePublic, xceduCommon)
