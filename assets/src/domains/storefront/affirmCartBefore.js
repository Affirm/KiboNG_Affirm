/**
 * Implementation for http.storefront.pages.cart.request.before


 * HTTP Actions all receive a similar context object that includes
 * `request` and `response` objects. These objects are similar to
 * http.IncomingMessage objects in NodeJS.

{
  configuration: {},
  request: http.ClientRequest,
  response: http.ClientResponse
}

 * Call `response.end()` to end the response early.
 * Call `response.set(headerName)` to set an HTTP header for the response.
 * `request.headers` is an object containing the HTTP headers for the request.
 *
 * The `request` and `response` objects are both Streams and you can read
 * data out of them the way that you would in Node.

 */

 var AffirmCheckout = require("../../affirm/checkout");


module.exports = function(context, callback) {
   	var affirmCheckout = new AffirmCheckout(context, callback);
    affirmCheckout.validateAndProcess().then(callback, function(e){
      affirmCheckout.setError(context, callback,e);
    }).catch(function(e){
      affirmCheckout.setError(context, callback.e);
    });
};
