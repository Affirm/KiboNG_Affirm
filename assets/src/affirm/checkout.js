var _ = require("underscore");
var constants = require("mozu-node-sdk/constants");
var affirmPay = require("./affirmpaysdk")();
var paymentConstants = require("./constants");
var paymentHelper = require("./paymentHelper");
var helper = require("./helper");
var OrderResourceFactory = require('mozu-node-sdk/clients/commerce/order');
var OrderPaymentResourceFactory = require('mozu-node-sdk/clients/commerce/orders/payment');
var BillInfoResourceFactory = require('mozu-node-sdk/clients/commerce/orders/billinginfo');

var FulfillmentResourceFactory = require('mozu-node-sdk/clients/commerce/orders/fulfillmentAction');

// TODO: Should we add fulfillmentInfo?

module.exports = function(context, callback) {
    var self = this;
    self.ctx = context;
    self.cb = callback;

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

        if ( self.ctx.configuration && self.ctx.configuration.payment ){
            console.log( 'Decline Capture???' );
            declineCapture =  self.ctx.configuration.payment.declineCapture === true;
        }
        try {
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
                        return paymentHelper.voidPayment( self.ctx, config, paymentAction, payment ) ;
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
                paymentHelper.processPaymentResult( self.ctx, paymentResult, paymentAction, payment );
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
                if( params.affcancel && params.affcancel == '1' ){
                    err = 'Affirm Payment has been cancelled';
                }
                console.error( err );
                helper.setAffirmError( self.ctx, err );
                self.ctx.response.redirect( '/cart' );
                return self.ctx.response.end();
            }


            // get order by orderId
            helper.createClientFromContext( OrderResourceFactory, self.ctx, true ).getOrder( { orderId: params.id } ).then( function( mzOrder ){

                if( mzOrder && mzOrder.availableActions.indexOf( 'SubmitOrder' ) < 0 ){
                    var err = 'There is a problem to submit the order';
                    console.error( err );
                    helper.setAffirmError( self.ctx, err );
                    self.ctx.response.redirect( '/cart' );
                    return self.ctx.response.end();
                }

                //capture the payment
                return paymentHelper.getPaymentConfig( self.ctx ).then( function( config ) {
                    // authorize Affirm Payment
                    affirmPay.authorizePayment( params, config ).then( function( affirmResponse ){
                        // set externalTransactionId to referer affirm Loan ID
                        mzOrder.billingInfo.externalTransactionId = affirmResponse.id;
                        // update billingInfo
                        helper.createClientFromContext( BillInfoResourceFactory, self.ctx, true ).setBillingInfo( { orderId: params.id }, { body: mzOrder.billingInfo } ).then( function( billingResult ){
                            // once the payment is captured and billinginfo updated, Submit the Order
                            OrderResourceFactory( self.ctx ).performOrderAction( { actionName: 'SubmitOrder', orderId: mzOrder.id } ).then( function( orderResult ){

                                if( orderResult.Error ){
                                    // Submit order failed
                                    // TODO: void payment in affirm
                                    console.error( "Order Submit error Call", orderResult );
                                    helper.setAffirmError( self.ctx, orderResult.Error );
                                    self.ctx.response.redirect( '/cart' );
                                    return self.ctx.response.end();
                                }
                                else{
                                    console.log( "Order Submit Success" );
                                    self.ctx.response.redirect( '/checkout/' + mzOrder.id + '/confirmation');
                                    return self.ctx.response.end();
                                }
                            },
                            function( error ){
                                // Submit order failed
                                // TODO: void payment in affirm
                                console.error("Order Submit error", error);
                                helper.setAffirmError( self.ctx, 'There was a problem to submit the order' );
                                self.ctx.response.redirect( '/cart' );
                                return self.ctx.response.end();
                            });
                        });
                    },
                    function( error ){
                            // handle affirm response error
                            console.error( 'Affirm response error', error );
                            helper.setAffirmError( self.ctx, error);
                            self.ctx.response.redirect( '/cart' );
                            return self.ctx.response.end();
                    });
                });
            }
        );
    } catch(e) {
        console.error( 'Affirm Error', e);
        helper.setAffirmError( self.ctx, e);
        self.ctx.response.redirect( '/cart' );
        return self.ctx.response.end();
    }
  };

  // Validate the order status change in KiboNG, and then take care of the Affirm Payment if needed
  self.validateOrderStatusChanges = function() {
      try{
          var mzOrder = self.ctx.get.order();
          if ( mzOrder.status == "Errored" ) {
              var existingPayment = _.find( mzOrder.payments, function(payment) {
                  return payment.paymentType === paymentConstants.PAYMENTSETTINGID  &&
                  payment.paymentWorkflow === paymentConstants.PAYMENTSETTINGID;
              });
              if ( !existingPayment ) {
                  return self.cb();
              }
              console.log( 'existingPayment', existingPayment );
              var VoidPaymentParam =  {
                  orderId: mzOrder.id,
                  paymentId: existingPayment.id,
                  actionName: 'VoidPayment'
              };
              console.log("VoidPaymentParam", VoidPaymentParam );
              helper.createClientFromContext( OrderPaymentResourceFactory, self.ctx ).performPaymentAction( VoidPaymentParam );
              return self.cb();
          }
          else{
              return self.cb();
          }
      } catch( error ) {
          console.error( 'Affirm Order post process error', error);
          return self.cb( error );
      }
  };

};
