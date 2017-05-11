module.exports = {
  
  'embedded.commerce.orders.createFromCart.after': {
      actionName: 'embedded.commerce.orders.createFromCart.after',
      customFunction: require('./domains/commerce.orders/embedded.commerce.orders.createFromCart.after')
  },
  
  'http.commerce.orders.setFulFillmentInfo.after': {
      actionName: 'http.commerce.orders.setFulFillmentInfo.after',
      customFunction: require('./domains/commerce.orders/http.commerce.orders.setFulFillmentInfo.after')
  }
};
