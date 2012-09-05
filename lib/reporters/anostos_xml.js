
/**
 * Module dependencies.
 */

var HTML = require('./html')
  , utils = require('../utils')
  , Progress = require('../browser/progress')
  , escape = utils.escape;

/**
 * Expose `Anostos_XML`.
 */

exports = module.exports = Anostos_XML;

/**
 * Initialize a new `Anostos_XML` reporter.
 *
 * @param {Runner} runner
 * @api public
 */

function Anostos_XML(runner) {
  HTML.call(this, runner);

  var self = this
    , xml_root = document.getElementById('mocha-xml')
    , xml_report = fragment('<MochaNS:return proc="report"></MochaNS:return>')
    , xml_stack = [xml_report]

  if (!xml_root) return error('#mocha-xml div missing, add it to your document');

  xml_root.appendChild(xml_report);

  runner.on('suite', function(suite){
    if (suite.root) return;

    // XML report
    var elCallTo = fragment("<MochaNS:callto></MochaNS:callto>");
    var elReturn = fragment('<MochaNS:return proc="%s"></MochaNS:return>', escape(suite.title));
    elCallTo.appendChild(elReturn);
    xml_stack[0].appendChild(elCallTo);
    xml_stack[0].appendChild(fragment("<MochaNS:error>false</MochaNS:error>"));
    xml_stack[0].appendChild(fragment("<MochaNS:errormsg>none</MochaNS:errormsg>"));
    xml_stack.unshift(elReturn);
  });

  runner.on('suite end', function(suite){
    if (suite.root) return;
    xml_stack.shift();
  });

  runner.on('test end', function(test){

    // generate error string
    var str = ""
    if (!test.pending && 'passed' != test.state) {
      str = test.err.stack || test.err.toString();
      // FF / Opera do not add the message
      if (!~str.indexOf(test.err.message)) {
        str = test.err.message + '\n' + str;
      }
      // <=IE7 stringifies to [Object Error]. Since it can be overloaded, we
      // check for the result of the stringifying.
      if ('[object Error]' == str) str = test.err.message;
      // Safari doesn't give you a stack. Let's at least provide a source line.
      if (!test.err.stack && test.err.sourceURL && test.err.line !== undefined) {
        str += "\n(" + test.err.sourceURL + ":" + test.err.line + ")";
      }
    }

    // XML Report
    var elCallTo = fragment("<MochaNS:callto></MochaNS:callto>");
    var elReturn = fragment('<MochaNS:return proc="%e"></MochaNS:return>', test.title);
    elCallTo.appendChild(elReturn);
    var elError, elErrorMsg, elOuterError, elOuterErrorMsg;
    if ('passed' == test.state || test.pending) {
        elError         = fragment("<MochaNS:error>false</MochaNS:error>");
        elErrorMsg      = fragment("<MochaNS:errormsg>none</MochaNS:errormsg>");
        elOuterError    = fragment("<MochaNS:error>false</MochaNS:error>");
        elOuterErrorMsg = fragment("<MochaNS:errormsg>none</MochaNS:errormsg>");
    }
    else {
        elError         = fragment("<MochaNS:error>true</MochaNS:error>");
        elErrorMsg      = fragment("<MochaNS:errormsg>%e</MochaNS:errormsg>", str); // str from above
        elOuterError    = fragment("<MochaNS:error>true</MochaNS:error>");
        elOuterErrorMsg = fragment("<MochaNS:errormsg>%e</MochaNS:errormsg>", "ErrorInCallTo");

        // now loop through all the parents and set their error messages to true
        for(var i = 1; i < xml_stack.length; i++)
        {
            var children = xml_stack[i].children;
            for(var j = 0; j < children.length; j++)
            {
                if(children[j].nodeName == 'ERROR')
                    children[j].innerHTML = "true";
                else if(children[j].nodeName == 'ERRORMSG')
                    children[j].innerHTML = "ErrorInCallTo";
            }
        }
    }
    elReturn.appendChild(elError);
    elReturn.appendChild(elErrorMsg);
    xml_stack[0].appendChild(elCallTo);
    xml_stack[0].appendChild(elOuterError);
    xml_stack[0].appendChild(elOuterErrorMsg);
  });
}

/**
 * Display error `msg`.
 */

function error(msg) {
  document.body.appendChild(fragment('<div id="error">%s</div>', msg));
}

/**
 * Return a DOM fragment from `html`.
 */

function fragment(html) {
  var args = arguments
    , div = document.createElement('div')
    , i = 1;

  function replaceMethod(_, type){
    switch (type) {
      case 's': return String(args[i++]);
      case 'e': return escape(args[i++]);
    }
  }

  div.innerHTML = html.replace(/%([se])/g, replaceMethod);

  return div.firstChild;
}

/**
 * Set `el` text to `str`.
 */

function text(el, str) {
  if (el.textContent) {
    el.textContent = str;
  } else {
    el.innerText = str;
  }
}

/**
 * Listen on `event` with callback `fn`.
 */

function on(el, event, fn) {
  if (el.addEventListener) {
    el.addEventListener(event, fn, false);
  } else {
    el.attachEvent('on' + event, fn);
  }
}
