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
	    console.log('2. processPaymentResult', interaction, 'captureOnAuthorize: ' , paymentResult.captureOnAuthorize);

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
        // get payment config
        return this.getPaymentConfig( context ).then( function( config ) {
            return helper.getOrderDetails( context, payment.orderId ).then( function( orderDetails ) {
                // capture the payment
                return affirmPay.refundPayment( { chargeId: payment.externalTransactionId, orderId: orderDetails.orderId }, config ).then( function( affirmResponse ){
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
                });
            }).catch(function(err) {
                console.error( err );
                return { status : paymentConstants.FAILED, responseText: err };
            });
        });
	},
	voidPayment : function (context, config, paymentAction, payment) {
		// TODO: implement Void payment into affirm
        console.log( 'VoidPayment into affirm');
	},
	declinePayment: function (context, config, paymentAction, payment) {
        // TODO: implement Void payment into affirm
        console.log( 'DeclinePayment into affirm');
	}
};
