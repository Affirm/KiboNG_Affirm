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
}
*/
