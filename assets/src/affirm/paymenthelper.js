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
        console.log( 'validatePaymentSettings' );
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

        console.log('0. processPaymentResult', paymentAction, paymentResult);
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

	    if (paymentResult.awsTransactionId)
	      interaction.gatewayTransactionId = paymentResult.awsTransactionId;

	    if (paymentResult.responseText)
	      interaction.gatewayResponseText= paymentResult.responseText;

	    if (paymentResult.responseCode)
	      interaction.gatewayResponseCode= paymentResult.responseCode;

	    interaction.isManual = isManual;
	    console.log('3. processPaymentResult', interaction);

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
	authorizePayment: function(context, paymentAction, payment) {
        return {
              affirmTransactionId: '',
              captureId: null,
              responseCode: 200,
              responseText:  'plaease capture the payment',//state,
              status: paymentConstants.AUTHORIZED,
              amount: payment.amountRequested,
              captureOnAuthorize: true //config.captureOnAuthorize
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
            return this.authorizePayment(context, paymentAction, payment);
  		} catch(e) {
  			console.error(e);
  			return {status : paymentConstants.DECLINED, responseText: e};
  		}
	},
	captureAmount: function (context, config, paymentAction, payment) {
        console.log( 'captureAmount', paymentAction, payment );
        var response = {
          status : (state == "Completed" ? paymentConstants.CAPTURED : paymentConstants.FAILED),
          awsTransactionId: captureId,
          responseText: state,
          responseCode: 200,
          amount: orderDetails.captureAmount
        };

        return response;

	},
	creditPayment: function (context, config, paymentAction, payment) {
		console.log('creditPayment');
		var self = this;
		affirmPay.configure(config);
		return helper.getOrderDetails(context,payment.orderId).then(function(orderDetails) {
			var capturedInteraction = self.getInteractionByStatus(payment.interactions,paymentConstants.CAPTURED);
			console.log("AWS Refund, previous capturedInteraction", capturedInteraction);
			if (!capturedInteraction) {
				return {status : paymentConstants.FAILED, responseCode: "InvalidRequest", responseText: "Payment has not been captured to issue refund"};
			}

			if (paymentAction.manualGatewayInteraction) {
				console.log("Manual credit...dont send to affirm");
				return {amount: paymentAction.amount,gatewayResponseCode:  "OK", status: paymentConstants.CREDITED,
				        awsTransactionId: paymentAction.manualGatewayInteraction.gatewayInteractionId};
			}

			orderDetails.amount = paymentAction.amount;
			orderDetails.currencyCode = paymentAction.currencyCode;
			orderDetails.note = paymentAction.reason;
			orderDetails.id = helper.getUniqueId();


			console.log("Refund details", orderDetails);
			return affirmPay.refund(capturedInteraction.gatewayTransactionId, orderDetails).then(
			function(refundResult) {
				var refundDetails = refundResult.RefundResponse.RefundResult.RefundDetails;
				console.log("AWS Refund result", refundDetails);
				var state = refundDetails.RefundStatus.State;
				var refundId = refundDetails.AffirmRefundId;

				var response = {
					status : ( state == "Pending" ? paymentConstants.CREDITPENDING : (state == "Completed" ? paymentConstants.CREDITED : paymentConstants.FAILED)),
					awsTransactionId: refundId,
					responseText: state,
					responseCode: 200,
					amount: paymentAction.amount
				};
				console.log("Refund response", response);
				return response;
			}, function(err) {
				console.error("Capture Error", err);
				return {status : paymentConstants.FAILED,
				        responseText: err.message,
				    responseCode: err.code};
			});
		}).catch(function(err) {
			console.error(err);
			return { status : paymentConstants.FAILED, responseText: err};
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
