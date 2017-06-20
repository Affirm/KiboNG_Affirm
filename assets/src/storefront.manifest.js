module.exports = {
  'affirmCartAfter': {
    actionName: 'http.storefront.pages.cart.request.after',
    customFunction: require('./domains/storefront/affirmCartAfter')
    },
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
  },
  'affirmCartAfter': {
      actionName: 'http.storefront.pages.cart.request.after',
      customFunction: require('./domains/storefront/affirmCartAfter')
  },
}
*/
