import * as _ from 'lodash';

export default function filter(array, expression, comparator, anyPropertyKey) {
  if (!_.isArrayLike(array)) {
    if (array === null) {
      return array;
    }
    console.error('Expected array but received: {0}', array);
  }

  anyPropertyKey = anyPropertyKey || '$';
  var expressionType = getTypeForFilter(expression);
  var predicateFn;
  var matchAgainstAnyProp;

  switch (expressionType) {
    case 'function':
      predicateFn = expression;
      break;
    case 'boolean':
    case 'null':
    case 'number':
    case 'string':
      matchAgainstAnyProp = true;
    // falls through
    case 'object':
      predicateFn = createPredicateFn(
        expression,
        comparator,
        anyPropertyKey,
        matchAgainstAnyProp
      );
      break;
    default:
      return array;
  }

  return Array.prototype.filter.call(array, predicateFn);
}

function createPredicateFn(
  expression,
  comparator,
  anyPropertyKey,
  matchAgainstAnyProp
) {
  var shouldMatchPrimitives =
    _.isObject(expression) && anyPropertyKey in expression;
  var predicateFn;

  if (comparator === true) {
    comparator = equals;
  } else if (!_.isFunction(comparator)) {
    comparator = function(actual, expected) {
      if (_.isUndefined(actual)) {
        // No substring matching against `undefined`
        return false;
      }
      if (actual === null || expected === null) {
        // No substring matching against `null`; only match against `null`
        return actual === expected;
      }
      if (
        _.isObject(expected) ||
        (_.isObject(actual) && !hasCustomToString(actual))
      ) {
        // Should not compare primitives against objects, unless they have custom `toString` method
        return false;
      }

      actual = _.lowerCase(actual);
      expected = _.lowerCase(expected);
      return actual.indexOf(expected) !== -1;
    };
  }

  predicateFn = function(item) {
    if (shouldMatchPrimitives && !_.isObject(item)) {
      return deepCompare(
        item,
        expression[anyPropertyKey],
        comparator,
        anyPropertyKey,
        false
      );
    }
    return deepCompare(
      item,
      expression,
      comparator,
      anyPropertyKey,
      matchAgainstAnyProp
    );
  };

  return predicateFn;
}

function deepCompare(
  actual,
  expected,
  comparator,
  anyPropertyKey,
  matchAgainstAnyProp,
  dontMatchWholeObject
) {
  var actualType = getTypeForFilter(actual);
  var expectedType = getTypeForFilter(expected);

  if (expectedType === 'string' && expected.charAt(0) === '!') {
    return !deepCompare(
      actual,
      expected.substring(1),
      comparator,
      anyPropertyKey,
      matchAgainstAnyProp
    );
  } else if (_.isArray(actual)) {
    // In case `actual` is an array, consider it a match
    // if ANY of it's items matches `expected`
    return actual.some(function(item) {
      return deepCompare(
        item,
        expected,
        comparator,
        anyPropertyKey,
        matchAgainstAnyProp
      );
    });
  }

  switch (actualType) {
    case 'object':
      var key;
      if (matchAgainstAnyProp) {
        for (key in actual) {
          // Under certain, rare, circumstances, key may not be a string and `charAt` will be undefined
          // See: https://github.com/angular/angular.js/issues/15644
          if (
            key.charAt &&
            key.charAt(0) !== '$' &&
            deepCompare(actual[key], expected, comparator, anyPropertyKey, true)
          ) {
            return true;
          }
        }
        return dontMatchWholeObject
          ? false
          : deepCompare(actual, expected, comparator, anyPropertyKey, false);
      } else if (expectedType === 'object') {
        for (key in expected) {
          var expectedVal = expected[key];
          if (_.isFunction(expectedVal) || _.isUndefined(expectedVal)) {
            continue;
          }

          var matchAnyProperty = key === anyPropertyKey;
          var actualVal = matchAnyProperty ? actual : actual[key];
          if (
            !deepCompare(
              actualVal,
              expectedVal,
              comparator,
              anyPropertyKey,
              matchAnyProperty,
              matchAnyProperty
            )
          ) {
            return false;
          }
        }
        return true;
      } else {
        return comparator(actual, expected);
      }
    case 'function':
      return false;
    default:
      return comparator(actual, expected);
  }
}

// Used for easily differentiating between `null` and actual `object`
function getTypeForFilter(val) {
  return val === null ? 'null' : typeof val;
}

function hasCustomToString(obj) {
  return _.isFunction(obj.toString) && obj.toString !== toString;
}
