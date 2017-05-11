module.exports = {
  
  'http.commerce.returns.createReturnItem.before': {
      actionName: 'http.commerce.returns.createReturnItem.before',
      customFunction: require('./domains/commerce.return/http.commerce.returns.createReturnItem.before')
  }
};
