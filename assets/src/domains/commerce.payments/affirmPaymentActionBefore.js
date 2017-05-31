/**
 * Implementation for embedded.commerce.payments.action.before

 * This custom function will receive the following context object:
{
  "exec": {
    "setActionAmount": {
      "parameters": [
        {
          "name": "amount",
          "type": "number"
        }
      ],
      "return": {
        "type": "mozu.commerceRuntime.contracts.payments.paymentAction"
      }
    },
    "setPaymentData": {
      "parameters": [
        {
          "name": "key",
          "type": "string"
        },
        {
          "name": "value",
          "type": "object"
        }
      ]
    },
    "removePaymentData": {
      "parameters": [
        {
          "name": "key",
          "type": "string"
        }
      ]
    },
    "setActionPreAuthFlag": {
      "parameters": [
        {
          "name": "isPreAuth",
          "type": "bool"
        }
      ]
    }
  },
  "get": {
    "payment": {
      "parameters": [],
      "return": {
        "type": "mozu.commerceRuntime.contracts.payments.payment"
      }
    },
    "paymentAction": {
      "parameters": [],
      "return": {
        "type": "mozu.commerceRuntime.contracts.payments.paymentAction"
      }
    }
  }
}


 */

 var paymentConstants = require("../../affirm/constants");
 var AffirmCheckout = require("../../affirm/checkout");
 var _ = require("underscore");

module.exports = function(context, callback) {
    var payment = context.get.payment();
    var paymentAction = context.get.paymentAction();
    console.log('0. affirmPaymentActionBefore', payment, payment.data, paymentAction);
    if (payment.paymentType !== paymentConstants.PAYMENTSETTINGID  && payment.paymentWorkflow !== paymentConstants.PAYMENTSETTINGID){
        console.log('0.1 affirmPaymentActionBefore return' );
        callback();
    }
    var order = context.get.order();

    console.log('1. affirmPaymentActionBefore - COLECT order INFO', order);

    var existingPayment = getPayment(order, "Collected");

    console.log('2. affirmPaymentActionBefore - existingPayment', existingPayment);

    var billingInfo = context.get.payment().billingInfo;
    if (existingPayment) {
        console.log('3. affirmPaymentActionBefore - existingPayment');
        //billingInfo.externalTransactionId = existingPayment.externalTransactionId;
        billingInfo.data = existingPayment.data;
        //context.exec.setExternalTransactionId(billingInfo.externalTransactionId);
        updateBillingInfo(context, callback, billingInfo);
    } else {
        console.log('4. affirmPaymentActionBefore - NON existingPayment');

        try {
             var newPayment = getPayment(order, "New");
             console.log('5. affirmPaymentActionBefore ', newPayment, paymentAction.actionName);
            //if (newPayment)

            //context.exec.removePaymentData("awsData");
            //context.exec.setPaymentData( "paypal",existingPayment.billingInfo.data.paypal);
            updateBillingInfo(context, callback, billingInfo);
            /*if (awsReferenceId && paymentAction.actionName === "CreatePayment") {
                var affirmCheckout = new AffirmCheckout(context, callback);

                affirmCheckout.validateAffirmOrder(awsReferenceId).then(function() {
                    affirmCheckout.getBillingInfo(awsReferenceId, billingInfo.billingContact,context)
                    .then(function(billingContact) {
                        billingInfo.billingContact = billingContact;
                        billingInfo.externalTransactionId = context.get.payment().externalTransactionId;
                        context.exec.removePaymentData("awsData");
                        updateBillingInfo(context, callback, billingInfo);
                    });
                });
            } else {
                updateBillingInfo(context, callback, billingInfo);
            }
            */
         } catch(e) {
             console.error("Affirm payment before", e);
             callback(e);
         }
 }
};


function getPayment(order, status) {
     return _.find(order.payments,function(payment) {
                                        return payment.paymentType === paymentConstants.PAYMENTSETTINGID  &&
                                                payment.paymentWorkflow === paymentConstants.PAYMENTSETTINGID &&
                                                payment.status === status;   });
}


function updateBillingInfo(context, callback, billingInfo) {
    context.exec.setBillingInfo(billingInfo);
     callback();
}