module.exports = {

  'embedded.commerce.payments.action.performPaymentInteraction': {
      actionName: 'embedded.commerce.payments.action.performPaymentInteraction',
      customFunction: require('./domains/commerce.payments/embedded.commerce.payments.action.performPaymentInteraction')
  },

  'affirmPaymentActionBefore': {
      actionName: 'embedded.commerce.payments.action.before',
      customFunction: require('./domains/commerce.payments/affirmPaymentActionBefore')
  }
};
