/* Start with creating ExtendedCss */
var cssText = document.getElementById("extendedCss").innerHTML;
var extendedCss = new ExtendedCss(cssText);
extendedCss.apply();

QUnit.test( "Modifer -ext-has", function(assert) {
  
    var element = document.getElementById("case1-blocked");
    assert.equal(element.style.display, "none");
});