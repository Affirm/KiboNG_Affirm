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
            needle.post( config.apiUrl + 'charges',
                params, options,
				function(err, response, body){
					if ( body &&  body.status_code && body.status_code != 200)
						reject( body.message );
					else {
						resolve( body );
					}
				}
			);
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
					if ( body &&  body.status_code && body.status_code != 200)
						reject( body );
					else {
						resolve( body );
					}
				}
			);
		});
		return promise;
	};

    // call affirm charges to capture the payment
    self.refundPayment = function( params, config ) {
        var options = {
                json: true,
                headers: { 'Authorization':'Basic ' + new Buffer( config.publicapikey + ':' + config.privateapikey ).toString('base64')  }
        };

        var promise = new Promise( function(resolve, reject) {
            needle.post( config.apiUrl + 'charges/' + params.chargeId + '/refund', { order_id: params.orderId }, options,
				function(err, response, body){
					if ( body &&  body.status_code && body.status_code != 200)
						reject( body );
					else {
						resolve( body );
					}
				}
			);
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
					if ( body &&  body.status_code && body.status_code != 200)
						reject( body );
					else {
						resolve( body );
					}
				}
			);
		});
		return promise;
	};

    self.configure = function(config) {
		console.log('Not Implemented - Affirm dosnt Need config?');
	};

	self.confirmOrder = function(orderReferenceId) {
		console.log('Not Implemented - Affirm dosnt Need confirm?');
	};

	return self;
};
