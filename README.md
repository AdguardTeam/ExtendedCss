# Extended Css engine

Module for applying CSS styles with extended selection properties.

* [Extended capabilities](#extended-capabilities)
  * [Pseudo-class :has()](#extended-css-has)
  * [Pseudo-class :if-not()](#extended-css-if-not)
  * [Pseudo-class :contains()](#extended-css-contains)
  * [Pseudo-class :matches-css()](#extended-css-matches-css)
  * [Pseudo-class :matches-attr()](#extended-css-matches-attr)
  * [Pseudo-class :matches-property()](#extended-css-matches-property)
  * [Pseudo-class :xpath()](#extended-css-xpath)
  * [Pseudo-class :nth-ancestor()](#extended-css-nth-ancestor)
  * [Pseudo-class :upward()](#extended-css-upward)
  * [Pseudo-class :remove() and pseudo-property `remove`](#remove-pseudos)
  * [Pseudo-class :is()](#extended-css-is)
  * [Selectors debug mode](#selectors-debug-mode)
* [Usage](#usage)
* [Debugging extended selectors](#debugging-extended-selectors)
* [Projects using Extended Css](#projects-using-extended-css)
* [Test page](#test-page)

## Extended capabilities

<a id="extended-css-has"></a>
### Pseudo-class `:has()`

Draft CSS 4.0 specification describes [pseudo-class `:has`](https://drafts.csswg.org/selectors/#relational). Unfortunately, it is not yet supported by browsers.

**Syntax**
```
:has(selector)
```

Backward compatible syntax:
```
[-ext-has="selector"]
```

Supported synonyms for better compatibility: `:-abp-has`, `:if`.

Pseudo-class `:has()` selects the elements that includes the elements that fit to `selector`.

**Examples**

Selecting  all `div` elements, which contain an element with the `banner` class:

```html
<!-- HTML code -->
<div>Do not select this div</div>
<div>Select this div<span class="banner"></span></div>
```

Selector:
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

This pseudo-class principle is very simple: it allows to select the elements that contain specified text or which content matches a specified regular expression. Regex flags are supported. Please note, that this pseudo-class uses `textContent` element property for matching (and not the `innerHTML`).

**Syntax**
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

> Supported synonyms for better compatibility: `:-abp-contains`, `:has-text`.

**Examples**

Selecting all `div` elements, which contain text `banner`:
```html
<!-- HTML code -->
<div>Do not select this div</div>
<div id="selected">Select this div (banner)</div>
<div>Do not select this div <div class="banner"></div></div>
```

Selector:
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

> Please note that in this example only a `div` with `id=selected` will be selected, because the next element does not contain any text; `banner` is a part of code, not a text.

<a id="extended-css-matches-css"></a>
### Pseudo-class `:matches-css()`

These pseudo-classes allow to select an element by its current style property. The work of this pseudo-class is based on using the [`window.getComputedStyle`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle) function.

**Syntax**
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

- `property-name` — a name of CSS property to check the element for
- `pattern` —  a value pattern that is using the same simple wildcard matching as in the basic url filtering rules OR a regular expression. For this type of matching, AdGuard always does matching in a case insensitive manner. In the case of a regular expression, the pattern looks like `/regex/`.

> For non-regex patterns, `(`,`)`,`[`,`]` must be unescaped, because we require escaping them in the filtering rules. For example, `:matches-css(background-image:url(data:*))`.

> For regex patterns, `"` and `\` should be escaped, because we manually escape those in extended-css-selector.js. For example: `:matches-css(background-image: /^url\\(\\"data\\:\\image.+/)`.

**Examples**

Selecting all `div` elements which contain pseudo-class `::before` with specified content:
```html
<!-- HTML code -->
<style type="text/css">
    #to-be-blocked::before {
        content: "Block me"
    }
</style>
<div id="to-be-blocked" class="banner"></div>
<div id="not-to-be-blocked" class="banner"></div>
```

Selector:
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

<a id="extended-css-matches-attr"></a>
### Pseudo-class `:matches-attr()`

This pseudo-class allows to select an element by its attributes, especially if they are randomized.

**Syntax**
```
selector:matches-attr("name"[="value"])
```

- `name` — attribute name OR regular expression for attribute name
- `value` — optional, attribute value OR regular expression for attribute value

> For regex patterns, `"` and `\` should be escaped.

**Examples**

```html
<!-- HTML code -->
<div id="targer1" class="matches-attr" ad-link="ssdgsg-banner_240x400"></div>

<div id="targer2" class="has matches-attr">
  <div data-sdfghlhw="adbanner"></div>
</div>

<div id="targer3-host" class="matches-attr has contains">
  <div id="not-targer3" wsdfg-unit012="click">
    <span>socials</span>
  </div>
  <div id="targer3" hrewq-unit094="click">
    <span>ads</span>
  </div>
</div>

<div id="targer4" class="matches-attr upward">
  <div >
    <inner-afhhw class="nyf5tx3" nt4f5be90delay="1000"></inner-afhhw>
  </div>
</div>
```

```
// for div#targer1
div:matches-attr("ad-link")

// for div#targer2
div:has(> div:matches-attr("/data-/"="adbanner"))

// for div#targer3
div:matches-attr("/-unit/"="/click/"):has(> span:contains(ads))

// for div#targer4
*[class]:matches-attr("/.{5,}delay$/"="/^[0-9]*$/"):upward(2)
```

<a id="extended-css-matches-property"></a>
### Pseudo-class `:matches-property()`

This pseudo-class allows to select an element by its properties.

**Syntax**
```
selector:matches-property("name"[="value"])
```

- `name` — property name OR regular expression for property name
- `value` — optional, property value OR regular expression for property value

> For regex patterns, `"` and `\` should be escaped.

> `name` supports regexp for property in chain, e.g. `prop./^unit[\\d]{4}$/.type`

**Examples**

```javascript
divProperties = {
    id: 1,
    check: {
        track: true,
        unit_2ksdf1: true,
    },
    memoizedProps: {
        key: null,
        tag: 12,
        _owner: {
            effectTag: 1,
            src: 'ad.com',
        },
    },
};
```

```
// element with such properties can be matched by any of such rules:

div:matches-property("check.track")

div:matches-property("check./^unit_.{4,6}$/")

div:matches-property("memoizedProps.key"="null")

div:matches-property("memoizedProps._owner.src"="/ad/")
```

<details>
  <summary><b>For filters maintainers</b></summary>

  To check properties of specific element, do:
  1. Select the element on the page.
  2. Go to Console tab and run `console.dir($0)`.
</details>

<a id="extended-css-xpath"></a>
### Pseudo-class `:xpath()`

This pseudo-class allows to select an element by evaluating a XPath expression.
> **Limited to work properly only at the end of selector, except of [pseudo-class :remove()](#remove-pseudos).**

The :xpath(...) pseudo is different than other pseudo-classes. Whereas all other operators are used to filter down a resultset of elements, the :xpath(...) operator can be used both to create a new resultset or filter down an existing one. For this reason, subject selector is optional. For example, an :xpath(...) operator could be used to create a new resultset consisting of all ancestors elements of a subject element, something not otherwise possible with either plain CSS selectors or other procedural operators.

Normally, a pseudo-class is applied to nodes selected by a `selector`. However, :xpath is special as the selector can be ommited. For any other pseudo-class that would mean "apply to ALL DOM nodes", but in case of :xpath it just means "apply me to the document", and that significantly slows elements selecting. That's why we convert `#?#:xpath(...)` rules for looking inside the body tag. Rules like `#?#*:xpath(...)` can still be used but we highly recommend you avoid it and specify the `selector`.

**Syntax**
```
[selector]:xpath(expression)
```

- `selector`- optional, a plain CSS selector, or a Sizzle compatible selector
- `expression` — a valid XPath expression

**Examples**
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
> **Limited to work properly only at the end of selector, except of [pseudo-class :remove()](#remove-pseudos).**

It is a low-overhead equivalent to `:xpath(..[/..]*)`.

**Syntax**
```
selector:nth-ancestor(n)
```
- `selector` — a plain CSS selector, or a Sizzle compatible selector.
- `n` — positive number >= 1 and < 256, distance from the currently selected node.

**Examples**
```
div.test:nth-ancestor(4)

div:has-text(/test/):nth-ancestor(2)
```

<a id="extended-css-upward"></a>
### Pseudo-class `:upward()`

This pseudo-class allows to lookup the ancestor relative to the currently selected node.
> **Limited to work properly only at the end of selector, except of [pseudo-class :remove()](#remove-pseudos).**

**Syntax**
```
/* selector parameter */
subjectSelector:upward(targetSelector)

/* number parameter */
subjectSelector:upward(n)
```
- `subjectSelector` — a plain CSS selector, or a Sizzle compatible selector
- `targetSelector` — a valid plain CSS selector
- `n` — positive number >= 1 and < 256, distance from the currently selected node

**Examples**
```
div.child:upward(div[id])
div:contains(test):upward(div[class^="parent-wrapper-")

div.test:upward(4)
div:has-text(/test/):upward(2)
```

<a id="remove-pseudos"></a>
### Pseudo-class `:remove()` and pseudo-property `remove`

Sometimes, it is necessary to remove a matching element instead of hiding it or applying custom styles. In order to do it, you can use pseudo-class `:remove()` as well as pseudo-property `remove`.

> **Pseudo-class `:remove()` is limited to work properly only at the end of selector.**

**Syntax**
```
! pseudo-class
selector:remove()

! pseudo-property
selector { remove: true; }
```
- `selector` — a plain CSS selector, or a Sizzle compatible selector

**Examples**
```
div.inner:remove()
div:has(> div[ad-attr]):remove()
div:xpath(../..):remove()

div:contains(target text) { remove: true; }
div[class]:has(> a:not([id])) { remove: true; }
```

> Please note, that all style properties will be ignored if `:remove()` pseudo-class or `remove` pseudo-property is used.

<a id="extended-css-is"></a>
### Pseudo-class `:is()`

This pseudo-class allown to match any element that can be selected by one of the selectors passed to :is().
If there is invalid selector passed, it will be passed and pseudo-class will deal with valid ones.
Our implementation of matches-any pseudo-class https://developer.mozilla.org/en-US/docs/Web/CSS/:is

**Syntax**
```

:is(selectors)
```
- `selectors` — list of plain CSS selector

**Examples**
```
#main :is(.header, .body, .footer) .banner-inner
:is(.div-inner, .div-inner2):contains(textmarker)
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

You can import, require or copy IIFE module with ExtendedCss into your code.

e.g.
```
import ExtendedCss from 'extended-css';
```
or
```
const ExtendedCss = require('extended-css');
```
IIFE module can be found by the following path `./dist/extended-css.js`

After that you can use ExtendedCss as you wish:

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
* [CoreLibs](https://github.com/AdguardTeam/CoreLibs) (Content Script should be updated)
* [TSUrlFilter](https://github.com/AdguardTeam/tsurlfilter)
* [AdguardBrowserExtension](https://github.com/AdguardTeam/AdguardBrowserExtension)
* [AdguardForSafari](https://github.com/AdguardTeam/AdGuardForSafari)

### Test page

[Link](https://AdguardTeam.github.io/ExtendedCss)
