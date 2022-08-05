# ExtendedCss

AdGuard's ExtendedCss library for applying CSS styles with extended selection properties.

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
  * [Pseudo-class :not()](#extended-css-not)
  * [Selectors debug mode](#selectors-debug-mode)
  * [Backward compatible syntax](#extended-css-old-syntax)
* [How to build](#how-to-build)
* [How to test](#how-to-test)
* [Usage](#usage)
* [Debugging extended selectors](#debugging-extended-selectors)
* [Projects using ExtendedCss](#projects-using-extended-css)


## Extended capabilities

> Extended pseudo-class should specify the element selection at the end of it's selector representation after the standard part. So `div[class="ad"]:has(img)` is valid but `div:has(img)[class="ad"]` is not.

> Some pseudo-classes does not require selector before it. Still adding a [universal selector](https://www.w3.org/TR/selectors-4/#the-universal-selector) `*` makes an extended selector easier to read, even though it has no effect on the matching behavior. So selector `#block :has(> .inner)` works exactly like `#block *:has(> .inner)` but second one is more obvious.

> Pseudo-class names are case-insensitive, e.g. `:HAS()` will work as `:has()`.

### <a id="extended-css-has"></a> Pseudo-class `:has()`

Draft CSS 4.0 specification describes [pseudo-class `:has`](https://www.w3.org/TR/selectors-4/#relational). Unfortunately, it is not yet widely [supported by browsers](https://developer.mozilla.org/en-US/docs/Web/CSS/:has#browser_compatibility).

> Synonyms `:-abp-has` and `:if` are supported for better compatibility.

> Usage of `:has()` pseudo-class is [restricted for some cases](https://bugs.chromium.org/p/chromium/issues/detail?id=669058#c54):
> 1. Disallow `:has()`, `:is()`, `:where()` inside `:has()` argument to avoid increasing the :has() invalidation complexity.
> 2. Disallow `:has()` inside the pseudos accepting only compound selectors.
> 3. Disallow `:has()` after regular pseudo-elements.

**Syntax**

```
[target]:has(selector)
```
- `target` — optional, standard or extended css selector, can be missed for checking *any* element
- `selector` — required, standard or extended css selector

Pseudo-class `:has()` selects the `target` elements that includes the elements that fit to the `selector`. Also `selector` can start with a combinator. Selector list can be set in `selector` as well.

**Examples**

`div:has(.banner)` will select all `div` elements, which **includes** an element with the `banner` class:
```html
<!-- HTML code -->
<div>Not selected</div>
<div>Selected
  <span class="banner">inner element</span>
</div>
```

`div:has(> .banner)` will select all `div` elements, which **includes** an `banner` class element as a *direct child* of `div`:
```html
<!-- HTML code -->
<div>Not selected</div>
<div>Selected
  <p class="banner">child element</p>
</div>
```

`div:has(+ .banner)` will select all `div` elements **preceding** `banner` class element which *immediately follows* the `div` and both are children of the same parent:
```html
<!-- HTML code -->
<div>Not selected</div>
<div>Selected</div>
<p class="banner">adjacent sibling</p>
<span>Not selected</span>
```

`div:has(~ .banner)` will select all `div` elements **preceding** `banner` class element which *follows* the `div` but *not necessarily immediately* and both are children of the same parent:
```html
<!-- HTML code -->
<div>Not selected</div>
<div>Selected</div>
<span>Not selected</span>
<p class="banner">general sibling</p>
```

`div:has(span, .banner)` will select all `div` elements, which **includes both** `span` element and `banner` class element:
```html
<!-- HTML code -->
<div>Not selected</div>
<div>Selected
  <span>child span</span>
  <p class="banner">child .banner</p>
</div>
```

> [Backward compatible syntax for `:has()`](#old-syntax-has) is supported but not recommended.


### <a id="extended-css-if-not"></a> Pseudo-class `:if-not()`

Pseudo-class `:if-not()` is basically a shortcut for `:not(:has())`. It is supported by ExtendedCss for better compatibility with some other filter lists.

> `:if-not()` is not recommended to use in AdGuard filters. The reason is that one day browsers will add `:has` native support, but it will never happen to this pseudo-class.

### <a id="extended-css-contains"></a> Pseudo-class `:contains()`

This pseudo-class principle is very simple: it allows to select the elements that contain specified text or which content matches a specified regular expression. Regexp flags are supported.

> Pseudo-class `:contains()` uses the `textContent` element property for matching, not the `innerHTML`.

> Synonyms `:-abp-contains` and `:has-text` are supported for better compatibility.

**Syntax**

```
[target]:contains(match)
```
- `target` — optional, standard or extended css selector, can be missed for checking *any* element
- `match` — required, string or regular expression for matching element textContent

> Regexp flags are supported for `match`.

**Examples**

For such DOM:
```html
<!-- HTML code -->
<div>Not selected</div>
<div id="match">Selected as IT contains "banner"</div>
<div>Not selected <div class="banner"></div></div>
```

`div#match` can be selected by any on these extended selectors:
```
! plain text
div:contains(banner)

! regular expression
div:contains(/as .* banner/)

! regular expression with flags
div:contains(/it .* banner/gi)
```

> Only a `div` with `id=match` will be selected because the next element does not contain any text, and `banner` is a part of code, not a text.

> [Backward compatible syntax for `:contains()`](#old-syntax-contains) is supported but not recommended.


### <a id="extended-css-matches-css"></a> Pseudo-class `:matches-css()`

Actually there are three pseudo-classes for matching the element by its current style properties: `:matches-css()`, `:matches-css-before()`, `:matches-css-before()`. The work of these pseudo-classes is based on using the [`Window.getComputedStyle()`](https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle) method.

**Syntax**

```
! element style matching
[target]:matches-css(property ":" pattern)

! ::before pseudo-element style matching
[target]:matches-css-before(property ":" pattern)

! ::after pseudo-element style matching
[target]:matches-css-after(property ":" pattern)
```

- `target` — optional, standard or extended css selector, can be missed for checking *any* element
- `property` — required, a name of CSS property to check the element for
- `pattern` —  required, a value pattern that is using the same simple wildcard matching as in the basic url filtering rules OR a regular expression. For this type of matching, AdGuard always does matching in a case insensitive manner. In the case of a regular expression, the pattern looks like `/regexp/`.

> For **non-regexp** patterns `(`,`)`,`[`,`]` must be **unescaped**, e.g. `:matches-css(background-image:url(data:*))`.

> For **regexp** patterns `\` should be **escaped**, e.g. `:matches-css(background-image: /^url\\("data:image\\/gif;base64.+/)`.

<!-- TODO: https://github.com/AdguardTeam/ExtendedCss/issues/138 -->
> Regexp patterns does not support flags.

**Examples**

For such DOM:
```html
<!-- HTML code -->
<style type="text/css">
    #matched::before {
        content: "Block me"
    }
</style>
<div id="matched"></div>
<div id="not-matched"></div>
```

`div` elements with pseudo-element `::before` with specified `content` property can be selected by any of these extended selectors:
```
! string pattern
div:matches-css-before(content: block me)

! string pattern with wildcard
div:matches-css-before(content: block*)

! regular expression pattern
div:matches-css-before(content: /block me/)
```

> [Backward compatible syntax for `:matches-css()`](#old-syntax-matches-css) is supported but not recommended.


### <a id="extended-css-matches-attr"></a> Pseudo-class `:matches-attr()`

Pseudo-class `:matches-attr()` allows to select an element by its attributes, especially if they are randomized.

**Syntax**

```
[target]:matches-attr("name"[="value"])
```
- `target` — optional, standard or extended css selector, can be missed for checking *any* element
- `name` — required, simple string *or* string with wildcard *or* regular expression for attribute name matching
- `value` — optional, simple string *or* string with wildcard *or* regular expression for attribute value matching

> For **regexp** patterns `"` and `\` should be **escaped**, e.g. `div:matches-attr(class=/[\\w]{5}/)`.

**Examples**

`div:matches-attr("ad-link")` will select `div#target1`:
```html
<!-- HTML code -->
<div id="target1" ad-link="ssdgsg-banner_240x400"></div>
```

`div:matches-attr("data-*"="adBanner")` will select `div#target2`:
```html
<!-- HTML code -->
<div id="target2" data-sdfghlhw="adBanner"></div>
```

`div:matches-attr(*unit*=/^click$/)` will select `div#target3`:
```html
<!-- HTML code -->
<div id="target3" hrewq-unit094="click"></div>
```

`*:matches-attr("/.{5,}delay$/"="/^[0-9]*$/")` will select `#target4`:
```html
<!-- HTML code -->
<div>
  <inner-afhhw id="target4" nt4f5be90delay="1000"></inner-afhhw>
</div>
```


### <a id="extended-css-matches-property"></a> Pseudo-class `:matches-property()`

Pseudo-class `:matches-property()` allows to select an element by matching its properties.

**Syntax**

```
[target]:matches-property("name"[="value"])
```
- `target` — optional, standard or extended css selector, can be missed for checking *any* element
- `name` — required, simple string *or* string with wildcard *or* regular expression for element property name matching
- `value` — optional, simple string *or* string with wildcard *or* regular expression for element property value matching

> For **regexp** patterns `"` and `\` should be escaped, e.g. `div:matches-property(prop=/[\\w]{4}/)`.

> `name` supports regexp for property in chain, e.g. `prop./^unit[\\d]{4}$/.type`.

**Examples**

Element with such properties:
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

can be selected by any of these extended selectors:
```
div:matches-property(check.track)

div:matches-property("check./^unit_.{4,6}$/")

div:matches-property("check.unit_*"=true)

div:matches-property(memoizedProps.key="null")

div:matches-property(memoizedProps._owner.src=/ad/)
```

> **For filters maintainers:** To check properties of specific element, you should do:
> 1. Inspect the needed page element or select it in `Elements` tab of browser DevTools.
> 2. Run `console.dir($0)` in `Console` tab.


### <a id="extended-css-xpath"></a> Pseudo-class `:xpath()`

Pseudo-class `:xpath()` allows to select an element by evaluating a XPath expression.

**Syntax**

```
[target]:xpath(expression)
```
- `target`- optional, standard or extended css selector
- `expression` — required, valid XPath expression

> `target` can be omitted so it is optional. For any other pseudo-class that would mean "apply to *all* DOM nodes", but in case of `:xpath()` it just means "apply to the *whole* document", and such applying slows elements selecting significantly. That's why rules like `#?#:xpath(expression)` are limited for looking inside the `body` tag. For example, rule `#?#:xpath(//div[@data-st-area=\'Advert\'])` is parsed as `#?#body:xpath(//div[@data-st-area=\'Advert\'])`.

> Extended selectors with defined `target` as *any* selector — `*:xpath(expression)` — can still be used but it is not recommended, so `target` should be specified instead.

**Examples**

`:xpath(//*[@class="banner"])` will select `div#target1`:
```html
<!-- HTML code -->
<div id="target1" class="banner"></div>
```

`:xpath(//*[@class="inner"]/..)` will select `div#target2`:
```html
<!-- HTML code -->
<div id="target2">
  <div class="inner"></div>
</div>
```


### <a id="extended-css-nth-ancestor"></a> Pseudo-class `:nth-ancestor()`

Pseudo-class `:nth-ancestor()` allows to lookup the *nth* ancestor relative to the previously selected element.

**Syntax**

```
subject:nth-ancestor(n)
```
<!-- TODO: make `subject` required in code, add tests -->
- `subject` — required, standard or extended css selector
- `n` — required, number >= 1 and < 256, distance to the needed ancestor from the element selected by `subject`

**Examples**

For such DOM:
```html
<!-- HTML code -->
<div id="target1">
  <div class="child"></div>

  <div id="target2">
    <div>
      <div>
        <div class="inner"></div>
      </div>
    </div>
  </div>
</div>
```

`.child:nth-ancestor(1)` will select `div#target1`
`div[class="inner"]:nth-ancestor(3)` will select `div#target2`


### <a id="extended-css-upward"></a> Pseudo-class `:upward()`

Pseudo-class `:upward()` allows to lookup the ancestor relative to the previously selected element.

**Syntax**

```
subject:upward(ancestor)
```
<!-- TODO: make `subject` required in code, add tests -->
- `subject` — required, standard or extended css selector
- `ancestor` — required, specification for the ancestor of the element selected by `subject`, can be set as:
  - *number* >= 1 and < 256 for distance to the needed ancestor, same as [`:nth-ancestor()`](#extended-css-nth-ancestor)
  - *standard css selector* for matching closest ancestor

**Examples**

```
div.child:upward(div[id])
div:contains(test):upward(div[class^="parent-wrapper-")

div.test:upward(4)
div:has-text(/test/):upward(2)
```

For such DOM:
```html
<!-- HTML code -->
<div id="target1" data="true">
  <div class="child"></div>

  <div id="target2">
    <div>
      <div>
        <div class="inner"></div>
      </div>
    </div>
  </div>
</div>
```

`.inner:upward(div[data])` will select `div#target1`
`.inner:upward(div[id])` will select `div#target2`

`.child:upward(1)` will select `div#target1`
`.inner:upward(3)` will select `div#target2`


### <a id="remove-pseudos"></a> Pseudo-class `:remove()` and pseudo-property `remove`

Sometimes, it is necessary to remove a matching element instead of hiding it or applying custom styles. In order to do it, you can use pseudo-class `:remove()` as well as pseudo-property `remove`.

> **Pseudo-class `:remove()` is limited to work properly only at the end of selector.**

**Syntax**

```
! pseudo-class
selector:remove()

! pseudo-property
selector { remove: true; }
```
- `selector` — required, standard or extended css selector

> For applying `:remove()` pseudo-class to any element [universal selector](https://www.w3.org/TR/selectors-4/#the-universal-selector) `*` should be used. Otherwise extended selector may be considered as invalid, e.g. `.banner > :remove()` is not valid for removing any child element of `banner` class element, so it should look like `.banner > *:remove()`.

**Examples**

```
div.banner:remove()
div:has(> div[ad-attr]):remove()

div:contains(advertisement) { remove: true; }
div[class]:has(> a > img) { remove: true; }
```

> If `:remove()` pseudo-class or `remove` pseudo-property is used, all style properties will be ignored except of [`debug` pseudo-property](#selectors-debug-mode).

> Rules with `remove` pseudo-property should use `#$?#` marker: `$` for CSS style rules syntax, `?` for ExtendedCss syntax.


### <a id="extended-css-is"></a> Pseudo-class `:is()`

Pseudo-class `:is()` allows to match any element that can be selected by any of selectors passed to it. Invalid selectors passed as arg will be skipped and pseudo-class will deal with valid ones with no error. Our implementation of [`:is() (:matches(), :any())` pseudo-class](https://developer.mozilla.org/en-US/docs/Web/CSS/:is).

**Syntax**

```
[target]:is(selectors)
```
- `target` — optional, standard or extended css selector, can be missed for checking *any* element
- `selectors` — [*forgiving selector list*](https://drafts.csswg.org/selectors-4/#typedef-forgiving-selector-list) of standard or extended selectors

> If `target` is not defined or defined as [universal selector](https://www.w3.org/TR/selectors-4/#the-universal-selector) `*`, pseudo-class `:is()` applying will be limited to `html` children, e.g. rules `#?#:is(...)` and `#?#*:is(...)` are parsed as `#?#html *:is(...)`.

**Examples**

`#container *:is(.inner, .footer)` will select only `div#target1`
```html
<!-- HTML code -->
<div id="container">
  <div data="true">
    <div>
      <div id="target1" class="inner"></div>
    </div>
  </div>
</div>
```


### <a id="extended-css-not"></a> Pseudo-class `:not()`

Pseudo-class `:not()` allows to select elements which are *not matched* by selectors passed as arg. Invalid selectors in arg are not allowed and error will be thrown. Our implementation of [`:not()` pseudo-class](https://developer.mozilla.org/en-US/docs/Web/CSS/:not).

**Syntax**

```
[target]:not(selectors)
```
- `target` — optional, standard or extended css selector, can be missed for checking *any* element
- `selectors` — selector list of standard or extended selectors

> If `target` is not defined or defined as [universal selector](https://www.w3.org/TR/selectors-4/#the-universal-selector) `*`, pseudo-class `:not()` applying will be limited to `html` children, e.g. rules `#?#:not(...)` and `#?#*:not(...)` are parsed as `#?#html *:not(...)`.

**Examples**

`#container > *:not(h2, .text)` will select only `div#target1`
```html
<!-- HTML code -->
<div id="container">
  <h2>Header</h2>
  <div id="target1"></div>
  <span class="text">text</span>
</div>
```


### Selectors debug mode

Sometimes, you might need to check the performance of a given selector or a stylesheet. In order to do it without interacting with javascript directly, you can use a special `debug` style property. When `ExtendedCss` meets this property, it enables debug mode either for a single selector or for all selectors depending on the `debug` value.

**Debugging a single selector**
```
.banner { display: none; debug: true; }
```

**Enabling global debug**
```
.banner { display: none; debug: global; }
```

> Global debugging mode also can be enabled by positive `debug` property in `ExtCssConfiguration`:
```js
const extendedCss = new ExtendedCss({
  styleSheet, // required, rules as string
  debug,      // optional, boolean
});
```


### <a id="extended-css-old-syntax"></a> Backward compatible syntax

**Backward compatible syntax is supported but not recommended.**

### <a id="old-syntax-has"></a> Old syntax for pseudo-class `:has()`

**Syntax**
```
target[-ext-has="selector"]
```

**Examples**
```
div[-ext-has=".banner"]
```
```html
<!-- HTML code -->
<div>Not selected</div>
<div>Selected <span class="banner"></span></div>
```


### <a id="old-syntax-contains"></a> Old syntax for pseudo-class `:contains()`

**Syntax**
```
// matching by plain text
target[-ext-contains="text"]

// matching by a regular expression
target[-ext-contains="/regex/"]
```

**Examples**
```
// matching by plain text
div[-ext-contains="banner"]

// matching by a regular expression
div[-ext-contains="/this .* banner/"]
```

```html
<!-- HTML code -->
<div>Not selected</div>
<div id="selected">Selected as it contains "banner"</div>
```


### <a id="old-syntax-matches-css"></a> Old syntax for pseudo-class `:matches-css()`

**Syntax**
```
target[-ext-matches-css="property ":" pattern"]
target[-ext-matches-css-after="property ":" pattern"]
target[-ext-matches-css-before="property ":" pattern"]
```

**Examples**
```html
<!-- HTML code -->
<style type="text/css">
    #matched::before {
        content: "Block me"
    }
</style>
<div id="matched"></div>
<div id="not-matched"></div>
```

```
! string pattern
div:matches-css-before(content: block me)

! regular expression pattern
div:matches-css-before(content: /block me/)
```


### How to build

Install dependencies
```
yarn install
```

And just run
```
yarn build
```

### How to test

Install dependencies
```
yarn install
```

Run node testing
```
yarn test
```

Testing can be limited be Jest options [--testPathPattern](https://jestjs.io/docs/cli#--testpathpatternregex) and [--testNamePattern](https://jestjs.io/docs/cli#--testnamepatternregex)
```
yarn test --testPathPattern=selector-tokenizer

yarn test --testNamePattern=check valid regular selectors

yarn test --testPathPattern=stylesheet-parser --testNamePattern=one rule
```

### Usage

You can import, require or copy IIFE module with ExtendedCss into your code, e.g.
```
import ExtendedCss from 'extended-css';
```
or
```
const ExtendedCss = require('extended-css');
```
IIFE module can be found by the following path `./dist/extended-css.js`

After that you can use ExtendedCss as you wish:

```javascript
(function() {
  let styleSheet = 'div.wrapper > div:has(.banner) { display:none!important; }\n';
  styleSheet += 'div.wrapper > div:contains(ads) { background:none!important; }';
  const extendedCss = new ExtendedCss({ styleSheet });

  // apply styleSheet
  extendedCss.apply();

  // stop applying this styleSheet
  setTimeout(function() {
    extendedCss.dispose();
  }, 10 * 1000);
})();
```

### Debugging extended selectors

To load ExtendedCss to a current page, copy and execute the following code in a browser console:
```
!function(e,t,d){C=e.createElement(t),C.src=d,C.onload=function(){alert("ExtendedCss loaded successfully")},s=e.getElementsByTagName(t)[0],s?s.parentNode.insertBefore(C,s):(h=e.getElementsByTagName("head")[0],h.appendChild(C))}(document,"script","https://AdguardTeam.github.io/ExtendedCss/extended-css.min.js");
```

You can now use the `ExtendedCss` constructor in the global scope, and its method `ExtendedCss.query()` as `Document.querySelectorAll()`.
<!-- TODO: check ExtendedCss.query later -->
```javascript
const selector = 'div.block:has=(.header:matches-css-after(content: Ads))';

// array of HTMLElement matched the `selector` will be returned
ExtendedCss.query(selector);
```


### <a id="projects-using-extended-css"></a> Projects using ExtendedCss

* [CoreLibs](https://github.com/AdguardTeam/CoreLibs) — `Content Script` should be updated
* [TSUrlFilter](https://github.com/AdguardTeam/tsurlfilter)
* [FiltersCompiler](https://github.com/AdguardTeam/FiltersCompiler)
* [AdguardBrowserExtension](https://github.com/AdguardTeam/AdguardBrowserExtension) — `TSUrlFilter` should be updated
* [AdguardForSafari](https://github.com/AdguardTeam/AdGuardForSafari) — `adguard-resources` should be updated
* [AdguardForiOS](https://github.com/AdguardTeam/AdguardForiOS)  — `TSUrlFilter` should be updated in `advanced-adblocker-web-extension`
