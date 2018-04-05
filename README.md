# Extended Css engine [![Build Status](https://travis-ci.org/AdguardTeam/ExtendedCss.svg?branch=master)](https://travis-ci.org/AdguardTeam/ExtendedCss)

Module for applying CSS styles with extended selection properties.

* [Extended capabilities](#extended-capabilities)
  * [Pseudo-class :has()](#extended-css-has)
  * [Pseudo-class :if-not()](#extended-css-if-not)
  * [Pseudo-class :contains()](#extended-css-contains)
  * [Pseudo-class :matches-css()](#extended-css-matches-css)
  * [Pseudo-class :properties()](#extended-css-properties)
  * [Selectors debug mode](#selectors-debug-mode)
* [Usage](#usage)
* [Debugging extended selectors](#debugging-extended-selectors)

## Extended capabilities

<a id="extended-css-has"></a>
### Pseudo-class `:has()`

Draft CSS 4.0 specification describes [pseudo-class `:has`](https://drafts.csswg.org/selectors/#relational). Unfortunately, it is not yet supported by browsers.

#### `:has()` syntax

```
:has(selector)
```

Backward compatible syntax:
```
[-ext-has="selector"]
```

Supported synonyms for better compatibility: `:-abp-has`, `:if`.

Pseudo-class `:has()` selects the elements that includes the elements that fit to `selector`.

#### `:has()` examples

##### Selecting  all `div` elements, which contain an element with the `banner` class.

**HTML code**
```html
<div>Do not select this div</div>
<div>Select this div<span class="banner"></span></div>
```

**Selector**
```
div:has(.banner)
```

Backward compatible syntax:
```
div[-ext-has=".banner"]
```

<a id="extended-css-if-not"></a>
### Pseudo-class `:if-not()`

This pseudo-class is basically a shortcut for `:not(:has())`. It is supported by ExtendedCss for better compatibility with some filters subscriptions, but it is not recommended to use it in AdGuard filters. The rationale is that one day browsers will add `:has` native support, but it will never happen to this pseudo-class.

<a id="extended-css-contains"></a>
### Pseudo-class `:contains()`

This pseudo-class principle is very simple: it allows to select the elements that contain specified text or which content matches a specified regular expression. Please note, that this pseudo-class uses `innerText` element property for matching (and not the `innerHTML`).

#### `:contains()` syntax

```
// matching by plain text
:contains(text)

// matching by a regular expression
:contains(/regex/)
```

Backward compatible syntax:
```
// matching by plain text
[-ext-contains="text"]

// matching by a regular expression
[-ext-contains="/regex/"]
```

Supported synonyms for better compatibility: `:-abp-contains`, `:has-text`.

#### `:contains()` examples

##### Selecting all `div` elements, which contain text `banner`.

**HTML code**
```html
<div>Do not select this div</div>
<div id="selected">Select this div (banner)</div>
<div>Do not select this div <div class="banner"></div></div>
```

**Selector**
```
// matching by plain text
div:contains(banner)

// matching by a regular expression
div:contains(/this .* banner/)
```

Backward compatible syntax:
```
// matching by plain text
div[-ext-contains="banner"]

// matching by a regular expression
div[-ext-contains="/this .* banner/"]
```

Please note that in this example only a `div` with `id=selected` will be selected, because the next element does not contain any text (`banner` is a part of code, not text).

<a id="extended-css-matches-css"></a>
### Pseudo-class `:matches-css()`

These pseudo-classes allow to select an element by its current style property. The work of this pseudo-class is based on using the [`window.getComputedStyle`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle) function.

#### `:matches-css()` syntax

```
/* element style matching */
selector:matches-css(property-name ":" pattern)

/* ::before pseudo-element style matching */
selector:matches-css-before(property-name ":" pattern)

/* ::after pseudo-element style matching */
selector:matches-css-after(property-name ":" pattern)
```

Backward compatible syntax:
```
selector[-ext-matches-css="property-name ":" pattern"]
selector[-ext-matches-css-after="property-name ":" pattern"]
selector[-ext-matches-css-before="property-name ":" pattern"]
```

##### `property-name`
A name of CSS property to check the element for.

##### `pattern`
This can be either a value pattern that is using the same simple wildcard matching as in the basic url filtering rules or it can be a regular expression. For this type of matching, AdGuard always does matching in a case insensitive manner.

In the case of a regular expression, the pattern looks like `/regex/`.

> * For non-regex patterns, (`,`),[`,`] must be unescaped, because we require escaping them in the filtering rules.
> * For regex patterns, ",\ should be escaped, because we manually escape those in extended-css-selector.js.

#### `:matches-css()` examples

##### Selecting all `div` elements which contain pseudo-class `::before` with specified content.

**HTML code**
```html
<style type="text/css">
    #to-be-blocked::before {
        content: "Block me"
    }
</style>
<div id="to-be-blocked" class="banner"></div>
<div id="not-to-be-blocked" class="banner"></div>
```

**Selector**
```
// Simple matching
div.banner:matches-css-before(content: block me)

// Regular expressions
div.banner:matches-css-before(content: /block me/)
```

Backward compatible syntax:
```
// Simple matching
div.banner[-ext-matches-css-before="content: block me"]

// Regular expressions
div.banner[-ext-matches-css-before="content: /block me/"]
```

<a id="extended-css-properties"></a>
### Pseudo-class `:properties()`

Originally, this pseudo-class was [introduced by ABP](https://adblockplus.org/development-builds/new-css-property-filter-syntax).

On the surface this pseudo class is somewhat similar to [`:matches-css`](#extended-css-matches-css). However, it is very different under the hood. `:matches-css` is based on using [`window.getComputedStyle`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle) while `:properties` is based on scanning page stylesheets and using them to lookup elements.

In short, `:matches-css` is about "Computed" tab of the dev tools while `:properties` is about "Styles" tab:

!()[https://cdn.adguard.com/public/Adguard/kb/en/chrome_devtools.png]

Another notable difference is that there is no special "-before"/"-after" pseudo-classes. `:properties` matching strips both `::before` and `::after` pseudo-elements from the selectors found in the stylesheets.

> **Limitations** 
> * Cross-origin stylesheets are ignored
> * [At-rules](https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule) are also ignored. This means that imported (`@import`) stylesheets and `@media` groups are ignored.

#### `:properties()` syntax

```
/* element style matching */
selector:properties(property-name ":" pattern)
```

Backward compatible syntax:
```
selector[-ext-properties="property-name ":" pattern"]
```

##### `property-name`
A name of CSS property to check the element for.

##### `pattern`
This can be either a value pattern that is using the same simple wildcard matching as in the basic url filtering rules or it can be a regular expression. For this type of matching, AdGuard always does matching in a case insensitive manner.

In the case of a regular expression, the pattern looks like `/regex/`.

> * For non-regex patterns, (`,`),[`,`] must be unescaped, because we require escaping them in the filtering rules.
> * For regex patterns, ",\ should be escaped, because we manually escape those in extended-css-selector.js.

#### `:properties()` examples

##### Selecting all `div` elements which contain any pseudo-class (`::before` or `::after`) with the specified content.

**HTML code**
```html
<style type="text/css">
    #to-be-blocked::before {
        content: "Block me"
    }
</style>
<div id="to-be-blocked" class="banner"></div>
<div id="not-to-be-blocked" class="banner"></div>
```

**Selector**
```
// Simple matching
div.banner:properties(content: block me)

// Regular expressions
div.banner:properties(content: /block me/)
```

Backward compatible syntax:
```
// Simple matching
div.banner[-ext-properties="content: block me"]

// Regular expressions
div.banner:properties(content: /block me/)
```

### Selectors debug mode

Sometimes, you might need to check the performance of a given selector or a stylesheet. In order to do it without interacting with javascript directly, you can use a special `debug` style property. When `ExtendedCss` meets this property, it enables the "debug"-mode either for a single selector or for all selectors depending on the `debug` value.

**Debugging a single selector**
```
.banner { display: none; debug: true; }
```

**Enabling global debug**
```
.banner { display: none; debug: global; }
```

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

### Debugging extended selectors

To load ExtendedCss to a current page, copy and execute the following code in a browser console:
```
!function(E,x,t,C,s,s_){C=E.createElement(x),s=E.getElementsByTagName(x)[0],C.src=t,
C.onload=function(){alert('ExtCss loaded successfully')},s.parentNode.insertBefore(C,s)}
(document,'script','https://AdguardTeam.github.io/ExtendedCss/extended-css.min.js')
```

Alternative, install an "ExtendedCssDebugger" userscript: https://github.com/AdguardTeam/Userscripts/blob/master/extendedCssDebugger/extended-css.debugger.user.js

You can now use the `ExtendedCss` constructor in the global scope, and its method `ExtendedCss.query` as `document.querySelectorAll`.
```
var selectorText = "div.block[-ext-has='.header:matches-css-after(content: Anzeige)']";

ExtendedCss.query(selectorText) // returns an array of Elements matching selectorText
```

### Test page

[Link](https://AdguardTeam.github.io/ExtendedCss)
