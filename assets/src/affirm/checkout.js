var url = require("url");
var qs = require("querystring");
var _ = require("underscore");
var Guid = require('guid');
var affirmPay = require("./affirmpaysdk")();
var constants = require("mozu-node-sdk/constants");
var paymentConstants = require("./constants");
var orderClient = require("mozu-node-sdk/clients/commerce/order")();
var cartClient = require("mozu-node-sdk/clients/commerce/cart")();
var FulfillmentInfoClient = require('mozu-node-sdk/clients/commerce/orders/fulfillmentInfo')();
var helper = require("./helper");
var OrderResourceFactory = require('mozu-node-sdk/clients/commerce/order');
var OrderPayment = require('mozu-node-sdk/clients/commerce/orders/payment');
var paymentHelper = require("./paymentHelper");

// TODO: Should we add fulfillmentInfo?

module.exports = function(context, callback) {
    var self = this;
    self.ctx = context;
    self.cb = callback;

    self.validateUserSession = function() {
        var user = self.ctx.items.pageContext.user;
        if ( !user.isAnonymous && !user.IsAuthenticated ){
            self.ctx.response.redirect('/user/login?returnUrl=' + encodeURIComponent(context.request.url));
            return context.response.end();
        }
    };

    // Process Affirm payment interactions
    self.processPayment = function() {
        var paymentAction = self.ctx.get.paymentAction();
        var payment = self.ctx.get.payment();

        if (payment.paymentType !== paymentConstants.PAYMENTSETTINGID) {
            console.log('Not an Affirm type');
            return self.cb();
        }

        if ( !payment.externalTransactionId && payment.billingInfo ){
            payment.externalTransactionId = payment.billingInfo.externalTransactionId;
        }

        if ( self.ctx.configuration && self.ctx.configuration.payment )
            declineCapture =  self.ctx.configuration.payment.declineCapture === true;

        try {
            console.log('Processing payment action', paymentAction.actionName);

            // get Payment config
            return paymentHelper.getPaymentConfig( self.ctx ).then( function( config ) {

                // excecute proper action due to the actionName
                switch( paymentAction.actionName ) {
                    case "CreatePayment":
                        console.log("adding new payment interaction for ", paymentAction.externalTransactionId);
                        //Add Details
                        return paymentHelper.createNewPayment(self.ctx, config, paymentAction, payment);
                    case "VoidPayment":
                        console.log("Voiding payment interaction for ", payment.externalTransactionId);
                        //console.log("Void Payment", payment.id);
                        return paymentHelper.voidPayment(self.ctx, config, paymentAction, payment);
                    case "AuthorizePayment":
                        console.log("Authorizing payment for ", payment.externalTransactionId);
                        return paymentHelper.confirmAndAuthorize(self.ctx, config, paymentAction, payment);
                    case "CapturePayment":
                        console.log("Capture payment for ", payment.externalTransactionId);
                        return paymentHelper.captureAmount(self.ctx, config, paymentAction, payment);
                    case "CreditPayment":
                        console.log("Crediting payment for ", payment.externalTransactionId);
                        return paymentHelper.creditPayment(self.ctx, config, paymentAction, payment);
                    case "DeclinePayment":
                        console.log("Decline payment for ",payment.externalTransactionId);
                        return paymentHelper.declinePayment(self.ctx, config, paymentAction, payment);
                    default:
                        return {status: paymentConstants.FAILED,responseText: "Not implemented", responseCode: "NOTIMPLEMENTED"};
                }
            }).then( function( paymentResult ) {
                console.log('Processing payment Result:', paymentResult);
                paymentHelper.processPaymentResult( self.ctx, paymentResult, paymentAction );
                self.cb();
            }).catch( function( err ){
                console.error(err);
                self.ctx.exec.addPaymentInteraction( { status: paymentConstants.FAILED, gatewayResponseText: err} );
                self.cb(err);
            }).catch(function(err) {
                console.error(err);
                self.cb(err);
            });

        } catch(e) {
            console.error(e);
            self.cb(e);
        }
};


    // Close the order KiboNG, and then capture the Payment
    self.closeOrder = function() {
        try{
            // parse response to get the token
            var params = affirmPay.getToken( self.ctx );

            if( !( params.checkout_token && params.id ) ){
                var err = 'Affirm Token not present';
                console.error( err );
                self.ctx.response.redirect( '/checkout/' + params.id );
                self.ctx.cache.request.set("Error", err);
                return self.ctx.response.end();
            }


            // get order by orderId
            helper.createClientFromContext( OrderResourceFactory, self.ctx, true ).getOrder( { orderId: params.id } ).then( function( mzOrder ){

                if( mzOrder.availableActions.indexOf( 'SubmitOrder' ) < 0 ){
                    var err = 'Can NOT Submit order';
                    console.error( err );
                    self.ctx.response.redirect( '/checkout/' + mzOrder.id );
                    self.ctx.cache.request.set("Error", err);
                    return self.ctx.response.end();
                }

                //capture the payment
                paymentHelper.getPaymentConfig( self.ctx ).then( function( config ) {
                    affirmPay.capturePayment( params, config ).then( function( result ){
                        // once the payment is captured, Submit the Order
                        OrderResourceFactory( self.ctx ).performOrderAction( { actionName: 'SubmitOrder', orderId: mzOrder.id } ).then( function( result ){

                            if( result.Error ){
                                // Submit order failed
                                console.log('3.1 Redirect to error', result );
                                self.ctx.response.redirect( '/checkout/' + mzOrder.id );
                                self.ctx.cache.request.set("Error", result);
                                return self.ctx.response.end();
                            }
                            else{
                                // Order Submit
                                self.ctx.response.redirect( '/checkout/' + mzOrder.id + '/confirmation');
                                return self.ctx.response.end();
                            }
                        },
                        function( error ){
                            // Submit order failed
                            console.error("2.1 Order Submit error", error);
                            self.ctx.cache.request.set("Error", error);
                            helper.addErrorToModel( self.ctx, self.cb, error);
                            self.ctx.response.redirect( '/checkout/' + mzOrder.id );
                            return self.ctx.response.end();
                        });

                    },
                    function( error ){
                            console.error("4.1 AFFIRM error", error);
                            self.ctx.cache.request.set("Error", error);
                            helper.addErrorToModel( self.ctx, self.cb, error);
                            self.ctx.response.redirect( '/checkout/' + mzOrder.id );
                            return self.ctx.response.end();
                    });
                });
            }
        );
    } catch(e) {
        console.error(e);
        self.ctx.response.redirect( '/checkout' );
        self.ctx.cache.request.set("Error", e);
        return self.ctx.response.end();
    }
  };


  self.setError = function(context, callback, error) {
    console.log(err);
    context.cache.request.set("affirmError", err);
    callback();
  };
};
