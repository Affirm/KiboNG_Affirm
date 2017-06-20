
var getAppInfo = require('mozu-action-helpers/get-app-info');
var url = require("url");
var qs = require("querystring");
var _ = require("underscore");
var constants = require("mozu-node-sdk/constants");
var paymentConstants = require("./constants");
var GeneralSettings = require('mozu-node-sdk/clients/commerce/settings/generalSettings');

var Order = require("mozu-node-sdk/clients/commerce/order");
var Guid = require('guid');


var helper = module.exports = {
    createClientFromContext: function (client, context, removeClaims) {
        var c = client(context);
        if (removeClaims)
            c.context[constants.headers.USERCLAIMS] = null;
        return c;
    },
    getPaymentFQN: function(context) {
        var appInfo = getAppInfo(context);
        return appInfo.namespace+"~"+paymentConstants.PAYMENTSETTINGID;
    },
	parseUrlParams: function(context) {
		var request = context.request;
		var urlParseResult = url.parse(request.url);
		queryStringParams = qs.parse(urlParseResult.query);
		return queryStringParams;
	},
	getOrderDetails: function(context, orderId) {
		var orderClient = this.createClientFromContext(Order,context);
		var generalSettingsClient = this.createClientFromContext(GeneralSettings, context, true);

	  	return generalSettingsClient.getGeneralSettings()
	  		.then(function(settings){
			    return orderClient.getOrder({orderId: orderId})
			    .then(function(order) {
			      return {orderNumber: order.orderNumber, websiteName: settings.websiteName, payments: order.payments};
			    });
	  		});
	},
	getValue: function(paymentSetting, key) {
        var value = _.findWhere(paymentSetting.credentials, {"apiName" : key}) || _.findWhere(paymentSetting.Credentials, {"APIName" : key});

        if (!value) {
            console.log(key+" not found");
            return;
        }
        return value.value || value.Value;
    },
    setAffirmError: function( context, error ){
        try {
            // set affirm error in cache
            context.cache.getOrCreate( {type:'distributed', scope:'tenant', level:'shared'} ).set( 'affirmError', error );
        } catch ( err ) {
            console.log( err );
            return false;
        }
    },
    getAffirmError: function( context ){
        try {
            // get Affrim Error from cache
            cache  = context.cache.getOrCreate( {type:'distributed', scope:'tenant', level:'shared'} );
            var affirmError = cache.get( 'affirmError' );
            // cleanup the cache
            cache.set( 'affirmError', '' );
            return affirmError;
        } catch (e) {
            return false;
        }
    },
    addErrorToModel: function(context, callback, err) {
        var message = err;
        if ( err.statusText ){
            message = err.statusText;
        }
        else if (err.originalError) {
            if (err.originalError.items && err.originalError.items.length > 0)
                message = err.originalError.items[0].message;
            else
                message = err.originalError.message;
        }
        else if (err.message){
            message = err.message;
            if (message.errorMessage)
                message = message.errorMessage;
        }
        else if (err.errorMessage){
            message = err.errorMessage;
        }

        if( context.response && context.response.viewData && context.response.viewData.model ){
            context.response.viewData.model.messages =  [
                {"message": message}
            ];
        }
        else if( context.response && context.response.message ){
            context.response.message =  [
                {"message": message}
            ];
        }
        else{
            try {
                context.response.message =  [
                    {"message": message}
                ];
            } catch (e) {
                console.log( e );
            }

        }
        callback();
    }

};
