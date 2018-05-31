/*
 * BSD 3-Clause License
 *
 * Copyright (c) 2018, Affirm
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *  Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *  Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 *  Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

module.exports = function (grunt) {
    'use strict';
    grunt.loadTasks('./tasks');
    require('time-grunt')(grunt);
    require('load-grunt-tasks')(grunt);
    grunt.initConfig({
        mozuconfig: grunt.file.readJSON('./mozu.config.json'),
        jshint: {
            'normal': ['./assets/src/**/*.js'],
            'continuous': {
                'options': { 'force': true },
                'src': '<%= jshint.normal %>'
            }
        },
        browserify: {
            'all': {
                'files': [{
                        'expand': true,
                        'cwd': 'assets/src/',
                        'src': ['**/*.manifest.js'],
                        'dest': 'assets/dist/',
                        'ext': '.all.js',
                        'extDot': 'last'
                    }],
                'options': {
                    'browserifyOptions': {
                        'standalone': 'index',
                        'node': true,
                        'commondir': false,
                        'browserField': false,
                        'builtins': false,
                        'insertGlobals': false
                    }
                }
            }
        },
        manifest: { 'all': { 'files': '<%= browserify.all.files %>' } },
        mozusync: {
            'options': {
                'applicationKey': '<%= mozuconfig.workingApplicationKey %>',
                'context': '<%= mozuconfig %>',
                'watchAdapters': [
                    {
                        'src': 'mozusync.upload.src',
                        'action': 'upload',
                        'always': ['./assets/functions.json']
                    },
                    {
                        'src': 'mozusync.del.remove',
                        'action': 'delete'
                    }
                ]
            },
            'upload': {
                'options': {
                    'action': 'upload',
                    'noclobber': true
                },
                'src': ['./assets/**/*'],
                'filter': 'isFile'
            },
            'del': {
                'options': { 'action': 'delete' },
                'src': '<%= mozusync.upload.src %>',
                'filter': 'isFile',
                'remove': []
            },
            'wipe': {
                'options': { 'action': 'deleteAll' },
                'src': '<%= mozusync.upload.src %>'
            }
        },
        watch: {
            'options': { 'spawn': false },
            'src': {
                'files': '<%= jshint.normal %>',
                'tasks': [
                    'jshint:continuous',
                    'browserify:all',
                    'manifest'
                ]
            },
            'sync': {
                'files': ['assets/**/*'],
                'tasks': [
                    'mozusync:upload',
                    'mozusync:del'
                ]
            }
        },
        mochaTest: {
            'all': {
                'clearRequireCache': true,
                'src': ['assets/test/**/*.js']
            }
        }
    });
    grunt.registerTask('build', [
        'jshint:normal',
        'browserify:all',
        'manifest',
        'test'
    ]);
    grunt.registerTask('default', [
        'build',
        'mozusync:upload'
    ]);
    grunt.registerTask('reset', [
        'mozusync:wipe',
        'mozusync:upload'
    ]);
    grunt.registerTask('cont', ['watch']);
    grunt.registerTask('c', ['watch']);
    grunt.registerTask('w', ['watch']);
    grunt.registerTask('test', ['mochaTest']);
};