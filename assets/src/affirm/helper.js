
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
    validateUserSession : function(context) {
        console.log('validateUserSession');
        var user = context.items.pageContext.user;
        if ( !user.isAnonymous && !user.IsAuthenticated )
        {
            //console.log(context.configuration);
            var allowWarmCheckout = (context.configuration && context.configuration.allowWarmCheckout);
            var redirectUrl = '/user/login?returnUrl=' + encodeURIComponent(context.request.url);
            if (!allowWarmCheckout)
            redirectUrl = '/logout?returnUrl=' + encodeURIComponent(context.request.url)+"&saveUserId=true";
            context.response.redirect(redirectUrl);
            return context.response.end();
        }
    },
  getUserEmail : function(context) {
		console.log('getUserEmail');
    if (!context.items || !context.items.pageContext || !context.items.pageContext.user) return null;
    var user = context.items.pageContext.user;
    console.log("user", user);
    if ( !user.isAnonymous && user.IsAuthenticated ) {
      console.log(user);
      return user.email;
    }
    return null;
  },
	getPaymentFQN: function(context) {
		console.log('getPaymentFQN');
		var appInfo = getAppInfo(context);
		console.log("App Info", appInfo);
		return appInfo.namespace+"~"+paymentConstants.PAYMENTSETTINGID;
	},
	isAffirmCheckout: function (context) {
	  var params = this.parseUrlParams(context);
	  var hasAffirmParams = _.has(params, 'access_token') && _.has(params, "isAffirmCheckout");
	  return hasAffirmParams;
	},
	parseUrlParams: function(context) {
		//console.log('parseUrlParams');
		var request = context.request;
		var urlParseResult = url.parse(request.url);
		//console.log("parsedUrl", urlParseResult);
		queryStringParams = qs.parse(urlParseResult.query);
		return queryStringParams;
	},
	isCartPage: function(context) {
		console.log('isCartPage');
		return context.request.url.indexOf("/cart") > -1;
	},
	isCheckoutPage: function(context) {
		console.log('isCheckoutPage');
		return context.request.url.indexOf("/checkout") > -1;
	},
	getOrderDetails: function(context, orderId) {
		console.log('getOrderDetails');
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
	getUniqueId: function () {
		console.log('getUniqueId');
	  var guid = Guid.create();
	  return guid.value.replace(/\-/g, "");
	},
	getValue: function(paymentSetting, key) {
        var value = _.findWhere(paymentSetting.credentials, {"apiName" : key}) || _.findWhere(paymentSetting.Credentials, {"APIName" : key});

        if (!value) {
            console.log(key+" not found");
            return;
        }
        //console.log("return Key: "+key, value.value );
        return value.value || value.Value;
    },
    addErrorToModel: function(context, callback, err) {
        console.log('0. Adding error to viewData');
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
