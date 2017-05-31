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
                        "apikeypair" : helper.getValue(paymentSettings, paymentConstants.API_KEY_PAIR_BASE64),
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
        console.log('1. validatePaymentSettings', pwaSettings);
        if (!pwaSettings || !pwaSettings.IsEnabled) callback();

        var config = self.getConfig(context, pwaSettings);
        if ( !config.publicapikey ) {
            callback("Pay With Affirm - Public API TEST KEY not found.");
            return;
        }

        if ( !config.environment){
            callback("Pay With Affirm - Environment fields are required.");
            return;
        }

		//TODO: validate values
		callback();
	},
	getInteractionByStatus: function (interactions, status) {
        console.log('getInteractionByStatus');
        return _.find(interactions, function(interaction){
            return interaction.status == status;
	  } );
	},
	processPaymentResult: function(context,paymentResult, paymentAction, payment) {
	    var interactionType = "";
	    var isManual = false;

        console.log('processPaymentResult', paymentAction.manualGatewayInteraction);
	    if (paymentAction.manualGatewayInteraction)
	      isManual = true;

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

        console.log('ACTION STATUS', paymentResult.status, paymentResult.amount);
	    if (paymentResult.status == paymentConstants.NEW){
            console.log('ACTION', paymentAction.amount);
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
	    console.log("Payment Action result", interaction);

	    context.exec.addPaymentInteraction(interaction);

	    if (paymentResult.captureOnAuthorize) {
	      interaction.gatewayTransactionId = paymentResult.captureId;
	      interaction.status = paymentConstants.CAPTURED;
	      context.exec.addPaymentInteraction(interaction);
	    }

	    if (paymentResult.status == paymentConstants.CREDITPENDING)
	      context.exec.setPaymentAmountCredited(paymentResult.amount);

	    if (paymentResult.status == paymentConstants.CAPTURED)
	      context.exec.setPaymentAmountCollected(paymentResult.amount);
	},
	createNewPayment : function(context,config, paymentAction, payment) {
		console.log('createNewPayment', paymentAction.amount);
		var newStatus = { status : paymentConstants.NEW, amount: paymentAction.amount};
		console.log(newStatus);
        return newStatus;
		/*if (paymentAction.amount === 0)
			return newStatus;

		//affirmPay.configure(config);
		console.log("config done");
		try {
			return helper.getOrderDetails(context,payment.orderId)
					.then(function(orderDetails) {
			  orderDetails.amount = paymentAction.amount;
			  orderDetails.currencyCode=  paymentAction.currencyCode;
			  console.log("Order Details", orderDetails);
			  return orderDetails;
			}).then(function(orderDetails){
        var existingPayment = _.find(orderDetails.payments,function(payment) { return payment.paymentType === paymentConstants.PAYMENTSETTINGID  && payment.paymentWorkflow === paymentConstants.PAYMENTSETTINGID && payment.status === "Collected";   });

        if (existingPayment) return newStatus;

        return affirmPay.setOrderDetails(paymentAction.externalTransactionId, orderDetails)
				.then(
				    function(result) {
				      return newStatus;
				    }, function(err) {
				      console.log("Affirm Create new payment Error", err);
				      return { status : paymentConstants.FAILED, responseText: err.message, responseCode: err.code};
				    });
			}).catch(function(err) {
				console.log(err);
				return { status : paymentConstants.FAILED, responseText: err};
			});
		} catch(e) {
			console.error(e);
			return { status : paymentConstants.FAILED, responseText: e};
		}
        */
	},
	authorizePayment: function(context, paymentAction, payment) {
		console.log('authorizePayment');
        //var config = this.getConfig(context, pwaSettings);
        //console.log('authorizePayment', config);
        return {
              affirmTransactionId: '',
              captureId: null,
              responseCode: 200,
              responseText:  'plaease capture the payment',//state,
              status: paymentConstants.AUTHORIZED,
              amount: payment.amountRequested,
              captureOnAuthorize: true //config.captureOnAuthorize
            };
        /*
		try {
			var declineAuth = false;
			if (context.configuration && context.configuration.payment)
		      declineAuth = context.configuration.payment.declineAuth === true;

			return affirmPay.confirmOrder(payment.externalTransactionId)
			.then(function() {
		        return affirmPay.requestAuthorzation(payment.externalTransactionId, payment.amountRequested,
		          paymentAction.currencyCode, payment.id, config.captureOnAuthorize, declineAuth)
		        .then(function(authResult) {
		          var authDetails = authResult.AuthorizeResponse.AuthorizeResult.AuthorizationDetails;
		          console.log("Authorize result",authDetails);
		          var state = authDetails.AuthorizationStatus.State;
		          var status = paymentConstants.DECLINED;
		          var awsTransactionId = authDetails.AffirmAuthorizationId;
		          var captureId = null;
		          if (state == "Open" || state == "Closed") status = paymentConstants.AUTHORIZED;
		          if (captureOnAuthorize) {
		            captureId = authDetails.IdList.member;
		          }

		          var response = {
		                awsTransactionId: awsTransactionId,
		                captureId: captureId,
		                responseCode: 200,
		                responseText:  state,
		                status: status,
		                amount: payment.amountRequested,
		                captureOnAuthorize: captureOnAuthorize
		              };
		          console.log("Repsonse", response);
		          return response;
		        }, function(err) {
		          console.error(err);
		          return {status : paymentConstants.DECLINED, responseCode: err.code, responseText: err.message};
		        });
			}).catch(function(err) {
				console.error("err", err);
				return { status : paymentConstants.DECLINED, responseText: err.message};
			});
		} catch(e) {
			console.error("exception", e);
  			return {status : paymentConstants.DECLINED, responseText: e};
		}
        */
	},
	confirmAndAuthorize: function (context, config, paymentAction, payment) {
		console.log('confirmAndAuthorize');
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
		console.log('captureAmount');
		var self = this;
		affirmPay.configure(config);
		var declineCapture = false;
		if (context.configuration && context.configuration.payment)
			declineCapture =  context.configuration.payment.declineCapture === true;

		return helper.getOrderDetails(context, payment.orderId).then(function(orderDetails) {
			orderDetails.requestedAmount = payment.requestedAmount;
			orderDetails.captureAmount= paymentAction.amount;
			orderDetails.currencyCode= paymentAction.currencyCode;


			console.log("Order details", orderDetails);

			if (paymentAction.manualGatewayInteraction) {
			    console.log("Manual capture...dont send to affirm");
			    return {amount: paymentAction.amount,gatewayResponseCode:  "OK", status: paymentConstants.CAPTURED,
			            awsTransactionId: paymentAction.manualGatewayInteraction.gatewayInteractionId};
			}

			var interactions = payment.interactions;

			var paymentAuthorizationInteraction = self.getInteractionByStatus(interactions, paymentConstants.AUTHORIZED);

			console.log("Authorized interaction",paymentAuthorizationInteraction );
			if (!paymentAuthorizationInteraction) {
			  console.log("interactions", interactions);
			  return {status : paymentConstants.FAILED,
			          responseText: "Affirm Authorization Id not found in payment interactions",
			          responseCode: 500};
			}

			return affirmPay.captureAmount(paymentAuthorizationInteraction.gatewayTransactionId, orderDetails,
			                                helper.getUniqueId() ,declineCapture)
			  .then(function(captureResult){
			      console.log("AWS Capture Result", captureResult);
			      var captureDetails = captureResult.CaptureResponse.CaptureResult.CaptureDetails;
			      var state = captureDetails.CaptureStatus.State;
			      var captureId = captureDetails.AffirmCaptureId;

			      var response = {
			        status : (state == "Completed" ? paymentConstants.CAPTURED : paymentConstants.FAILED),
			        awsTransactionId: captureId,
			        responseText: state,
			        responseCode: 200,
			        amount: orderDetails.captureAmount
			      };

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
