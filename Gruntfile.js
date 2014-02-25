module.exports = function(grunt) {
    grunt.initConfig({
        'billy-builder': {
            title: 'ember-popover',
            compass: {
                sassDir: 'src/scss',
                bundleExec: true
            }
        }
    });

    grunt.loadNpmTasks('billy-builder');
};