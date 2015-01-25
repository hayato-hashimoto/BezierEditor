"use strict";
var breakpoint = 1;
var sign = function (x) {
  breakpoint++;
  if (!(breakpoint % 100000)) { alert("breakpoint reached"); }
  return x < 0 ? -1 : x > 0 ? 1 : 0;
};

var zipWithDefault = function (proc, d, a1, a2) {
  var i, ret = [];
  var l = Math.max(a1.length, a2.length);
  for (i = 0; i < l; i++) {
    var v1 = (typeof a1[i] == "undefined") ? d : a1[i], v2= (typeof a2[i] == "undefined") ? d : a2[i];
    ret.push(proc(v1, v2));
  }
  return ret;
};

// shorthand
var poly = function () { return new Polynomial([].splice.call(arguments, 0)); };

var Polynomial = function (coeffs_reverse) {
  this.coeffs = coeffs_reverse.reverse();
};

Polynomial.prototype = {
  toString: function () {
    var i = 0, ret = "";
    for (i = this.degree(); i > 0; i--) {
      ret += this.coeffs[i];
      if (i == 1) {
        ret += "x" + " + ";
      } else {
        ret += "x^" + i + " + ";
      }
    }
    ret += this.coeffs[0];
    return ret;
  },
  eval: function (x) {
    var i, val = 0;
    for (i = this.degree(); i > 0; i--) {
      val += this.coeffs[i];
      val *= x;
    }
    val += this.coeffs[0];
    return val;
  },
  degree: function () {
    var i;
    for (i = this.coeffs.length - 1; i >= 0; i--) {
      if (this.coeffs[i] != 0) return i;
    }
    return -Infinity;
  },
  add: function (x) {
    var i, ret = new Polynomial([0]);
    ret.coeffs = zipWithDefault(function (x, y) { return x + y; }, 0, this.coeffs, x.coeffs);
    return ret;
  },
  substract: function (x) {
    var i, ret = new Polynomial([0]);
    ret.coeffs = zipWithDefault(function (x, y) { return x - y; }, 0, this.coeffs, x.coeffs);
    return ret;
  },
  multiply: function (x) {
    var i, j, ret = new Polynomial([0]);
    for (i = x.degree(); i > 0; i--) {
      ret = ret.add(this.multiply_scaler(x.coeffs[i]));
      ret.coeffs.unshift(0);
    }
    ret = ret.add(this.multiply_scaler(x.coeffs[i]));
    return ret;
  },
  multiply_scaler: function (x) {
    var j, ret = new Polynomial([0]);
    ret.coeffs = this.coeffs.map(function (y){return x * y;});
    return ret;
  },
  multiply_x: function (p) {
    var i, ret = new Polynomial([0]);
    ret.coeffs = this.coeffs.concat();
    for (i = 0; i < p; i++) {
      ret.coeffs.unshift(0);
    }
    return ret;
  },
  divide: function (x) {
    var i, ret = new Polynomial([0]), tmp = this;
    if (x.degree() < 0) {
      throw {message: "Polynomial division by zero"};
    }
    for (i = this.degree(); i >= x.degree(); i--) {
      ret.coeffs[i - x.degree()] = tmp.coeffs[i] / x.coeffs[x.degree()];
      tmp = tmp.substract(x.multiply_scaler(ret.coeffs[i - x.degree()]).multiply_x(i - x.degree()));
    }
    return ret;
  },
  diff: function () {
    var i, ret = poly(0);
    for (i = this.degree(); i >= 1; i--) {
      ret.coeffs[i-1] = i * this.coeffs[i];
    }
    return ret;
  },
  // monotonic interval
  solve_in_interval : function (min, max) {
    var i;
    for (i = this.degree(); i >= 0; i--) {
      if (Number.isNaN(this.coeffs[i])) return [];
    }
    if (this.eval(min) == 0) return min;
    if (this.eval(max) == 0) return max;
    var max_sign = sign(this.eval(max));
    if (sign(this.eval(max)) * sign(this.eval(min)) == 1) {
      return [];
    }
    while (true) {
      var middle = (min + max) / 2;
      if ((max - min) / Math.min(Math.abs(min), Math.abs(max)) < (1 / (1 << 24))) {
        return [min];
      }
      if ((max_sign * sign(this.eval(middle))) == 1) {
        max = middle;
      } else {
        min = middle;
    }}},
  solve: function () {
    var coeffs = this.coeffs;
    if (this.degree() <= 0) {
      return [];
    }
    if (this.degree() == 1) {
      return [-coeffs[1]/coeffs[0]];
    }
    if (this.degree() == 2) {
      var det = coeffs[1]*coeffs[1] - 4*coeffs[2]*coeffs[0];
      return (det < 0) ? [] :
             (det == 0) ? [ -coeffs[1] / (2*coeffs[2]) ] :
                          [ (-coeffs[1] + Math.sqrt(det)) / (2*coeffs[2]), (-coeffs[1] - Math.sqrt(det)) / (2*coeffs[2])];
    }
    var i, r = 0;
    for (i = 0; i < this.degree() ;i++) {
      r += Math.abs(this.coeffs[i]);
    }
    r = r / Math.abs(this.coeffs[this.degree()]);
    if (this.degree() % 2 == 0) {
      var intervals = this.diff().solve().sort(function (x, y) { return (x > y); });
      var ret = [];
      intervals.unshift(-r);
      intervals.push(r);
      for (i = 0; i <= intervals.length - 2; i++) {
        ret = ret.concat(this.solve_in_interval(intervals[i], intervals[i+1]));
      }
      console.log(this+"", ret);
      return ret;
    } else {
      var solution = this.solve_in_interval(-r, r);
      var others =  this.divide(poly(1, -solution)).solve();
      return others.concat(solution);
    }
  },
};
