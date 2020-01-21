# Extended Css engine [![Build Status](https://travis-ci.com/AdguardTeam/ExtendedCss.svg?branch=master)](https://travis-ci.com/AdguardTeam/ExtendedCss)

Module for applying CSS styles with extended selection properties.

* [Extended capabilities](#extended-capabilities)
  * [Pseudo-class :has()](#extended-css-has)
  * [Pseudo-class :if-not()](#extended-css-if-not)
  * [Pseudo-class :contains()](#extended-css-contains)
  * [Pseudo-class :matches-css()](#extended-css-matches-css)
  * [Pseudo-class :xpath()](#extended-css-xpath)
  * [Pseudo-class :nth-ancestor()](#extended-css-nth-ancestor)
  * [Selectors debug mode](#selectors-debug-mode)
  * [Pseudo-property `remove`](#pseudo-property-remove)
* [Usage](#usage)
* [Debugging extended selectors](#debugging-extended-selectors)
* [Projects using Extended Css](#projects-using-extended-css)
* [Test page](#test-page)

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

This pseudo-class principle is very simple: it allows to select the elements that contain specified text or which content matches a specified regular expression. Regex flags are supported. Please note, that this pseudo-class uses `innerText` element property for matching (and not the `innerHTML`).

#### `:contains()` syntax

```
// matching by plain text
:contains(text)

// matching by a regular expression
:contains(/regex/i)
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
// also with regex flags
div:contains(/this .* banner/gi)
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

<a id="extended-css-xpath"></a>
### Pseudo-class `:xpath()`

This pseudo-class allows to select an element by evaluating a XPath expression.
> **Limited to work properly only at the end of selector.**

The :xpath(...) pseudo is different than other pseudo-classes. Whereas all other operators are used to filter down a resultset of elements, the :xpath(...) operator can be used both to create a new resultset or filter down an existing one. For this reason, subject selector is optional. For example, an :xpath(...) operator could be used to create a new resultset consisting of all ancestors elements of a subject element, something not otherwise possible with either plain CSS selectors or other procedural operators.

#### `:xpath()` syntax

```
[selector]:xpath(expression)
```

##### `selector`
Optional. Can be a plain CSS selector, or a Sizzle compatible selector.

##### `expression`
A valid XPath expression.

#### `:xpath()` examples

```
// Filtering results from selector
div:xpath(//*[@class="test-xpath-class"])
div:has-text(/test-xpath-content/):xpath(../../..)
// Use xpath only to select elements
facebook.com##:xpath(//div[@id="stream_pagelet"]//div[starts-with(@id,"hyperfeed_story_id_")][.//h6//span/text()="People You May Know"])
```

<a id="extended-css-nth-ancestor"></a>
### Pseudo-class `:nth-ancestor()`

This pseudo-class allows to lookup the nth ancestor relative to the currently selected node.
> **Limited to work properly only at the end of selector.**

It is a low-overhead equivalent to :xpath(..[/..]*)

#### `:nth-ancestor()` syntax

```
selector:nth-ancestor(n)
```

##### `selector`
Can be a plain CSS selector, or a Sizzle compatible selector.

##### `n`
Positive number >= 1 and < 256, distance from the currently selected node.

#### `:nth-ancestor()` examples

```
div.test:nth-ancestor(4)
div:has-text(/test/):nth-ancestor(2)
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

### Pseudo-property `remove`
Sometimes, it is necessary to remove a matching element instead of hiding it or applying custom styles. In order to do it, you can use a special style property: `remove`.

`.banner { remove: true; }`

> Please note, that other style properties will be ignored if `remove` is specified.

### Usage
```
(function() {
  var cssText = 'div.wrapper>div[-ext-has=".banner"] { display:none!important; }\n';
  cssText += 'div.wrapper>div[-ext-contains="some word"] { background:none!important; }';
  var extendedCss = new ExtendedCss({ cssText: cssText });
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

### Projects using Extended Css
* [CoreLibs](https://github.com/AdguardTeam/CoreLibs)
* [AdguardBrowserExtension](https://github.com/AdguardTeam/AdguardBrowserExtension)
* [AdguardForSafari](https://github.com/AdguardTeam/AdGuardForSafari)

### Test page

[Link](https://AdguardTeam.github.io/ExtendedCss)
