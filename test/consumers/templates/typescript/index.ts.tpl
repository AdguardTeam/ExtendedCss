import {
    ExtendedCss,
    EXTENDED_CSS_VERSION,
} from '@adguard/extended-css';
import type {
    ExtCssConfiguration,
    IAffectedElement,
    SelectorValidationResult,
} from '@adguard/extended-css';
import { EXTENDED_CSS_VERSION as VERSION_FROM_SUBPATH } from '@adguard/extended-css/version';

/**
 * Resolves to `true` when `T` is `any`.
 */
type IsAny<T> = 0 extends (1 & T) ? true : false;

const extendedCssIsAny: IsAny<typeof ExtendedCss> = false;
const configurationIsAny: IsAny<ExtCssConfiguration> = false;
const affectedElementIsAny: IsAny<IAffectedElement> = false;
const validationIsAny: IsAny<SelectorValidationResult> = false;
const versionIsAny: IsAny<typeof EXTENDED_CSS_VERSION> = false;
const subpathVersionIsAny: IsAny<typeof VERSION_FROM_SUBPATH> = false;

const configuration: ExtCssConfiguration = {
    styleSheet: '#banner:contains(ads) { display: none !important; }',
    beforeStyleApplied: (element: IAffectedElement): IAffectedElement => element,
};

const extendedCss: ExtendedCss = new ExtendedCss(configuration);
const elements: HTMLElement[] = ExtendedCss.query('#banner');
const validation: SelectorValidationResult = ExtendedCss.validate('#banner:contains(ads)');
const version: string = EXTENDED_CSS_VERSION;
const subpathVersion: string = VERSION_FROM_SUBPATH;

/**
 * The package exports named values, not a default export. This line must
 * fail to compile: the `@ts-expect-error` comment turns that failure into a
 * check that the named API is the real API.
 */
// @ts-expect-error The package has no default export.
const defaultImport: never = ExtendedCss.default;

// @ts-expect-error `styleSheet` must be a string.
const invalidConfiguration: ExtCssConfiguration = { styleSheet: 1 };

export {
    affectedElementIsAny,
    configuration,
    configurationIsAny,
    defaultImport,
    elements,
    extendedCss,
    extendedCssIsAny,
    invalidConfiguration,
    subpathVersion,
    subpathVersionIsAny,
    validation,
    validationIsAny,
    version,
    versionIsAny,
};
