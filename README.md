# KiboNG Affirm Application
### Version 2.0.0

The Affirm Payments Application by DepLabs creates custom actions to enable the use of the Affirm Payments service on the KiboNG platform.
This app uses the [Affirm Direct API](https://docs.affirm.com/Integrate_Affirm/Direct_API) to connect your KiboNG store with Affirm.

## Affirm Requirements

Affirm Payments App requires valid API keys from your Affirm account.
The Application never shares the Private API key with the storefront to protect the merchant.

## Requirements for Developing with Arc.js

In order to work with Arc.js, you'll need to have:

 - A Developer Account at [mozu.com](https://www.mozu.com/login)
 - Arc.js enabled on your Mozu tenant. (Contact your sales or professional services representative for more information.)
 - NodeJS
 - The following global NPM packages installed
    - `yo`
    - `grunt-cli`
    - `generator-mozu-app`
 You can install all of the required NPM packages at once by running the following command in your Terminal (OS X) or Command Prompt (Windows):
   ```sh
   npm i -g yo grunt-cli generator-mozu-app
   ```

## Clone and Upload the App

1. First, clone this repository to a folder on your development machine:
   ```sh
   $ git clone https://github.com/DEPlabs/PayWithAffirm.git

   Cloning into './PayWithAffirm'...
   done.
   ```

2. Log in to the Mozu Developer Center and create a new app. Call it "PayWithAffirm". Make a note of its Application Key.

3. Now you're prepared to generate your upload configuration! Have on hand:
    - The application key for the app you just created
    - Your Developer Center login
   Got those? OK, in your `PayWithAffirm` directory you cloned from Git, run:
   ```sh
   $ yo mozu-app --config
   ```
   You will be prompted to enter all the necessary information.

4. Once that is complete, you should be able to run `npm install`:
   ```sh
   $ npm install
   ```
   to download the necessary dependencies.

5. You're ready to sync! Run `grunt`:
   ```sh
   $ grunt
   ```
   to upload the actions to Developer Center. Or, if you want grunt to detect when you change files and upload continuously as you work, run:
   ```sh
   $ grunt watch
   ```

## Install the App

Now that you've uploaded the code to your PayWithAffirm app, it's ready to install in your sandbox!

1.	In Mozu Dev Center, go to **Develop** > **Applications** and double-click the app.
2.	On the app details page, click **Install**.
3.	Select your sandbox in the dialog that appears and click **OK**.

*If the install process fails at this point, check with Mozu Support to make sure that the Arc.js framework is enabled for your sandbox.*

## Configure Your Pay with Affirm Settings in Mozu Admin

In the sandbox where you installed the app, go to **System** > **Settings** > **Payments**.

You should see a new option for **PayWithAffirm**. Enable the checkbox to view the Affirm configuration settings. Pay with Affirm requires the following default settings for the app to work:
- Public API Key
- Private API Key
- Environment
- Affirm Amount Threshold
- Order Processing

## Merge Affirm Theme

After installing and configuring the Affirm Payments app you are able to accept Affirm payments in your Kibo eCommerce. The next step is to see Affirm running into your storefront.
Affirm theme should be merged with your current KiboNG theme to support Affirm into your storefront. It enables the payment promotional messages into your Product and Cart pages and also add the Affirm option into the Checkout payment step

Go to the [PayWithAffirm-Theme](https://github.com/DEPlabs/PayWithAffirm-Theme) repository and follow the instructions in the readme to merge Affirm functionality with your current KiboNG theme.
