import type { PrimitiveValue } from "url-template";
import { parseTemplate } from "url-template";

/**
 * Extracts variable names from a URI template string.
 *
 * This extraction function is limited in its ability to handle malformed template strings,
 * and it differs from how `url-template` handles such cases. However, JMAP defines that all
 * URI Templates MUST be level 1 compliant, so this function should work correctly in all
 * anticipated cases. It will, however, extract parameters from any valid template string
 * from levels 1 to 4.
 *
 * @param template The URI template string from which to extract variables
 * @returns A Set of variable names extracted from the template
 */
export function extractTemplateVariables(template: string): Set<string> {
    const regex = /\{([^}]+)\}/g;
    const operatorChars = new Set(["+", "#", ".", "/", ";", "?", "&", "=", ",", "!", "@", "|"]);
    const variables = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = regex.exec(template)) !== null) {
        const expression = match[1];
        /* v8 ignore else -- @preserve */
        if (expression && expression.length > 0) {
            /* istanbul ignore next */
            const [opChar = ""] = expression;
            const varList = operatorChars.has(opChar) ? expression.slice(1) : expression;

            varList.split(",").forEach((v) => {
                // Remove explode modifier (*) and prefix modifier (:number)
                const name = v.replace(/\*$|:\d+$/, "");
                variables.add(name);
            });
        }
    }

    return variables;
}

/**
 * Expands a URI template with parameters, and ensures that any parameters not used in the template
 * are appended as query parameters to the resulting URL.
 *
 * This behaviour is not technically part of the JMAP specification, but it has been observed that
 * some JMAP servers (such as Fastmail) provide non-compliant templates that do not use all parameters,
 * and are assumed to be expected as query string parameters.
 *
 * @param templateString The URI template string
 * @param params An object containing parameter values to expand in the template
 * @returns A URL object with the expanded template and any unused parameters as query params
 */
export function expandUrlWithParams(templateString: string, params: Record<string, PrimitiveValue>): URL {
    const template = parseTemplate(templateString);
    const expandedUrl = template.expand(params);
    const url = new URL(expandedUrl);

    // Get the set of parameters that are in the template
    const templateVars = extractTemplateVariables(templateString);

    // For each parameter that's not in the template, add it as a query parameter
    for (const [key, value] of Object.entries(params)) {
        if (value !== null && !templateVars.has(key)) {
            url.searchParams.set(key, `${value}`);
        }
    }

    return url;
}
