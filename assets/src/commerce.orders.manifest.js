module.exports = {
  'processOrderActionAfter': {
      actionName: 'embedded.commerce.orders.action.after',
      customFunction: require('./domains/commerce.orders/processOrderActionAfter')
  }
};
