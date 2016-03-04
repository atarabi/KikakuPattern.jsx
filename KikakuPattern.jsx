/*
 *  KikakuPattern.jsx v1.0.0 / ScriptUI
 *
 *  Author: Kareobana(http://atarabi.com/)
 *  License: MIT
 *  Dependencies:
 *    Kikaku.jsx 0.6.5
 */
(function (global) {
    //Lib
    var Utils = KIKAKU.Utils, UIBuilder = KIKAKU.UIBuilder;
    //Constants
    var PARAM = {
        TRANSFORM: 'Transform',
        LAYER: 'Layer',
        SOURCE: 'Source',
        COPY: 'Copy',
        PASTE: 'Paste',
        TRANSFORM_END: 'Transform End',
        GLOBAL_SHAPE: 'Global Shape',
        CONVERT: 'Convert',
        GLOBAL_SHAPE_END: 'Global Shape End'
    };
    var KIKAKU_PATTERN_NAME = 'KikakuPattern';
    var MATCH_NAME = {
        ANCHOR: 'ADBE Anchor Point',
        POSITION: 'ADBE Position',
        POSITION_X: 'ADBE Position_0',
        POSITION_Y: 'ADBE Position_1',
        SCALE: 'ADBE Scale',
        ROTATE_Z: 'ADBE Rotate Z',
        OPACITY: 'ADBE Opacity'
    };
    var TRANSFORM_MATCHNAMES = [MATCH_NAME.ANCHOR, MATCH_NAME.POSITION, MATCH_NAME.SCALE, MATCH_NAME.ROTATE_Z, MATCH_NAME.OPACITY];
    var EFFECT_PARAM = {
        TRANSFORM_START: 157,
        TRANSFORM_END: 163,
        SHAPE_NUMBER: 169,
        SHAPE_START: 170,
        GLOBAL_SHAPE_SCALE: 603,
        GLOBAL_SHAPE_HUE: 604,
        GLOBAL_SHAPE_LIGHTNESS: 605,
        GLOBAL_SHAPE_SATURATION: 606,
        GLOBAL_SHAPE_OPACITY: 607,
        GLOBAL_SHAPE_PHASE: 608
    };
    var SHAPE = {
        LINE: 1,
        CIRCLE: 2,
        POLYGON: 3,
        INPUT: 4,
        LAYER: 5
    };
    var SHAPE_PARAM = {
        SIZE: 1,
        USE_SCALE: 2,
        SCALE: 3,
        SHAPE: 10,
        TONER: 26,
        COLOR: 30,
        STROKE_COLOR: 31,
        OPACITY: 38,
        FILL_TYPE: 41,
        PHASE: 43,
        NUM: 54
    };
    var TONER = {
        NONE: 1,
        HLS: 2,
        FILL: 3,
        TINT: 4,
        TRITONE: 5,
        HUE: 6
    };
    var FILL_TYPE = {
        FILL: 1,
        STROKE: 2,
        FILL_AND_STROKE: 3
    };
    //Class
    var Transformer = (function () {
        function Transformer(builder) {
            this._layer = null;
            this._source = null;
        }
        Transformer.prototype.clear = function () {
            this._layer = null;
            builder.set(PARAM.LAYER, '');
            this._source = null;
            builder.set(PARAM.SOURCE, '');
        };
        Transformer.prototype.copy = function () {
            var layer = Utils.getSelectedLayer();
            if (!layer) {
                return this.clear();
            }
            this._layer = layer;
            builder.set(PARAM.LAYER, layer.name);
            var effect = findEffectByMatchname(layer, KIKAKU_PATTERN_NAME);
            if (effect) {
                this._source = effect.name;
                builder.set('Source', effect.name);
            }
            else {
                builder.set('Source', 'Transform');
            }
        };
        Transformer.prototype.paste = function () {
            var source_layer = this._layer;
            if (!source_layer || !isValid(source_layer)) {
                return this.clear();
            }
            var target_layer = Utils.getSelectedLayer();
            if (!target_layer) {
                throw 'Select a target layer.';
            }
            if ((source_layer !== target_layer) && (source_layer.name === target_layer.name)) {
                throw 'Rename a layer name.';
            }
            if (this._source) {
                this.pasteFromEffect(source_layer, target_layer);
            }
            else {
                this.pasteFromTransform(source_layer, target_layer);
            }
        };
        Transformer.prototype.pasteFromEffect = function (source_layer, target_layer) {
            var source_effect = findEffectByName(source_layer, KIKAKU_PATTERN_NAME, this._source, false);
            if (!source_effect) {
                return this.clear();
            }
            var target_effects = findEffectsByMatchname(target_layer, KIKAKU_PATTERN_NAME);
            var prefix = this.generateExpressionPrefix(source_layer, target_layer) + ("effect(\"" + source_effect.name + "\")");
            if (target_effects.length) {
                Utils.forEach(target_effects, function (target_effect) {
                    for (var i = EFFECT_PARAM.TRANSFORM_START + 1; i < EFFECT_PARAM.TRANSFORM_END; i++) {
                        var property = target_effect.property(i);
                        property.expression = prefix + "(" + i + ")";
                        ;
                    }
                });
            }
            else {
                var target_transform = target_layer.transform;
                for (var i = EFFECT_PARAM.TRANSFORM_START + 1, j = 0; i < EFFECT_PARAM.TRANSFORM_END; i++, j++) {
                    var transform_match_name = TRANSFORM_MATCHNAMES[j];
                    var property = target_transform.property(transform_match_name);
                    try {
                        if (transform_match_name === MATCH_NAME.POSITION) {
                            if (property.dimensionsSeparated) {
                                var x_position = target_transform.property(MATCH_NAME.POSITION_X);
                                var y_position = target_transform.property(MATCH_NAME.POSITION_Y);
                                x_position.expression = prefix + "(" + i + ")[0]";
                                y_position.expression = prefix + "(" + i + ")[1]";
                            }
                            else {
                                property.expression = prefix + "(" + i + ")";
                            }
                        }
                        else if (transform_match_name === MATCH_NAME.SCALE) {
                            property.expression = "var s = " + prefix + "(" + i + ");\n[s, s, s];";
                        }
                        else {
                            property.expression = prefix + "(" + i + ")";
                        }
                    }
                    catch (e) {
                    }
                }
            }
        };
        Transformer.prototype.pasteFromTransform = function (source_layer, target_layer) {
            var source_transform = source_layer.transform;
            var target_effects = findEffectsByMatchname(target_layer, KIKAKU_PATTERN_NAME);
            if (target_effects.length) {
                var prefix_1 = this.generateExpressionPrefix(source_layer, target_layer) + 'transform';
                Utils.forEach(target_effects, function (target_effect) {
                    for (var i = EFFECT_PARAM.TRANSFORM_START + 1, j = 0; i < EFFECT_PARAM.TRANSFORM_END; i++, j++) {
                        var transform_match_name = TRANSFORM_MATCHNAMES[j];
                        var property = target_effect.property(i);
                        if (transform_match_name === MATCH_NAME.POSITION) {
                            var position = source_layer.transform.position;
                            if (position.dimensionsSeparated) {
                                property.expression = "[" + prefix_1 + "(\"" + MATCH_NAME.POSITION_X + "\"), " + prefix_1 + "(\"" + MATCH_NAME.POSITION_Y + "\")]";
                            }
                            else {
                                property.expression = prefix_1 + "(\"" + transform_match_name + "\")";
                            }
                        }
                        else if (transform_match_name === MATCH_NAME.SCALE) {
                            property.expression = "var s = " + prefix_1 + "(\"" + transform_match_name + "\");\ns[0];";
                        }
                        else {
                            property.expression = prefix_1 + "(\"" + transform_match_name + "\")";
                        }
                    }
                });
            }
        };
        Transformer.prototype.generateExpressionPrefix = function (source_layer, target_layer) {
            if (source_layer === target_layer) {
                return '';
            }
            else if (source_layer.containingComp === target_layer.containingComp) {
                return "thisComp.layer(\"" + source_layer.name + "\").";
            }
            else {
                return "comp(\"" + source_layer.containingComp.name + "\").layer(\"" + source_layer.name + "\").";
            }
        };
        return Transformer;
    }());
    var Converter = (function () {
        function Converter() {
        }
        Converter.convert = function () {
            var target_layers = Utils.getSelectedLayers();
            Utils.forEach(target_layers, function (target_layer) {
                if (!Utils.isAVLayer(target_layer)) {
                    return;
                }
                var target_effects = findEffectsByMatchname(target_layer, KIKAKU_PATTERN_NAME);
                Utils.forEach(target_effects, function (target_effect) {
                    var global_shape = { scale: 1, hue: 0, lightness: 0, saturation: 0, opacity: 1, phase: 0 };
                    //get global shape properties
                    {
                        var scale = target_effect.property(EFFECT_PARAM.GLOBAL_SHAPE_SCALE);
                        global_shape.scale = scale.value * 0.01;
                        setValue(scale, 100, target_layer.time);
                        var hue = target_effect.property(EFFECT_PARAM.GLOBAL_SHAPE_HUE);
                        global_shape.hue = hue.value / 360;
                        setValue(hue, 0, target_layer.time);
                        var lightness = target_effect.property(EFFECT_PARAM.GLOBAL_SHAPE_LIGHTNESS);
                        global_shape.lightness = lightness.value * 0.01;
                        setValue(lightness, 100, target_layer.time);
                        var saturation = target_effect.property(EFFECT_PARAM.GLOBAL_SHAPE_SATURATION);
                        global_shape.saturation = saturation.value * 0.01;
                        setValue(saturation, 100, target_layer.time);
                        var opacity = target_effect.property(EFFECT_PARAM.GLOBAL_SHAPE_OPACITY);
                        global_shape.opacity = opacity.value * 0.01;
                        setValue(opacity, 100, target_layer.time);
                        var phase = target_effect.property(EFFECT_PARAM.GLOBAL_SHAPE_PHASE);
                        global_shape.phase = phase.value;
                        setValue(phase, 0, target_layer.time);
                    }
                    var shape_number = target_effect.property(EFFECT_PARAM.SHAPE_NUMBER).value;
                    for (var i = 0; i < shape_number; ++i) {
                        var shape_index = EFFECT_PARAM.SHAPE_START + i * SHAPE_PARAM.NUM;
                        var shape = target_effect.property(shape_index + SHAPE_PARAM.SHAPE).value;
                        var use_layer = shape == SHAPE.INPUT || shape == SHAPE.LAYER;
                        //scale
                        var use_scale = false;
                        if (use_layer && target_effect.property(shape_index + SHAPE_PARAM.USE_SCALE).value) {
                            use_scale = true;
                        }
                        if (use_scale) {
                            var scale = target_effect.property(shape_index + SHAPE_PARAM.SCALE);
                            setValue(scale, global_shape.scale * scale.value, target_layer.time);
                        }
                        else {
                            var size = target_effect.property(shape_index + SHAPE_PARAM.SIZE);
                            setValue(size, global_shape.scale * size.value, target_layer.time);
                        }
                        //color
                        var do_color = true;
                        var do_stroke_color = false;
                        if (use_layer) {
                            if (target_effect.property(shape_index + SHAPE_PARAM.TONER).value === TONER.NONE) {
                                do_color = false;
                            }
                        }
                        else {
                            if (target_effect.property(shape_index + SHAPE_PARAM.FILL_TYPE).value !== FILL_TYPE.FILL) {
                                do_stroke_color = true;
                            }
                        }
                        if (do_color) {
                            var color = target_effect.property(shape_index + SHAPE_PARAM.COLOR);
                            var rgb = color.value;
                            var hsl = Utils.rgbToHsl(rgb);
                            hsl[0] += global_shape.hue;
                            hsl[1] *= global_shape.saturation;
                            hsl[2] *= global_shape.lightness;
                            rgb = Utils.hslToRgb(hsl);
                            setValue(color, rgb, target_layer.time);
                        }
                        if (do_stroke_color) {
                            var stroke_color = target_effect.property(shape_index + SHAPE_PARAM.STROKE_COLOR);
                            var rgb = stroke_color.value;
                            var hsl = Utils.rgbToHsl(rgb);
                            hsl[0] += global_shape.hue;
                            hsl[1] *= global_shape.saturation;
                            hsl[2] *= global_shape.lightness;
                            rgb = Utils.hslToRgb(hsl);
                            setValue(stroke_color, rgb, target_layer.time);
                        }
                        //opacity
                        var opacity = target_effect.property(shape_index + SHAPE_PARAM.OPACITY);
                        setValue(opacity, global_shape.opacity * opacity.value, target_layer.time);
                        //phase
                        var phase = target_effect.property(shape_index + SHAPE_PARAM.PHASE);
                        setValue(phase, global_shape.phase + phase.value, target_layer.time);
                    }
                });
            });
        };
        return Converter;
    }());
    //Main
    var builder = new UIBuilder(global, 'KikakuPattern.jsx', {
        version: '1.0.0',
        author: 'Kareobana',
        url: 'http://atarabi.com/',
        titleWidth: 60
    });
    var transformer = new Transformer(builder);
    builder
        .addPanel(PARAM.TRANSFORM)
        .addStatictext(PARAM.LAYER, '')
        .addStatictext(PARAM.SOURCE, '')
        .addScript(PARAM.COPY, function () {
        transformer.copy();
    })
        .addScript(PARAM.PASTE, function () {
        transformer.paste();
    })
        .addPanelEnd(PARAM.TRANSFORM_END)
        .addPanel(PARAM.GLOBAL_SHAPE)
        .addScript(PARAM.CONVERT, function () {
        Converter.convert();
    })
        .addPanelEnd(PARAM.GLOBAL_SHAPE_END)
        .build();
    //functions
    function findEffect(layer, fn) {
        if (!Utils.isAVLayer(layer)) {
            return null;
        }
        var effect_root = layer.effect;
        for (var i = 1, l = effect_root.numProperties; i <= l; i++) {
            var effect = effect_root.property(i);
            if (fn(effect)) {
                return effect;
            }
        }
        return null;
    }
    function findEffects(layer, fn) {
        if (!Utils.isAVLayer(layer)) {
            return [];
        }
        var effects = [];
        var effect_root = layer.effect;
        for (var i = 1, l = effect_root.numProperties; i <= l; i++) {
            var effect = effect_root.property(i);
            if (fn(effect)) {
                effects.push(effect);
            }
        }
        return effects;
    }
    function findEffectByMatchname(layer, match_name, selected) {
        if (selected === void 0) { selected = true; }
        return findEffect(layer, function (property) { return property.isEffect && property.matchName === match_name && (!selected || property.selected); });
    }
    function findEffectsByMatchname(layer, match_name, selected) {
        if (selected === void 0) { selected = true; }
        return findEffects(layer, function (property) { return property.isEffect && property.matchName === match_name && (!selected || property.selected); });
    }
    function findEffectByName(layer, match_name, name, selected) {
        if (selected === void 0) { selected = true; }
        return findEffect(layer, function (property) { return property.isEffect && property.matchName === match_name && property.name === name && (!selected || property.selected); });
    }
    function setValue(property, value, time) {
        if (property.numKeys > 0) {
            property.setValueAtTime(time, value);
        }
        else {
            property.setValue(value);
        }
    }
})(this);
