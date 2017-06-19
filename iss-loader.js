/**
 * A loader to parse extended style sheets
 */
//dependant on css parser
let css = require('css');

//Regular expressions
let regExtends = /(.*)\s+extends\s+(.*)/;

//Collection of variables parsed
let classes = {};

/**
 * Parses a single rule.
 *
 * @param rule
 * @returns {*}
 */
function resolveRule(rule){
    //Put the selectors back together
    let ruleString = rule.selectors.join(',');

    //Apply extends regex
    let matches = regExtends.exec(ruleString);

    //If the rule has extends syntax
    if(matches){
        //Split all parents apart
        let extend = matches[2].split('&').map((x) => x.trim());

        //Apply all the declarations from parent classes to child
        extend.forEach((ext) => {
            if(typeof classes[ext] !== 'undefined'){
                rule.declarations = rule.declarations.concat(classes[ext]);
            }
        });

        //Remove the extends syntax
        ruleString = matches[1];
    }

    //If this rule is a variable, store it and return null
    if(ruleString.indexOf('$') === 0){
        let ruleList = ruleString.split(',');

        ruleList.forEach((r) => {
            if(r.indexOf('$') === 0){
                if(typeof classes[r] !== 'undefined')
                    throw "The ess variable " + r + " already exists";
                classes[r] = rule.declarations;
            }
        });

        return null;
    }

    //Split the selectors back up again
    rule.selectors = ruleString.split(',');

    return rule;
}
function resolveRules(rules){

    //Switch for handling different rule types
    rules = rules.reduce((acc, rule) => {
        switch(rule.type){
            case 'rule':
                rule = resolveRule(rule);
                if(rule) acc.push(rule);
                break;
            case 'media':
                rule.rules = resolveRules(rule.rules);
                acc.push(rule);
                break;
            //Passes the rule through untouched if we don't know what it is
            default:
                acc.push(rule);
                break;
        }

        return acc;
    }, []);
    return rules;

}

module.exports = function(source){
    let parsedCss = css.parse(source);

    this.async = true;

    if(parsedCss.type !== 'stylesheet')
        throw "ess-loader can only load stylesheets";

    parsedCss.stylesheet.rules = resolveRules(parsedCss.stylesheet.rules);

    this.callback(null, css.stringify(parsedCss));

    return;
};