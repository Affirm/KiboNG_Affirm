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
		      .getThirdPartyPaymentWorkflowWithValues( { fullyQualifiedName: helper.getPaymentFQN(context) } )
  	           .then( function( paymentSettings ) {
      		       return self.getConfig( context, paymentSettings );
    	});
	},
	getConfig: function(context, paymentSettings) {
		var orderProcessing = helper.getValue(paymentSettings, paymentConstants.ORDERPROCESSING);
        var captureOnAuthorize = (orderProcessing == paymentConstants.CAPTUREONSUBMIT);
        var affirmConfig =  context.getSecureAppData('affirmConfig');

        var environment = helper.getValue(paymentSettings, paymentConstants.ENVIRONMENT) ;
        var config = {
                        "isSandbox" : (environment === "sandbox"),
                        "environment" : environment,
                        "publicapikey" : helper.getValue(paymentSettings, paymentConstants.PUBLIC_API_KEY),
                        "privateapikey" : helper.getValue(paymentSettings, paymentConstants.PRIVATE_API_KEY),
                        "threshold" : helper.getValue(paymentSettings, paymentConstants.THRESHOLD),
                        "promoId" : helper.getValue(paymentSettings, paymentConstants.PROMO_ID),
                        "financingProgram" : helper.getValue(paymentSettings, paymentConstants.FINANCING_PROGRAM),
                        "scriptUrl" : ( environment === "sandbox" ) ? 'https://cdn1-sandbox.affirm.com/js/v2/affirm.js' : 'https://cdn1.affirm.com/js/v2/affirm.js',
                        "apiUrl" : ( environment === "sandbox" ) ? 'https://sandbox.affirm.com/api/v2/' : 'https://api.affirm.com/api/v2/',
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

        if ( !config.privateapikey ) {
            callback("Pay With Affirm - Private API KEY not found.");
            return;
        }

        if ( !config.threshold ) {
            callback("Pay With Affirm - Affirm Amount Threshold not found.");
            return;
        }
        else{
            if( !new RegExp(/^\d+$/).test( config.threshold ) ){
                callback("Pay With Affirm - Affirm Amount Threshold is not a number. Current Value: " + config.threshold );
                return;
            }
        }

        if ( !config.environment ){
            callback("Pay With Affirm - Environment fields are required.");
            return;
        }

		// all good
		callback();
	},
	getInteractionByStatus: function ( interactions, status ) {
        return _.find( interactions, function( interaction ){
            return interaction.status == status;
	  } );
	},
	processPaymentResult: function(context,paymentResult, paymentAction, payment) {
	    var interactionType = "";
	    var isManual = false;

	    if (paymentAction.manualGatewayInteraction)
	      isManual = true;

        console.log('Process Payment Action', paymentAction.actionName );
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

	    context.exec.addPaymentInteraction(interaction);
	    if (paymentResult.captureOnAuthorize) {
            interaction.gatewayTransactionId = paymentResult.captureId;
            interaction.status = paymentConstants.CAPTURED;
            context.exec.addPaymentInteraction(interaction);
	    }

	    if (paymentResult.status == paymentConstants.CREDITPENDING){
            context.exec.setPaymentAmountCredited(paymentResult.amount);
      }
        if (paymentResult.status == paymentConstants.CAPTURED){
            context.exec.setPaymentAmountCollected(paymentResult.amount);
      }
	},
    createNewPayment : function(context,config, paymentAction, payment) {
        return { status : paymentConstants.NEW, amount: paymentAction.amount};
    },
    authorizePayment: function(context, captureOnAuthorize, paymentAction, payment) {
        return {
            affirmTransactionId: payment.externalTransactionId,
            captureId: null, // is not pressent at this time
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
            /*affirmPay.configure(config);
            var newPayment = this.createNewPayment(context, config, paymentAction, payment);
            if (newPayment.status == paymentConstants.FAILED) {
                result.status = paymentConstants.DECLINED;
                return result;
            }
            */
            return this.authorizePayment(context, config.captureOnAuthorize, paymentAction, payment);
        } catch(e) {
            console.error(e);
            return {status : paymentConstants.DECLINED, responseText: e};
        }
    },
	captureAmount: function (context, config, paymentAction, payment) {
        var capturedInteraction = this.getInteractionByStatus( payment.interactions, paymentConstants.CAPTURED );
        console.log( "Captured Payment - Captured interaction repeated", capturedInteraction );
        if ( capturedInteraction ) {
            return {
              status : paymentConstants.FAILED,
              responseCode: "InvalidRequest",
              responseText: "Payment with captures cannot be captured twice. Please issue a refund"
            };
        }

        // Capture amount should be equal to the collected amount
        if( paymentAction.amount != payment.amountRequested ){
            console.error( 'Amount to capture should be equal to the order total' );
            return { status : paymentConstants.FAILED, responseText: 'Capture amount should be equal to the requestd order amount' };
        }

        // capture the payment
        return affirmPay.capturePayment( { chargeId: payment.externalTransactionId, orderId: payment.orderId }, config ).then( function( affirmResponse ){
                return {
                  status : paymentConstants.CAPTURED,
                  affirmTransactionId: affirmResponse.transaction_id,
                  responseText: 'Captured Amount: ' + affirmResponse.currency + ' ' + affirmResponse.amount / 100,
                  responseCode: 200,
                  amount: affirmResponse.amount / 100
                };
            }, function( error ){
                console.log( 'Validate Affirm error', error );
                return { status: paymentConstants.FAILED, responseText: error.message, responseCode: error.status_code };
        }).catch(function(err) {
            console.error( err );
            return { status : paymentConstants.FAILED, responseText: err };
        });
    },
    creditPayment: function (context, config, paymentAction, payment) {
        // Refund amount should be equal to the collected amount
        if( paymentAction.amount != payment.amountCollected ){
            console.error( 'Amount to refund should be equal to the ammount collected' );
            return { status : paymentConstants.FAILED, responseText: 'Refund amount should be equal to the collected amount' };
        }

        // all goog, refund the payment
        // capture the payment
        return affirmPay.refundPayment( { chargeId: payment.externalTransactionId, orderId: payment.orderId }, config ).then( function( affirmResponse ){
            return {
                  status : paymentConstants.CREDITED,
                  affirmTransactionId: affirmResponse.transaction_id,
                  responseText: 'Refunded Amount: ' + affirmResponse.amount / 100,
                  responseCode: 200,
                  amount: paymentAction.amount
                };
            }, function( error ){
                console.log( 'Validate Affirm error', error );
                return { status: paymentConstants.FAILED, responseText: error.message, responseCode: error.status_code };
        }).catch(function(err) {
            console.error( err );
            return { status : paymentConstants.FAILED, responseText: err };
        });
    },
    voidPayment : function (context, config, paymentAction, payment) {
        console.log( 'Voiding Payment', config );
        console.log( 'Voiding Payment', paymentAction );
        console.log( 'Voiding Payment', payment );

        var capturedInteraction = this.getInteractionByStatus( payment.interactions, paymentConstants.CAPTURED );
        console.log( "Void Payment - Captured interaction", capturedInteraction );
        if ( capturedInteraction ) {
            return {
              status : paymentConstants.FAILED,
              responseCode: "InvalidRequest",
              responseText: "Payment with captures cannot be voided. Please issue a refund"
            };
        }

        var authorizedInteraction = this.getInteractionByStatus( payment.interactions, paymentConstants.AUTHORIZED );
        if ( !authorizedInteraction ){
            return { status: paymentConstants.VOIDED };
        }

        // all goog, void the payment
        // void the payment
        return affirmPay.voidPayment( { chargeId: payment.externalTransactionId, orderId: payment.orderId }, config ).then( function( affirmResponse ){
            return {
                  status : paymentConstants.VOIDED,
                  affirmTransactionId: affirmResponse.transaction_id,
                  responseText: 'Voided Amount: ' + affirmResponse.amount / 100,
                  responseCode: 200,
                  amount: paymentAction.amount
                };
            }, function( error ){
                console.log( 'Validate Affirm error', error );
                return { status: paymentConstants.FAILED, responseText: error.message, responseCode: error.status_code };
        }).catch(function(err) {
            console.error( err );
            return { status : paymentConstants.FAILED, responseText: err };
        });
    },
    declinePayment: function (context, config, paymentAction, payment) {
        // TODO: implement Void payment into affirm
        console.log( 'DeclinePayment into affirm');
    }
};
