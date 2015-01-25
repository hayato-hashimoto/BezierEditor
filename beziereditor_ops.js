/*
 * beziereditor_ops from BezierEditor
 *
 * author: (c) 2015 Hayato Hashimoto <hayato.hashimoto@gmail.com>
 *
 */

var editor_op = (function () {
  var nothing = function () {};
  var proto = {
    on_click:     nothing,
    on_mousedown: nothing,
    on_mouseup  : nothing,
    on_mousemove: nothing,
    start: function () {
      this.editor.tooltip.show();
    },
    finish: function () {
      this.editor.tooltip_text.empty();
      this.editor.tooltip.hide();
    },
  };
  return function (to_bless) {
    return Object.create(proto, to_bless);
  };})();

var drag_op = (function () {
  var nothing = function () {};
  var proto = {
    on_drag:        { value: nothing },
    on_drag_start:  { value: nothing },
    on_drag_finish: { value: nothing },
    on_click:       { value: nothing },
    on_mousedown: { value: function (m, p) {
      if (editor.drag_mode == "hold") {
        this.is_dragging = true;
        this.start();
        this.on_drag_start(m, p);
      } else {
        this.is_dragging = !this.is_dragging;
        if (this.is_dragging) {
          this.start();
          this.on_drag_start(m, p);
        } else {
          this.finish();
          this.on_drag_finish(m, p);
        }
      }
    }},
    on_mouseup: { value: function (m, p) {
      if (editor.drag_mode == "hold") {
        this.is_dragging = false;
        this.finish();
        this.on_drag_finish(m, p);
      }
    }},
    on_mousemove: { value: function (m, p) {
      if (this.is_dragging) {
        this.on_drag(m, p);
        editor.tooltip.offset(m.substract(new vec2(0, 50)).css());
        editor.tooltip_text.text(this);
      }
    }},
  };
  return function (to_bless) {
    return Object.create(editor_op(proto), to_bless);
  };})();

var SelectOp = function (editor) {
  this.editor = editor;
};
SelectOp.prototype = editor_op({
  on_click: { value: function (m, p) {
    var editor = this.editor;
    editor.unselect_all();
    editor.points.forEach(function (v) {
      if (v.p.distance(p) <= 8) {
        editor.select(v);
      }});
  }},
  toString: { value: function () {
    return "";
  }},
});

var AddPointOp = function (editor) {
  this.editor = editor;
  this.last = false;
};
AddPointOp.prototype = editor_op({
  on_click: { value: function (m, p) {
    var editor = this.editor;
    p = editor.snap_to_grid(p);
    this.last = p;
    if (editor.selected_path) {
      editor.next_point(editor.selected_path, p.x, p.y);
    } else {
      this.start();
      editor.selected_path = editor.start_path(p.x, p.y);
    }}},
  on_mousemove: { value: function (m, p) {
    if (this.last) {
      this.diff = p.substract(this.last);
      editor.tooltip.offset(m.css());
      editor.tooltip_text.text(this);
    }
  }},
  toString: { value: function () {
    return sprintf("%.1f, %.1f", this.diff.x, this.diff.y);
  }},
});

var MoveOp = function (editor) {
  this.editor = editor;
};
MoveOp.prototype = drag_op({
  on_drag_start: { value: function (m, p) {
    var editor = this.editor;
    editor.unselect_all();
    editor.points.forEach(function (v) {
      if (v.p.distance(p) <= 8) {
        editor.select(v);
      }});
    this.original_positions = editor.selection.map(function (p) { return p.p; });
    this.vertices = editor.selection;
    this.anchor1 = p;
    this.input = new vec2(0, 0);
    this.normal = this.vertices[0].v.rotate(Math.PI / 2);
  }},
  on_drag: {value: function (m, p) {
    var i;
    var input = p.substract(this.anchor1);
    var editor = this.editor;
    input = this.fixed ? this.normal.scale(this.normal.dot(input)) : input;
    this.input = input;
    for (i = 0; i < this.vertices.length; i++) {
      var v = this.vertices[i];
      v.p = editor.snap_to_grid(this.original_positions[i].add(input));
      v.parent_segments.forEach ( function(s) {
        s.update();
      });
      editor.svg_element(v).attr(v.svg_attr());
      editor.svg_element(v).find(".roc_circle").attr(v.svg_attr_roc());
      editor.svg_element(v.parent_path).attr(v.parent_path.svg_attr());
    }
  }},
  toString: { value: function () {
    return sprintf("Move (%.1f, %.1f)", this.input.x, this.input.y);
  }},
});

var ZoomOp = function (editor) {
  this.editor = editor;
};

ZoomOp.prototype = drag_op({
  on_drag_start: {value: function (m, p) {
    this.init_zoom = editor.zoom;
    this.zoom = editor.zoom;
    this.anchor1 = m;
    this.anchor2 = editor.viewbox[0].add(editor.viewbox[1].scale(0.5));
  }},
  on_drag_finish: { value: function (m, p) {
    var editor = this.editor;
    editor.zoom = this.zoom;
    editor.show_grid();
  }},
  on_drag: { value: function (m, p) {
    var editor = this.editor;
    var input = m.substract(this.anchor1).y;
    this.zoom = this.init_zoom * Math.pow(2, (input / 200)); // zoom inverse
    editor.viewbox[1] = editor.dimention.scale(this.zoom);
    editor.viewbox[0] = this.anchor2.substract(editor.viewbox[1].scale(0.5));
    editor.apply_viewbox();
  }},
  toString: { value: function () {
    return sprintf("Zoom (%.1f%)", 100 /this.zoom);
  }},
});

var ScrollOp = function (editor) {
  this.editor = editor;
};

ScrollOp.prototype = drag_op({
  on_drag_start: {value: function (m, p) {
    this.anchor1 = m;
    this.anchor2 = editor.viewbox[0];
  }},
  on_drag_finish: { value: function (m, p) {
  }},
  on_drag: { value: function (m, p) {
    var editor = this.editor;
    var input = this.anchor1.substract(m).scale(editor.zoom);
    editor.viewbox[0] = this.anchor2.add(input);
    editor.apply_viewbox();
  }},
  toString: { value: function () {
    return "";
  }},
});

var RotateOp = function (editor) {
  this.editor = editor;
};
RotateOp.prototype = drag_op({
  on_drag_start: {value: function (m, p) {
    var v = this.editor.selection[0];
    this.anchor1 = v.v.arg();
    var a =  m.substract(this.editor.svgxy_to_pagexy(v.p));
    this.anchor2 = (a.norm() == 0) ? 0 : a.arg();
    this.angle = 0;
  }},
  on_drag: { value: function (m, p) {
    var editor = this.editor;
    if (editor.selection.length == 0) { return; }
    var v = editor.selection[0];
    m = m.substract(editor.svgxy_to_pagexy(v.p));
    if (m.norm() == 0) { return; }
    var angle = m.arg() + this.anchor1 - this.anchor2;
    angle = editor.snap ? editor.angular_snap_to_grid(angle) : angle;
    this.angle = angle;
    v.v = new vec2(1, 0).rotate(angle);
    v.parent_segments.forEach(function(s) {
      s.update();
    });
    editor.svg_element(v).attr(v.svg_attr());
    editor.svg_element(v).find(".roc_circle").attr(v.svg_attr_roc());
    editor.svg_element(v.parent_path).attr(v.parent_path.svg_attr());
  }},
  toString: {value: function () {
    return sprintf("Rotate %.1f", rad2deg(this.angle));
  }},
});

var CurvatureOp = function (editor) {
  this.editor = editor;
};
CurvatureOp.prototype = drag_op({
  on_drag_start: {value: function (m, p) {
    var v = this.editor.selection[0];
    this.anchor1 = v.r;
    this.anchor2 = - m.substract(editor.svgxy_to_pagexy(v.p)).cross(v.v); 
  }},
  on_drag: { value: function (m, p) {
    if (editor.selection.length == 0) { return; }
    var v = editor.selection[0];
    var input = (- m.substract(editor.svgxy_to_pagexy(v.p)).cross(v.v)) - this.anchor2;
    v.r = this.anchor1 + limit2(-4096, 4096)(20*(input/20 + cube(input / 80)));
    this.curvature = v.r;
    var invalid = false;
    v.parent_segments.forEach(function(s) {
      s.update();
      invalid = invalid || !(s.cpoints);
    });
    editor.svg_element(v).attr(v.svg_attr());
    if (invalid) {
      editor.svg_element(v).attr("class", function (i, c) {return (c.replace("invalid", " ") + " invalid").replace("  ", " "); });
    } else {
      editor.svg_element(v).attr("class", function (i, c) {return c.replace("invalid", " ");});
    }
    editor.svg_element(v).find(".roc_circle").attr(v.svg_attr_roc());
    editor.svg_element(v.parent_path).attr(v.parent_path.svg_attr());
  }},
  toString: {value: function () {
    return sprintf("Curvature %.1f", rad2deg(this.curvature));
  }},
});
