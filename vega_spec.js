vega.transforms.label = vegaLabel.label;

const CATEGORICAL_COLORS = ["#71bb75", "#a67fb6", "#333"];

const DEFAULT_VEGA_SPEC = {
  "$schema": "https://vega.github.io/schema/vega/v5.json",
  "autosize": "fit",
  "padding": 0,
  "width": 470,
  "height": 210,
  "data": [
    {
      "name": "data_0",
      "values": [],
      "transform": [
        {
          "type": "filter",
          "expr": "datum[\"x\"] !== null && !isNaN(datum[\"x\"]) && datum[\"y\"] !== null && !isNaN(datum[\"y\"])"
        }
      ]
    }
  ],
  "signals": [
    {
      "name": "hover",
      "on": [
        {"events": "mouseover", "update": "datum && (datum.datum || datum)"},
        {"events": "mouseout", "update": "null"},
      ]
    },
    {
      "name": "cell_stroke",
      "value": null,
      "on": [
        {"events": "dblclick", "update": "cell_stroke ? null : 'brown'"},
        {"events": "mousedown!", "update": "cell_stroke"}
      ]
    }
  ],
  "marks": [
    {
      "type": "group",
      "from": {
        "facet": {
          "data": "data_0",
          "name": "facet",
          "groupby": "model"
        }
      },
      "encode": {
        "update": {
          "x": {"scale": "model", "field": "model"},
          "y": {"value": 0},
          "width": {"scale": "model", "band": true},
          "height": {"signal": "height"},
          "stroke": {"value": "#999"},
          "clip": {"value": true}
        }
      },

      "signals": [
        {"name": "width", "update": "bandwidth('model')"},
        {"name": "height", "value": 210}
      ],

      "scales": [
        {
          "name": "x",
          "type": "linear",
          "domain": {"data": "facet", "field": "x"},
          "range": [0, {"signal": "width"}],
          "nice": true,
          "zero": true
        },
        {
          "name": "y",
          "type": "linear",
          "domain": {"data": "facet", "field": "y"},
          "range": [{"signal": "height"}, 0],
          "nice": true,
          "zero": true
        }
      ],

      "marks": [
        {
          "name": "points",
          "type": "symbol",
          "style": ["point"],
          "from": {"data": "facet"},
          "encode": {
            "update": {
              "x": {"scale": "x", "field": "x"},
              "y": {"scale": "y", "field": "y"},
              "opacity": {"value": 0},
            }
          }
        },
        {
          "type": "path",
          "name": "cell",
          "from": {"data": "points"},
          "encode": {
            "enter": {
              "fill": {"value": "transparent"},
              "strokeWidth": {"value": 0.35},
            },
            "update": {
              "path": {"field": "path"},
              "stroke": {"signal": "cell_stroke"}
            }
          },
          "transform": [{
            "type": "voronoi",
            "x": {"expr": "datum.datum.x"},
            "y": {"expr": "datum.datum.y"},
            "size": [{"signal": "width"}, {"signal": "height"}]
          }]
        },
        {
          "type": "symbol",
          "style": ["point"],
          "from": {"data": "facet"},
          "encode": {
            "update": {
              "x": {"scale": "x", "field": "x"},
              "y": {"scale": "y", "field": "y"},
              "opacity": {"signal": "datum.color === 'selected_word' || (!hover || (hover && hover.text === datum.text)) ? 0.7 : 0.2"},
              "fill": {"scale": "color", "field": "color"},
              "stroke": {"value": "transparent"},
              "cursor": {"value": "pointer"},
              "size": {"signal": "datum.color === 'selected_word' ? 100 : 60"}
            }
          }
        },
        {
          "name": "labels",
          "type": "text",
          "from": {"data": "points"},
          "encode": {
            "update": {
              "fill": {"scale": "color", "field": "datum.color"},
              "text": {"field": "datum.text"},
              "fontSize": {"value": 12},
              "fillOpacity": {"signal": "datum.datum.color === 'selected_word' || (!hover || (hover && hover.text === datum.datum.text)) ? 1 : 0.2"},
              "fontWeight": {"signal": "datum.datum.color === 'selected_word' || (hover && hover.text === datum.datum.text) ? 'bold' : 'normal'"},
              "cursor": {"value": "pointer"},
            }
          },
          "transform": [
            {
              "type": "label",
              "offset": 2,
              "size": [{"signal": "width"}, {"signal": "height"}],
              "as": ["x", "y", "labelOpacity", "align", "baseline", "originalOpacity", "transformed"]
            },
            {
              "type": "formula",
              "as": "opacity",
              "expr": "datum.datum.datum.color === 'selected_word' || (hover && hover.text === datum.datum.datum.text) ? 1 : datum.labelOpacity"
            },
            {
              "type": "formula",
              "as": "x",
              "expr": "datum.datum.datum.color === 'selected_word' || (!datum.x && hover && hover.text === datum.datum.datum.text) ? scale('x', datum.datum.datum.x) + 5 : datum.x"
            },
            {
              "type": "formula",
              "as": "y",
              "expr": "datum.datum.datum.color === 'selected_word' || (!datum.y && hover && hover.text === datum.datum.datum.text) ? scale('y', datum.datum.datum.y) + 5 : datum.y"
            }
          ]
        }
      ]
    }
  ],
  "scales": [
    {
      "name": "model",
      "type": "band",
      "domain": {"data": "data_0", "field": "model"},
      "range": "width",
      "padding": 0
    },
    {
      "name": "color",
      "type": "ordinal",
      "domain": ["intersection", "difference", "selected_word"],
      "range": CATEGORICAL_COLORS
    }
  ]
};
