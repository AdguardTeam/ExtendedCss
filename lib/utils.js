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
 * Helper functions
 */
var Utils = (function () { // jshint ignore:line

    /**
     * Converts dash-formatted styles to camelCase.
     * We need to do it to support old browsers like Palemoon:
     * https://github.com/AdguardTeam/ExtendedCss/issues/5
     *
     * @param text Text to convert
     * @returns {*}
     */
    var lowerCamelCase = function (text) {
        var s = text.split('-');
        if (s.length === 1) {
            return s;
        }

        for (var i = 0; i < s.length; i++) {
            var v = s[i];
            s[i] = v.charAt(0).toUpperCase() + v.slice(1);
        }

        var join = s.join('');
        join = join.charAt(0).toLowerCase() + join.slice(1);

        return join;
    };

    // EXPOSE
    return {
        lowerCamelCase: lowerCamelCase
    };
})();