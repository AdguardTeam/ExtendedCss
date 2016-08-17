/** 
 * Copyright 2016 Performix LLC
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Very simple and lightweight CSS parser.
 * <br/>
 * Please note, that it does not support any complex things like media queries and such.
 * <br/>
 * <b>Example:</b>
 * <pre>
 *      var cssText = '.wrapper, .container { background:url('about:blank'); display: none!important; }';
 *      var cssObject = CssParser.parse(cssText);
 * </pre>
 * <b>Result:</b>
 * <pre>
 *      [
 *          {
 *              selectors: '.wrapper, .container',
 *              style: {
 *                  background: "url('about:blank')",
 *                  display: "none!important"
 *              }
 *          }
 *      ]
 * </pre>
 */
var CssParser = (function() { // jshint ignore:line

    /**
     * Transforms style text into a plain JS object.
     * 
     * Example:
     * <pre>"background:url('about:blank'); display: none!important;"<pre>
     * will be transformed into
     * <pre>
     * {
     *     background: "url('about:blank')",
     *     display: "none!important"
     * }
     * </pre>
     * 
     */
    var styleTextToObject = function(styleText) {
        var result = Object.create(null);

        // Splits style by the ';' character
        var re = /([^:;]+?):([^;]+?);/g;
        // Add ';' to the end just to match the regexp
        styleText = styleText + ";";

        var match;
        while((match = re.exec(styleText)) !== null) {
            var name = match[1].trim();
            var value = match[2].trim();
            result[name] = value;
        }
        return result;
    };

    /**
     * Does the actual parsing
     */
    var parseCss = function(cssText) {
        if (!cssText) {
            throw 'CssParser: empty cssText parameter';
        }

        var result = [];
        
        // Splits stylesheet into "selector { style }" pairs
        var re = /(.*?){(.*?)}/g;
        var match;
        while((match = re.exec(cssText)) !== null) {
            var obj = Object.create(null);

            obj.selectors = match[1].trim();
            var styleText = match[2].trim();
            obj.style = styleTextToObject(styleText);
            result.push(obj);
        }

        return result;        
    };

    return {
        parse: parseCss
    };
})();