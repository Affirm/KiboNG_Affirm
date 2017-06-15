var PaymentSettings = require("mozu-node-sdk/clients/commerce/settings/checkout/paymentSettings");
var helper = require("./helper");
var _ = require("underscore");
var paymentConstants = require("./constants");
var affirmPay = require("./affirmpaysdk")();



var paymentHelper = module.exports = {

    // get Mozu configuration for external Affirm payment
	getPaymentConfig: function(context) {
		var self = this;
		return helper.createClientFromContext( PaymentSettings, context, true )
		      .getThirdPartyPaymentWorkflowWithValues( { fullyQualifiedName: helper.getPaymentFQN(context)} )
  	           .then(function(paymentSettings) {
      		       return self.getConfig(context, paymentSettings);
    	});
	},
	getConfig: function(context, paymentSettings) {
		var orderProcessing = helper.getValue(paymentSettings, paymentConstants.ORDERPROCESSING);
        var captureOnAuthorize = (orderProcessing == paymentConstants.CAPTUREONSUBMIT);
        var affirmConfig =  context.getSecureAppData('affirmConfig');

		//TODO it's always null - revisit
		//if (!affirmConfig) return {};

        var environment = helper.getValue(paymentSettings, paymentConstants.ENVIRONMENT) ;
        var config = {
                        "isSandbox" : (environment === "sandbox"),
                        "environment" : environment,
                        "publicapikey" : helper.getValue(paymentSettings, paymentConstants.PUBLIC_API_KEY),
                        "privateapikey" : helper.getValue(paymentSettings, paymentConstants.PRIVATE_API_KEY),
                        "threshold" : helper.getValue(paymentSettings, paymentConstants.THRESHOLD),
                        "scriptUrl" : 'https://cdn1-sandbox.affirm.com/js/v2/affirm.js',
                        "apiUrl" : 'https://sandbox.affirm.com/api/v2/',
                        "orderProcessing" : helper.getValue(paymentSettings, paymentConstants.ORDERPROCESSING),
                        "captureOnAuthorize": captureOnAuthorize,
                        "isEnabled": paymentSettings.isEnabled
            };

    	return config;
	},
    validatePaymentSettings: function(context, callback) {
        var self = this;
        var paymentSettings = context.request.body;

        var pwaSettings = _.findWhere( paymentSettings.ExternalPaymentWorkflowDefinitions, { FullyQualifiedName : helper.getPaymentFQN( context ) } );
        if (!pwaSettings || !pwaSettings.IsEnabled) callback();

        var config = self.getConfig(context, pwaSettings);
        if ( !config.publicapikey ) {
            callback("Pay With Affirm - Public API KEY not found.");
            return;
        }

        if ( !config.environment ){
            callback("Pay With Affirm - Environment fields are required.");
            return;
        }

		//TODO: validate values
		callback();
	},
	getInteractionByStatus: function (interactions, status) {
        return _.find(interactions, function(interaction){
            return interaction.status == status;
	  } );
	},
	processPaymentResult: function(context,paymentResult, paymentAction, payment) {
	    var interactionType = "";
	    var isManual = false;

	    if (paymentAction.manualGatewayInteraction)
	      isManual = true;

        //console.log('0. processPaymentResult', paymentAction, paymentResult);
        console.log('0. processPaymentResult', paymentAction.actionName );
	    switch(paymentAction.actionName) {
	            case "VoidPayment":
	               interactionType = "Void";
	               break;
	            case "CreatePayment":
	            case "AuthorizePayment":
	              interactionType = "Authorization";
	              break;
	            case "CapturePayment":
	              interactionType = "Capture";
	              break;
	            case "CreditPayment":
	              interactionType = "Credit";
	              break;
	            case "DeclinePayment":
	              interactionType = "Decline";
	              break;
	            case "RollbackPayment":
	              interactionType = "Rollback";
	              break;
	            default:
	              interactionType = "";
	              break;
	          }

	    if (paymentResult.status == paymentConstants.NEW){
	           context.exec.setPaymentAmountRequested(paymentAction.amount);
        }
	    var interaction  =  {status: paymentResult.status, interactionType: interactionType};
	    if (paymentResult.amount)
	      interaction.amount = paymentResult.amount;

	    if (paymentResult.affirmTransactionId)
	      interaction.gatewayTransactionId = paymentResult.affirmTransactionId;

	    if (paymentResult.responseText)
	      interaction.gatewayResponseText= paymentResult.responseText;

	    if (paymentResult.responseCode)
	      interaction.gatewayResponseCode= paymentResult.responseCode;

	    interaction.isManual = isManual;
	    console.log('3. processPaymentResult', interaction);

	    context.exec.addPaymentInteraction(interaction);
	    if (paymentResult.captureOnAuthorize) {
            console.log('4. processPaymentResult', paymentResult.captureOnAuthorize);
            interaction.gatewayTransactionId = paymentResult.captureId;
            interaction.status = paymentConstants.CAPTURED;
            console.log('4.1 processPaymentResult - CAPTURED');
            context.exec.addPaymentInteraction(interaction);
            console.log('4.2 processPaymentResult');
	    }

	    if (paymentResult.status == paymentConstants.CREDITPENDING){
            console.log('5. processPaymentResult - CREDITPENDING');
            context.exec.setPaymentAmountCredited(paymentResult.amount);
      }
        if (paymentResult.status == paymentConstants.CAPTURED){
            console.log('6. processPaymentResult - CAPTURED');
            context.exec.setPaymentAmountCollected(paymentResult.amount);
      }
	},
	createNewPayment : function(context,config, paymentAction, payment) {
		return { status : paymentConstants.NEW, amount: paymentAction.amount};
	},
	authorizePayment: function(context, captureOnAuthorize, paymentAction, payment) {
        return {
              affirmTransactionId: payment.externalTransactionId,
              captureId: null,
              responseCode: 200,
              responseText:  'authorized',
              status: paymentConstants.AUTHORIZED,
              amount: payment.amountRequested,
              captureOnAuthorize: captureOnAuthorize
            };

	},
	confirmAndAuthorize: function (context, config, paymentAction, payment) {
		console.log( 'confirmAndAuthorize', paymentAction, payment );
		var  self = this;
		try {
			affirmPay.configure(config);
	  		var newPayment = this.createNewPayment(context, config, paymentAction, payment);
            if (newPayment.status == paymentConstants.FAILED) {
                result.status = paymentConstants.DECLINED;
                return result;
            }
            return this.authorizePayment(context, config.captureOnAuthorize, paymentAction, payment);
  		} catch(e) {
  			console.error(e);
  			return {status : paymentConstants.DECLINED, responseText: e};
  		}
	},
	captureAmount: function (context, config, paymentAction, payment) {
        // get payment config
        return this.getPaymentConfig( context ).then( function( config ) {
            return helper.getOrderDetails( context, payment.orderId ).then( function( orderDetails ) {
                // capture the payment
                return affirmPay.capturePayment( { chargeId: payment.externalTransactionId, orderId: orderDetails.orderId }, config ).then( function( affirmResponse ){
                        return {
                          status : paymentConstants.CAPTURED,
                          affirmTransactionId: affirmResponse.transaction_id,
                          responseText: 'Captured Amount: ' + affirmResponse.currency + ' ' + affirmResponse.amount / 100,
                          responseCode: 200,
                          amount: paymentAction.amount
                        };
                    }, function( error ){
                        console.log( 'Validate Affirm error', error );
                        return { status: paymentConstants.FAILED, responseText: error.message, responseCode: error.status_code };
                });
            }).catch(function(err) {
    			console.error(err);
    			return { status : paymentConstants.FAILED, responseText: err };
    		});
        });
    },
    creditPayment: function (context, config, paymentAction, payment) {
        console.log('0. refundPayment');
        // get payment config
        return this.getPaymentConfig( context ).then( function( config ) {
            console.log('1. refundPayment');
            return helper.getOrderDetails( context, payment.orderId ).then( function( orderDetails ) {
                console.log('2. refundPayment');
                // capture the payment
                return affirmPay.refundPayment( { chargeId: payment.externalTransactionId, orderId: orderDetails.orderId }, config ).then( function( affirmResponse ){
                    console.log('3. refundPayment - affirmResponse', affirmResponse );
                    return {
                          status : paymentConstants.CREDITED,
                          affirmTransactionId: affirmResponse.transaction_id,
                          responseText: 'refunded Amount: ' + affirmResponse.amount / 100,
                          responseCode: 200,
                          amount: paymentAction.amount
                        };
                    }, function( error ){
                        console.log( 'Validate Affirm error', error );
                        return { status: paymentConstants.FAILED, responseText: error.message, responseCode: error.status_code };
                });
            }).catch(function(err) {
                console.error( err );
                return { status : paymentConstants.FAILED, responseText: err };
            });
        });
	},
	voidPayment : function (context, config, paymentAction, payment) {
		console.log('voidPayment');
		var self = this;
		affirmPay.configure(config);
	  //var promise = new Promise(function(resolve, reject) {
	    if (paymentAction.manualGatewayInteraction) {
	          console.log("Manual void...dont send to affirm");
	          return {amount: paymentAction.amount,gatewayResponseCode:  "OK", status: paymentConstants.VOIDED,
	                  awsTransactionId: paymentAction.manualGatewayInteraction.gatewayInteractionId};
	    }

	    var capturedInteraction = self.getInteractionByStatus(payment.interactions,paymentConstants.CAPTURED);
	    console.log("Void Payment - Captured interaction", capturedInteraction);
	    if (capturedInteraction) {
	      return {status : paymentConstants.FAILED, responseCode: "InvalidRequest", responseText: "Payment with captures cannot be voided. Please issue a refund"};
	    }

	    var authorizedInteraction = self.getInteractionByStatus(payment.interactions,paymentConstants.AUTHORIZED);
	    if (!authorizedInteraction)
	      return {status: paymentConstants.VOIDED};

	    return affirmPay.cancelOrder(payment.externalTransactionId).then(function(result) {
	      console.log("Affirm cancel result", result);
	      return {status: paymentConstants.VOIDED, amount: paymentAction.amount};
	    }, function(err){
	       console.error("Affirm cancel failed", err);
	        return {status: paymentConstants.FAILED,responseText: err.message,responseCode: err.code};
	    }).catch(function(err) {
			console.error(err);
			return { status : paymentConstants.FAILED, responseText: err};
		});

	  //});
	  //return promise;
	},
	declinePayment: function (context, config, paymentAction, payment) {
		console.log('declinePayment');
		var self = this;
	    if (paymentAction.manualGatewayInteraction) {
	          console.log("Manual decline...dont send to affirm");
	          return {amount: paymentAction.amount,gatewayResponseCode:  "OK", status: paymentConstants.DECLINED,
	                  awsTransactionId: paymentAction.manualGatewayInteraction.gatewayInteractionId};
	    }
	    var capturedInteraction = getInteractionByStatus(payment.interactions, paymentConstants.CAPTURED);
	    if (capturedInteraction) {
	      console.log("Capture found for payment, cannot decline");
	      return {status: paymentConstants.FAILED, responseCode: "InvalidRequest", responseText: "Payment with captures cannot be declined"};
	    }

		affirmPay.configure(config);
	    return affirmPay.cancelOrder(payment.externalTransactionId).then(function(result){
	      console.log(result);
	      return {status:paymentConstants.DECLINED};
	    }, function(err) {
	      console.error(err);
	      return {status:paymentConstants.FAILED, responseText: err.message, responseCode: err.code};
	    });
	}



};
