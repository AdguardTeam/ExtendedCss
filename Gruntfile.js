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
          'dist/utils.js',
          'dist/**.js',
          // All files in alpha order with these two at the end
          '!dist/utils.js',
          '!dist/extended-css-selector.js',
          '!dist/extended-css.js',
          'dist/extended-css-selector.js',
          'dist/extended-css.js'          
        ],
        dest: '<%= pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        banner: '<%= banner %>'
      },
      dist: {
        src: '<%= concat.dist.dest %>',
        dest: '<%= pkg.name %>.min.js'
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
        dest: 'dist/',
        ext: '.js',
        extDot: 'last'
      }
    }
  });

  // These plugins provide necessary tasks.

  // Default task.
  grunt.registerTask('default', ['jshint', 'babel', 'qunit']);
  grunt.registerTask('build', ['jshint', 'babel', 'qunit', 'concat', 'uglify']);
  grunt.registerTask('build-minus-qunit', ['jshint', 'babel', 'concat', 'uglify']);

  // Prepare gh-pages branch
  grunt.registerTask('gh-pages', function() {
    fs.moveSync('dist', '_dist');
    fs.copySync('test', 'dist/test');
    fs.copySync('lib', 'dist/lib');
    fs.copySync('index.html', 'dist/index.html');
    fs.moveSync('_dist', 'dist/dist');
    fs.moveSync('extended-css.js', 'dist/extended-css.js');
    fs.moveSync('extended-css.min.js', 'dist/extended-css.min.js');
  });
};
