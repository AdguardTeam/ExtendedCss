# Extended Css engine

Module for applying CSS styles with extended selection properties.

These extended properties are defined in the following github issues:

Selector property | Description
--- | ---
`-ext-has (:has)` | https://adguard.com/en/filterrules.html#pseudo-class-has
`-ext-contains (:contains)` | https://adguard.com/en/filterrules.html#pseudo-class-contains
`-ext-matches-css (:matches-css)` | https://adguard.com/en/filterrules.html#pseudo-class-matches-css

### Usage
```
(function() {
  var cssText = 'div.wrapper>div[-ext-has=".banner"] { display:none!important; }\n';
  cssText += 'div.wrapper>div[-ext-contains="some word"] { background:none!important; }';
  var extendedCss = new ExtendedCss(cssText);
  extendedCss.apply();
  
  // Just an example of how to stop applying this extended CSS
  setTimeout(function() {
    extendedCss.dispose();
  }, 10 * 1000);
})();
```
