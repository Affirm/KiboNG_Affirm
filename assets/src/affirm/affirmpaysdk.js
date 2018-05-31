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

var _ 		= require("underscore");
var needle 	= require('needle');
var helper = require("./helper");

module.exports = function() {
    var self = this;

    // Parse response params to get the token sent by Affirm
    self.getToken = function( context ) {
        var params = [];
        if( context.request && context.request.url ){
            params = helper.parseUrlParams( context );

            if( context.request.body && context.request.body.checkout_token ){
                params.checkout_token = context.request.body.checkout_token;
            }
        }
        return params;
    };

    self.closeOrder = function( mzOrder, affirmToken ) {
        console.log('Not Implemented - Affirm dosnt Need closeOrder?');
    };

    // call affirm charges to capture the payment
    self.authorizePayment = function( params, config ) {
        var options = {
            json: true,
            headers: { 'Authorization':'Basic ' + new Buffer( config.publicapikey + ':' + config.privateapikey ).toString('base64')  }
        };

        var promise = new Promise( function(resolve, reject) {
            needle.post( config.apiUrl + 'charges', params, options,
                function(err, response, body){
                    if ( response &&  response.statusCode && response.statusCode != 200){
                        console.log( 'Affirm Original Error:', response.message );
                        reject( { status_code: response.statusCode, message: ( response.statusMessage ) ? response.statusMessage : 'Affirm Error found' } );
                    }
                    else {
                        resolve( body );
                    }
                });
        });
        return promise;
    };

    // call affirm charges to capture the payment
    self.capturePayment = function( params, config ) {
        var options = {
                json: true,
                headers: { 'Authorization':'Basic ' + new Buffer( config.publicapikey + ':' + config.privateapikey ).toString('base64')  }
        };

        var promise = new Promise( function(resolve, reject) {
            needle.post( config.apiUrl + 'charges/' + params.chargeId + '/capture', { order_id: params.orderId }, options,
                function(err, response, body){
                    if ( response &&  response.statusCode && response.statusCode != 200){
                        console.log( 'Affirm Original Error:', response.message );
                        reject( { status_code: response.statusCode, message: ( response.statusMessage ) ? response.statusMessage : 'Affirm Error found' } );
                    }
                    else {
                        resolve( body );
                    }
                });
        });
        return promise;
    };

    // call affirm charges to capture the payment
    self.refundPayment = function( params, config ) {
        var options = {
            json: true,
            headers: { 'Authorization':'Basic ' + new Buffer( config.publicapikey + ':' + config.privateapikey ).toString('base64')  }
        };

        var refundParams = ( params.amount ) ? { order_id: params.orderId, amount: params.amount * 100 } : { order_id: params.orderId };

        var promise = new Promise( function( resolve, reject ) {
            needle.post( config.apiUrl + 'charges/' + params.chargeId + '/refund', refundParams, options,
                function( err, response, body ){
                    if ( response &&  response.statusCode && response.statusCode != 200 ){
                        console.log( 'Affirm Original Error:', response.message );
                        reject( { status_code: response.statusCode, message: ( response.statusMessage ) ? response.statusMessage : 'Affirm Error found' } );
                    }

                    else {
                        resolve( body );
                    }
                });
        });
        return promise;
    };

    // call affirm charges to void the payment
    self.voidPayment = function( params, config ) {
        var options = {
            json: true,
            headers: { 'Authorization':'Basic ' + new Buffer( config.publicapikey + ':' + config.privateapikey ).toString('base64')  }
        };

        var promise = new Promise( function(resolve, reject) {
            needle.post( config.apiUrl + 'charges/' + params.chargeId + '/void', { order_id: params.orderId }, options,
                function(err, response, body){
                    if ( response &&  response.statusCode && response.statusCode != 200){
                        console.log( 'Affirm Original Error:', response.message );
                        reject( { status_code: response.statusCode, message: ( response.statusMessage ) ? response.statusMessage : 'Affirm Error found' } );
                    }

                    else {
                        resolve( body );
                    }
                }
            );
        });
        return promise;
    };

    self.configure = function(config) {
        console.log('Not Implemented - Affirm dosnt Need config');
    };

    self.confirmOrder = function(orderReferenceId) {
        console.log('Not Implemented - Affirm dosnt Need confirm');
    };

    return self;
};
