/*
 * BSD 3-Clause License
 *
 * Copyright (c) 2018, Affirm
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *  Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 *  Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 *  Neither the name of the copyright holder nor the names of its
 *   contributors may be used to endorse or promote products derived from
 *   this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Implementation for embedded.commerce.orders.action.after
 * This function will receive the following context object:

{
  &#34;exec&#34;: {
    &#34;setItemAllocation&#34;: {
      &#34;parameters&#34;: [
        {
          &#34;name&#34;: &#34;allocationId&#34;,
          &#34;type&#34;: &#34;number&#34;
        },
        {
          &#34;name&#34;: &#34;expiration&#34;,
          &#34;type&#34;: &#34;date&#34;
        },
        {
          &#34;name&#34;: &#34;productCode&#34;,
          &#34;type&#34;: &#34;string&#34;
        },
        {
          &#34;name&#34;: &#34;itemId&#34;,
          &#34;type&#34;: &#34;string&#34;
        }
      ],
      &#34;return&#34;: {
        &#34;type&#34;: &#34;mozu.commerceRuntime.contracts.order.orderItem&#34;
      }
    },
    &#34;setAttribute&#34;: {
      &#34;parameters&#34;: [
        {
          &#34;name&#34;: &#34;fqn&#34;,
          &#34;type&#34;: &#34;string&#34;
        },
        {
          &#34;name&#34;: &#34;values&#34;,
          &#34;type&#34;: &#34;object&#34;
        }
      ],
      &#34;return&#34;: {
        &#34;type&#34;: &#34;mozu.commerceRuntime.contracts.order.order&#34;
      }
    },
    &#34;removeAttribute&#34;: {
      &#34;parameters&#34;: [
        {
          &#34;name&#34;: &#34;fqn&#34;,
          &#34;type&#34;: &#34;string&#34;
        }
      ],
      &#34;return&#34;: {
        &#34;type&#34;: &#34;mozu.commerceRuntime.contracts.order.order&#34;
      }
    },
    &#34;setData&#34;: {
      &#34;parameters&#34;: [
        {
          &#34;name&#34;: &#34;key&#34;,
          &#34;type&#34;: &#34;string&#34;
        },
        {
          &#34;name&#34;: &#34;value&#34;,
          &#34;type&#34;: &#34;object&#34;
        }
      ],
      &#34;return&#34;: {
        &#34;type&#34;: &#34;mozu.commerceRuntime.contracts.order.order&#34;
      }
    },
    &#34;removeData&#34;: {
      &#34;parameters&#34;: [
        {
          &#34;name&#34;: &#34;key&#34;,
          &#34;type&#34;: &#34;string&#34;
        }
      ],
      &#34;return&#34;: {
        &#34;type&#34;: &#34;mozu.commerceRuntime.contracts.order.order&#34;
      }
    },
    &#34;setItemData&#34;: {
      &#34;parameters&#34;: [
        {
          &#34;name&#34;: &#34;key&#34;,
          &#34;type&#34;: &#34;string&#34;
        },
        {
          &#34;name&#34;: &#34;value&#34;,
          &#34;type&#34;: &#34;object&#34;
        },
        {
          &#34;name&#34;: &#34;itemId&#34;,
          &#34;type&#34;: &#34;string&#34;
        }
      ],
      &#34;return&#34;: {
        &#34;type&#34;: &#34;mozu.commerceRuntime.contracts.order.orderItem&#34;
      }
    },
    &#34;removeItemData&#34;: {
      &#34;parameters&#34;: [
        {
          &#34;name&#34;: &#34;key&#34;,
          &#34;type&#34;: &#34;string&#34;
        },
        {
          &#34;name&#34;: &#34;itemId&#34;,
          &#34;type&#34;: &#34;string&#34;
        }
      ],
      &#34;return&#34;: {
        &#34;type&#34;: &#34;mozu.commerceRuntime.contracts.order.orderItem&#34;
      }
    },
    &#34;setDutyAmount&#34;: {
      &#34;parameters&#34;: [
        {
          &#34;name&#34;: &#34;dutyAmount&#34;,
          &#34;type&#34;: &#34;number&#34;
        }
      ],
      &#34;return&#34;: {
        &#34;type&#34;: &#34;mozu.commerceRuntime.contracts.order.order&#34;
      }
    }
  },
  &#34;get&#34;: {
    &#34;order&#34;: {
      &#34;parameters&#34;: [],
      &#34;return&#34;: {
        &#34;type&#34;: &#34;mozu.commerceRuntime.contracts.orders.order&#34;
      }
    }
  }
}

 */

 var AffirmCheckout = require("../../affirm/checkout");


module.exports = function(context, callback) {
  try{
    var affirmCheckout = new AffirmCheckout( context, callback );
    affirmCheckout.validateOrderStatusChanges();
  } catch(e) {
    callback(e);
  }
};
