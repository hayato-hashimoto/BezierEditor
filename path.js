/* 
 * path.js from BezierEditor
 * 
 * author: (c) 2015 Hayato Hashimoto <hayato.hashimoto@gmail.com>
 * 
 */

var path_segment = {
  serialize_data: function () {
    sprintf("(%s %f %f)", this.end.id, this.start.id);
  },
};

var LinearPathSegment = function (start, end) {
  this.start = start;
  this.end = end;
};

LinearPathSegment.prototype = {
  start_point: function () {
    return this.start;
  },
  end_point: function () {
    return this.end;
  },
  type: "line",

  svg_data: function () {
    return "L " + this.end_point().p.x + " " + this.end_point().p.y + " ";
  },
  direction: function (t) {
    return this.end.p.substract(this.start.p).normalize();
  }, 
  curvature: function (t) {
    return 0;
  },
  update: function (t) {
    this.start.v = this.direction(0);
    this.start.r = 1 / this.curvature(0);
    this.end.v = this.direction(1);
    this.end.r = 1 / this.curvature(1);
  },
};

var QuadraticBezierPathSegment = function (start, end) {
  this.start = start;
  this.end = end;
};

QuadraticBezierPathSegment.prototype = {
  start_point: function () {
    return this.start;
  },
  end_point: function () {
    return this.end;
  },
  type: "quadratic",
  p1: function () { // deprecated
    var p = this.end.p.substract(this.start.p);
    var a = - p.cross(this.start.v) / this.end.v.cross(this.start.v);
    var q = this.end.p.add(this.end.v.scale(a));
    return q;
  },
  control_points: function () {
    var p = this.end.p.substract(this.start.p);
    var a = - p.cross(this.start.v) / this.end.v.cross(this.start.v);
    var q = this.end.p.add(this.end.v.scale(a));
    return [this.start.p, q, this.end.p];
  },
  svg_data: function () {
    var q = this.p1();
    return "Q " + q.x + " " + q.y + " " + this.end.p.x + " " + this.end.p.y + " ";
  },
  direction: function (t) {
    var p0 = this.start.p, p1 = this.p1(), p2 = this.end.p;
    var db1 = p2.substract(p1).scale(2 * t).add(p1.substract(p0).scale(2 * (1 - t)));
    return db1.normalize();
  },
  curvature: function (t) {
    var p0 = this.start.p, p1 = this.p1(), p2 = this.end.p;
    var db1 = p2.substract(p1).scale(2 * t).add(p1.substract(p0).scale(2 * (1 - t)));
    var db2 = (p2.add(p1.scale(-2)).add(p0)).scale(2);
    return  db1.cross(db2) / cube(db1.norm());
  },
  update: function (t) {
    this.start.v = this.direction(0);
    this.start.r = 1 / this.curvature(0);
    this.end.v = this.direction(1);
    this.end.r = 1 / this.curvature(1);
  },
};

var CubicBezierPathSegment = function (start, end) {
  this.start = start;
  this.end = end;
  this.cpoints = false;
};

CubicBezierPathSegment.prototype = {
  start_point: function () {
    return this.start;
  },
  end_point: function () {
    return this.end;
  },
  type: "cubic",
  control_points: function () {
    var p = this.end.p.substract(this.start.p);
    var r = 1 / this.start.r, s = 1 / this.end.r, a = this.start.v.cross(p), b = - this.start.v.cross(this.end.v), c = - this.end.v.cross(p);
    var x, y, ys;
    if (r == 0) {
      y = -a/b;
      x = (3*s*y*y - 2*c) / (2*b);
    } else if (s == 0) {
      x = -c/b;
      y = (3*r*x*x - 2*a) / (2*b);
    } else {
      ys = poly(27*r*s*s, 0, -36*s*r*c, -8*b*b*b, 12*r*c*c - 8*b*b*a).solve();
      ys = ys.filter(function (x) { return x > 0;});
      y = s > 0 ? Math.max.apply(null, ys) : Math.min.apply(null, ys);
      x = (3*s*y*y - 2*c) / (2*b);
      console.log(x, y);
    }
    if (x > 0 && y > 0) {
      var p1 = this.start.p.add(this.start.v.scale(x));
      var p2 = this.end.p.add(this.end.v.scale(-y));
      return [this.start.p, p1, p2, this.end.p];
    }
    return false;
  },
  svg_data: function () {
    var p = this.cpoints;
    if (p) {
      return "C " + p[1].x + " " + p[1].y + " " + p[2].x + " " + p[2].y + " " + p[3].x + " " + p[3].y + " ";
    } else {
      return "L " + this.end.p.x + " " + this.end.p.y + " ";
    }
  },
  direction: function (t) {
    var p = this.cpoints;
    var db1 = p[3].substract(p[2]).scale(3 * t * t)
      .add(p[2].substract(p[1]).scale(6 * t * (1 - t)))
      .add(p[1].substract(p[0]).scale(3 * (1 - t) * (1 - t)));
    return db1.normalize();
  },
  curvature: function (t) {
    var p = this.cpoints;
    var db1 = p[3].substract(p[2]).scale(3 * t * t)
      .add(p[2].substract(p[1]).scale(6 * t * (1 - t)))
      .add(p[1].substract(p[0]).scale(3 * (1 - t) * (1 - t)));
    var db2 = ((p[3].add(p[2].scale(-2)).add(p[1])).scale(6 * t))
          .add((p[2].add(p[1].scale(-2)).add(p[0])).scale(6 * (1 - t)));
    return  db1.cross(db2) / cube(db1.norm());
  },
  update: function (t) {
    this.cpoints = this.control_points();
    if (this.cpoints) {
      this.start.v = this.direction(0);
      this.start.r = 1 / this.curvature(0);
      this.end.v = this.direction(1);
      this.end.r = 1 / this.curvature(1);
    }
  },
};

var Path = (function () {
  var counter_path = 0;
  return function () {
    this.segments = [];
    this.id = "path" + counter_path++;
  };})();

Path.prototype = {
  svg_attr: function (type) {
    var d = "M " + this.start_point().p.x + " " + this.start_point().p.y + " ";
    this.segments.forEach(function (s) {
        d += s.svg_data();
      });
    return {id: this.id, d: d};
  },
  start_point: function () {
    return (this.segments.length) ? this.segments[0].start_point() : this.only_point;
  },
  end_point: function () {
    return (this.segments.length) ? this.segments[this.segments.length-1].end_point() : this.only_point;
  },
};


var Point = (function () {
  var counter_point = 0;
  return function (x, y, p) {
    this.id = "point" + counter_point++;
    this.p = new vec2(x, y);
    this.v = new vec2(1, 0);
    this.r = 1000;
    this.parent_path = p;
    this.parent_segments = [];
  };})();

Point.prototype = {
 svg_attr: function () {
   return Number.isNaN(this.v.x) ?
     {transform: "matrix( 1, 0, 0, 1, " + this.p.x + " ," + this.p.y + ")", id: this.id} :
     {transform: "matrix(" + this.v.x + "," + this.v.y + ", " + (- this.v.y) + ", " + this.v.x + ", " + this.p.x + " ," + this.p.y + ")", id: this.id};
 },
 svg_attr_roc: function () {
   if (this.r > 4096 || this.r < -4096) {
     return { r: 0, cx: -10, cy: -10 };
   }
   return { r: Math.abs(this.r), cx: 0, cy: this.r };
 },
};
