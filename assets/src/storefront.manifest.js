module.exports = {
  'affirmProcessor': {
      actionName: 'http.storefront.routes',
      customFunction: require('./domains/storefront/affirmProcessor')
  }
};
/*
module.exports = {
  'affirmCheckoutAfter': {
      actionName: 'http.storefront.pages.checkout.request.after',
      customFunction: require('./domains/storefront/affirmCheckoutAfter')
  }
};module.exports = {

  'affirmCartBefore': {
      actionName: 'http.storefront.pages.cart.request.before',
      customFunction: require('./domains/storefront/affirmCartBefore')
  },

  'affirmCartAfter': {
      actionName: 'http.storefront.pages.cart.request.after',
      customFunction: require('./domains/storefront/affirmCartAfter')
  },

  'affirmCheckoutBefore': {
      actionName: 'http.storefront.pages.checkout.request.before',
      customFunction: require('./domains/storefront/affirmCheckoutBefore')
  },

  'affirmCheckoutAfter': {
      actionName: 'http.storefront.pages.checkout.request.after',
      customFunction: require('./domains/storefront/affirmCheckoutAfter')
  }
};
  */
