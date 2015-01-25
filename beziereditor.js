/*
 * beziereditor.js from BezierEditor
 *
 * author: (c) 2015 Hayato Hashimoto <hayato.hashimoto@gmail.com>
 */

"use strict";
var rad2deg = function (x) { return x * 180 / Math.PI; };
var cube = function (x) { return x * x * x; };
var limit = function (min, max) { return function (a) { return (a < min) ? min : (a > max) ? max : a; }; };
var limit2 = function (min, max) { return function (a) { return (a < min) ? -Infinity : (a > max) ? Infinity : a; }; };
var mod_pos = function (x, y) { return ((x % y) >= 0) ? (x % y) : (x % y) + Math.abs(y); };
var snap = function (x, y, e) {
  return (mod_pos(x+e, y) <= 2*e) ?
    Math.floor((x+e) / y) * y : x; };
var svg = function (tag_name) {
  return document.createElementNS("http://www.w3.org/2000/svg", tag_name);
};
var assert_eq = function (m, x, y) {
  if (Math.abs(x - y) <= 0.001) {
    //console.log("assertion <" + m + "> passed", x, y);
    return true;}
  // console.log("assertion <" + m + "> failed", x, y);
  throw {message: "assertion <" + m + "> failed (" + x + " neq " + y + ")", toString: function() {return this.message;}};
};
var BezierEditor = function (svg_container) {
  this.svg = svg_container.children("svg");
  this.tooltip = svg_container.children(".tooltip");
  this.tooltip_text = this.tooltip.children(".tooltip_text");
  this.dimention = new vec2(this.svg.attr("width"), this.svg.attr("height"));
  this.viewbox =  [new vec2(0, 0), new vec2(this.svg.attr("width"), this.svg.attr("height"))];
  this.zoom = 1;
  this.canvas_dimention = new vec2(512, 1024);
  this.paths = [];
  this.selected_path = false;
  this.points = [];
  this.selection = [];
  this.position = vec2.fromCss(svg_container.position());
  this.drag_mode = "hold";
  var editor = this;
  this.svg.mousedown(function (e) {
    var m = editor.mouse_position(e);
    var p = editor.pagexy_to_svgxy(m);
    editor.op &&
    editor.op.on_mousedown(m, p);
    return false;});
  this.svg.mouseup(function (e) {
    var m = editor.mouse_position(e);
    var p = editor.pagexy_to_svgxy(m);
    editor.op &&
    editor.op.on_mouseup(m, p);
    return false;});
  this.svg.click(function (e) {
    var m = editor.mouse_position(e);
    var p = editor.pagexy_to_svgxy(m);
    editor.op &&
    editor.op.on_click(m, p);
    return false;});
  this.svg.mousemove(function (e) {
    var m = editor.mouse_position(e);
    var p = editor.pagexy_to_svgxy(m);
    editor.op &&
    editor.op.on_mousemove(m, p);
    return false;});
  $(document).keydown(function (e) {
    (editor.shortcuts[e.which])(editor, e);
    });
  this.grid = new vec2(50, 50);
  // 15 degrees
  this.angular_grid = Math.PI / 12;
  this.set_value("next_segment_type", "line");
  this.set_value("editing_mode", "add");
  this.set_value("mouse_mode", "none");
  this.snap = false;
  this.show_grid();
  this.op = false;
};

BezierEditor.prototype = {
  commands: {
     scroll:           function (editor, e) { editor.op = new ScrollOp(editor);}, // Space
     cubic_bezier:     function (editor, e) { editor.set_value("next_segment_type", "cubic"); editor.op = new AddPointOp(editor);}, // C
     grid:             function (editor, e) { editor.set_value("snap", true)}, // G
     nogrid:           function (editor, e) { editor.set_value("snap", false)}, // H
     curvature:        function (editor, e) { editor.op = new CurvatureOp(editor);}, // K
     line:             function (editor, e) { editor.set_value("next_segment_type", "line"); editor.op = new AddPointOp(editor);}, // L
     move:             function (editor, e) { editor.op = new MoveOp(editor); editor.op.fixed = e.shiftKey; }, // M
     quadratic_bezier: function (editor, e) { editor.set_value("next_segment_type", "quadratic"); editor.op = new AddPointOp(editor);}, // Q
     rotate:           function (editor, e) { editor.op = new RotateOp(editor); }, // R
     select:           function (editor, e) { editor.op = new SelectOp(editor); editor.set_value("mouse_mode", "select"); }, // S
     zoom:             function (editor, e) { editor.op = new ZoomOp(editor); editor.set_value("mouse_mode", "zoom"); }, // Z
  },
  apply_viewbox: function () {
    this.svg[0].setAttribute("viewBox", sprintf("%f, %f, %f, %f", this.viewbox[0].x, this.viewbox[0].y, this.viewbox[1].x, this.viewbox[1].y));
  },
  show_grid: function (v) {
    var g = $("#grid");
    g.empty();
    var x = 0, y = 0, i;
    var w = this.dimention.x, h = this.dimention.y;
    var grid_base = 10;
    var grid_factor = Math.pow(grid_base, Math.round(Math.log(this.zoom) / Math.log(grid_base)));
    var grid_x = grid_factor * this.grid.x;
    var grid_y = grid_factor * this.grid.x;
    for (i = 0; i < w / grid_x; i+=grid_base) {
      x = i * grid_x;
      g.append($(svg("line")).attr({"stroke-width": 2 * grid_factor, x1: x, y1: 0, x2: x, y2: h}));
    }
    for (i = 0; i < h / grid_y; i+=grid_base) {
      y = i * grid_y;
      g.append($(svg("line")).attr({"stroke-width": 2 * grid_factor, x1: 0, y1: y, x2: w, y2: y}));
    }
    x = 0, y = 0;
    for (i = 0; i < w / grid_x; i++) {
      x = i * grid_x;
      g.append($(svg("line")).attr({"stroke-width": grid_factor, x1: x, y1: 0, x2: x, y2: h}));
    }
    for (i = 0; i < h / grid_y; i++) {
      y = i * grid_y;
      g.append($(svg("line")).attr({"stroke-width": grid_factor, x1: 0, y1: y, x2: w, y2: y}));
    }
  },
  snap_to_grid: function (v) {
    if (this.snap) {
      var x_error = Math.min(5, 0.5 * this.grid.x), y_error = Math.min(5, 0.5 * this.grid.y);
      return new vec2(snap(v.x, this.grid.x, x_error), snap(v.y, this.grid.y, y_error));
    }
    return v;
  },
  angular_snap_to_grid : function (a) {
    var error = Math.min(Math.PI / 60, 0.3 * this.angular_grid);
    return snap(a, this.angular_grid, error);
  },
  shortcuts: {
    32: function (editor, e) { editor.op = new ScrollOp(editor);}, // Space
    65: function (editor, e) { editor.op = new AddPointOp(editor);}, // A
    67: function (editor, e) { editor.set_value("next_segment_type", "cubic"); editor.op = new AddPointOp(editor);}, // C
    71: function (editor, e) { editor.set_value("snap", true)}, // G
    72: function (editor, e) { editor.set_value("snap", false)}, // H
    75: function (editor, e) { editor.op = new CurvatureOp(editor);}, // K
    76: function (editor, e) { editor.set_value("next_segment_type", "line"); editor.op = new AddPointOp(editor);}, // L
    77: function (editor, e) { editor.op = new MoveOp(editor); editor.op.fixed = e.shiftKey; }, // M
    81: function (editor, e) { editor.set_value("next_segment_type", "quadratic"); editor.op = new AddPointOp(editor);}, // Q
    82: function (editor, e) { editor.op = new RotateOp(editor); }, // R
    83: function (editor, e) { editor.op = new SelectOp(editor); editor.set_value("mouse_mode", "select"); }, // S
    90: function (editor, e) { editor.op = new ZoomOp(editor); editor.set_value("mouse_mode", "zoom"); }, // Z
  },
  mouse_position: function (e) {
    return new vec2(e.pageX - this.position.x, e.pageY - this.position.y);
  }, 
  svg_element: function (object) {
    return $("#" + object.id);
  },
  start_path: function (x, y) {
    var path = new Path();
    this.paths.push(path);
    var point = new Point(x, y, path);
    this.points.push(point);
    path.only_point = point;
    var point_group = $("#svg_templates .point").clone();
    var path_svg = $("#svg_templates .path").clone();
    this.svg.append(path_svg);
    this.svg.append(point_group);
    path_svg.attr(path.svg_attr());
    point_group.attr(point.svg_attr());
    return path;
  },
  next_point: function (path, x, y) {
    var start = path.end_point(), segment;
    var end = new Point(x, y, path);
    this.points.push(end);
    switch (this.next_segment_type) {
      case "line":
        segment = new LinearPathSegment(start, end);
        break;
      case "quadratic":
        var p0 = start.p, p2 = end.p;
        var dp = p2.substract(p0);
        end.v = dp.mul(dp.div(start.v)).normalize();
        segment = new QuadraticBezierPathSegment(start, end);
        break;
      case "cubic":
        var p0 = start.p, p3 = end.p;
        var dp = p3.substract(p0);
        end.v = dp.mul(dp.div(start.v)).normalize();
        segment = new CubicBezierPathSegment(start, end);
        break;
    }
    start.parent_segments.push(segment);
    end.parent_segments.push(segment);
    segment.update();
    path.segments.push(segment);
    var start_group = this.svg_element(start), end_group = $("#svg_templates .point").clone();
    this.svg.append(end_group);
    start_group.attr(start.svg_attr());
    start_group.find(".roc_circle").attr(start.svg_attr_roc());
    end_group.attr(end.svg_attr());
    end_group.find(".roc_circle").attr(end.svg_attr_roc());
    this.svg_element(path).attr(path.svg_attr());
  },
  unselect_all: function (v) {
    this.selection = [];
    this.svg.find(".selection_marker").remove();
    this.svg.find(".selected").attr("class", function (i, c) {return c.replace("selected", " ");});
  },
  select: function (v) {
    var selection_marker = $("#svg_templates .selection_marker").clone();
    this.svg_element(v).prepend(selection_marker);
    this.svg_element(v).attr("class", function (i, c) { return (c + " selected").replace("  ", " "); }); // $.addClass is not working due to the difference between HTML DOM/SVG DOM
    this.selection.push(v);
  },
  pagexy_to_svgxy: function (m) {
    var ret = this.viewbox[0].add(new vec2(m.x * this.viewbox[1].x / this.dimention.x, m.y * this.viewbox[1].y / this.dimention.y));
    return ret;
  },
  svgxy_to_pagexy: function (p) {
    var d = p.substract(this.viewbox[0]);
    return new vec2(d.x * this.dimention.x / this.viewbox[1].x, d.y * this.dimention.y / this.viewbox[1].y);
  },
  set_value: function (attr, value) {
    $("." + attr).text(_t(attr, value));
    this[attr] = value;
  }
};

var __t = {
  "next_segment_type":
    {"line": "Line",
      "quadratic": "Quadratic Bezier",
      "cubic": "Cubic Bezier",
    },
  "editing_mode": {
    "add": "Add",
    "select": "Select",
  },
  "mouse_mode": {
    "none": "None",
    "rotate": "Rotate",
    "move": "Move",
    "move_fixed": "Move (fixed)",
    "curvature": "Adjust Curvature",
    "zoom": "Zoom",
  },
  "snap" : {
    true: "Snap to Grid",
    false: "No snap",
  },
};

var _t = function (a, b) {
  return __t[a][b];
};


var editor;

$( function () {
  editor = new BezierEditor($("#svg_container"));
  $(".menu").click(function () {});
});
