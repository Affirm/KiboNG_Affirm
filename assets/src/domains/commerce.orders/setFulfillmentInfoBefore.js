/**
 * Implementation for http.storefront.pages.global.request.before
 * This function will receive the following context object:

{
  &#34;type&#34;: &#34;mozu.actions.context.http&#34;
}

 */


var AffirmCheckout = require("../../affirm/checkout");

module.exports = function(context, callback) {

	try {
		//console.log(context.request.params);
		var affirmCheckout = new AffirmCheckout(context, callback);
	    affirmCheckout.addFulfillmentInfo();
    } catch(e) {
	   callback(e);
	}

};
