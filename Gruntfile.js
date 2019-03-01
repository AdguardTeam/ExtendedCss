/*global module:false,require*/
var fs = require('fs-extra');

module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt);


  // Project configuration.
  grunt.initConfig({
    // Helper libs
    _: require('underscore'),
    // Metadata.
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
      '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */\n',
    // Task configuration.
    concat: {
      options: {
        banner: '<%= banner %>' + 'var ExtendedCss = (function(window) {\n',
        footer: '\n' +
          '// EXPOSE\n' +
          'return ExtendedCss;\n' +
          '})(window);',
        stripBanners: true
      },
      dist: {
        src: [
          'build/utils.js',
          'build/**.js',
          // All files in alpha order with these two at the end
          '!build/extended-css-selector.js',
          '!build/extended-css.js',
          'build/extended-css-selector.js',
          'build/extended-css.js'
        ],
        dest: 'dist/<%= pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        banner: '<%= banner %>'
      },
      dist: {
        src: '<%= concat.dist.dest %>',
        dest: 'dist/<%= pkg.name %>.min.js'
      }
    },
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        esversion: 6,
        immed: true,
        newcap: true,
        noarg: true,
        sub: true,
        undef: true,
        unused: true,
        boss: true,
        eqnull: true,
        browser: true,
        globals: {}
      },
      gruntfile: {
        src: 'Gruntfile.js'
      },
      lib_test: {
        src: ['lib/**/*.js', '!lib/sizzle.patched.js']
      }
    },
    qunit: {
      files: ['test/*/*.html']
    },
    watch: {
      gruntfile: {
        files: '<%= jshint.gruntfile.src %>',
        tasks: ['jshint:gruntfile']
      },
      lib_test: {
        files: '<%= jshint.lib_test.src %>',
        tasks: ['jshint:lib_test', 'qunit']
      }
    },
    babel: {
      options: {
        plugins: [
          ["transform-es2015-block-scoping", {
            "throwIfClosureRequired": true
          }],
          "transform-for-of-as-array"
        ]
      },
      files: {
        expand: true,
        cwd: 'lib',
        src: '**.js',
        dest: 'build/',
        ext: '.js',
        extDot: 'last'
      }
    },
    clean: ['build']
  });

  // These plugins provide necessary tasks.

  // Default task.
  grunt.registerTask('default', ['clean', 'jshint', 'babel', 'qunit']);
  grunt.registerTask('build', ['clean', 'jshint', 'babel']);
  grunt.registerTask('build-dist', ['clean', 'jshint', 'babel', 'qunit', 'concat', 'uglify']);
  grunt.registerTask('build-dist-minus-tests', ['clean', 'jshint', 'babel', 'concat', 'uglify']);

  // Prepare gh-pages branch
  grunt.registerTask('gh-pages', function() {
    fs.moveSync('build', '_build');
    fs.copySync('test', 'build/test');
    fs.copySync('lib', 'build/lib');
    fs.copySync('index.html', 'build/index.html');
    fs.moveSync('_build', 'build/build');
    fs.moveSync('dist/extended-css.js', 'build/extended-css.js');
    fs.moveSync('dist/extended-css.min.js', 'build/extended-css.min.js');
  });
};
