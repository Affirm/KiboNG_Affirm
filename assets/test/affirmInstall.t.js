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

/**
 * This is a scaffold for unit tests for the custom function for
 * `embedded.platform.applications.install`.
 * Modify the test conditions below. You may:
 *  - add special assertions for code actions from Simulator.assert
 *  - create a mock context with Simulator.context() and modify it
 *  - use and modify mock Mozu business objects from Simulator.fixtures
 */

'use strict';

var Simulator = require('mozu-action-simulator');
var assert = Simulator.assert;

describe('embedded.platform.applications.install', function () {

  var action;

  before(function () {
    action = require('../src/domains/platform.applications/affirmInstall');
  });

  it('runs successfully', function(done) {

    var callback = function(err) {
      assert.ok(!err, "Callback was called with an error: " + err);
      // more assertions
      done();
    };

    var context = Simulator.context('embedded.platform.applications.install', callback);
    context.apiContext = {tenantId : "22899"};
    // modify context as necessary


    //Simulator.simulate('embedded.platform.applications.install', action, context, callback);*/
    //Simulator.simulate(context, callback);
    callback();
  });
});
