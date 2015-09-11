/*
 *  KikakuPattern.jsx v0.1.0 / ScriptUI
 *
 *  Author: Kareobana(http://atarabi.com/)
 *  License: MIT
 *  Dependencies:
 *    Kikaku.jsx 0.0.0
 */
/// <reference path="./typings/aftereffects/ae.d.ts" />
/// <reference path="./typings/kikaku/Kikaku.d.ts" />
(function (global) {
    //Lib
    var Utils = KIKAKU.Utils, UIBuilder = KIKAKU.UIBuilder, PARAMETER_TYPE = UIBuilder.PARAMETER_TYPE;
    //Effect
    var KIKAKU_PATTERN_MATCHNAME = 'KikakuPattern';
    var TRANSFORM_MATCHNAME = 'ADBE Transform Group';
    var TRANSFORM_CHILDREN_MATCHNAMES = ['ADBE Anchor Point', 'ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity'];
    var TARGET = {
        EFFECT: 'Effect',
        TRANSFORM: 'Transform'
    };
    var PARAM = {
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
    //Global Variables
    var g_transform = {
        layer: null,
        source: null
    };
    //Utility
    function setValue(property, value, time) {
        if (property.numKeys > 0) {
            property.setValueAtTime(time, value);
        }
        else {
            property.setValue(value);
        }
    }
    //Main
    var builder = new UIBuilder(global, 'KikakuPattern.jsx', {
        version: '0.1.0',
        author: 'Kareobana',
        url: 'http://atarabi.com/',
        titleWidth: 60
    });
    builder
        .add(PARAMETER_TYPE.PANEL, 'Transform')
        .add(PARAMETER_TYPE.STATICTEXT, 'Layer', '')
        .add(PARAMETER_TYPE.STATICTEXT, 'Source', '')
        .add(PARAMETER_TYPE.SCRIPT, 'Copy', function () {
        var self = this;
        var layer = Utils.getSelectedLayer();
        if (!layer || !Utils.isAVLayer(layer)) {
            return;
        }
        var selected_properties = layer.selectedProperties.slice();
        var effect;
        for (var i = 0, l = selected_properties.length; i < l; i++) {
            var selected_property = selected_properties[i];
            if (selected_property.isEffect && selected_property.matchName === KIKAKU_PATTERN_MATCHNAME) {
                effect = selected_property;
                break;
            }
        }
        var source = effect ? TARGET.EFFECT + '/' + effect.name : TARGET.TRANSFORM;
        g_transform.layer = layer;
        g_transform.source = source;
        self.set('Layer', layer.name);
        self.set('Source', source);
    })
        .add(PARAMETER_TYPE.SCRIPT, 'Paste', function () {
        var self = this;
        var source_layer = g_transform.layer;
        if (!source_layer) {
            return;
        }
        try {
            source_layer.name = source_layer.name;
        }
        catch (e) {
            g_transform.layer = g_transform.source = null;
            self.set('Layer', '');
            self.set('Effect', '');
            return alert('Cannot find the source layer.');
        }
        var target_layer = Utils.getSelectedLayer();
        if (!target_layer) {
            return alert('Select a target layer.');
        }
        var source = g_transform.source.split('/')[0];
        var source_property;
        if (source === TARGET.EFFECT) {
            var source_effect_name = g_transform.source.split('/')[1];
            var has_effect = false;
            var effects = source_layer.property('ADBE Effect Parade');
            for (var i = 1, l = effects.numProperties; i <= l; i++) {
                var _effect = effects.property(i);
                if (_effect.matchName === KIKAKU_PATTERN_MATCHNAME && _effect.name === source_effect_name) {
                    source_property = _effect;
                    has_effect = true;
                    break;
                }
            }
            if (!has_effect) {
                g_transform.layer = g_transform.source = null;
                self.set('Layer', '');
                self.set('Source', '');
                return;
            }
        }
        else if (source === TARGET.TRANSFORM) {
            source_property = source_layer.property(TRANSFORM_MATCHNAME);
        }
        var target;
        var selected_properties = target_layer.selectedProperties.slice();
        var target_property;
        for (var i = 0, l = selected_properties.length; i < l; i++) {
            var selected_property = selected_properties[i];
            if (selected_property.isEffect && selected_property.matchName === KIKAKU_PATTERN_MATCHNAME) {
                target_property = selected_property;
                break;
            }
        }
        if (target_property) {
            target = TARGET.EFFECT;
        }
        else {
            target = TARGET.TRANSFORM;
            target_property = target_layer.property(TRANSFORM_MATCHNAME);
        }
        //paste
        var prefix = '';
        if (source_layer === target_layer) {
        }
        else if (source_layer.containingComp === target_layer.containingComp) {
            prefix = 'thisComp.layer("' + source_layer.name + '").';
        }
        else {
            prefix = 'comp("' + source_layer.containingComp.name + '").layer("' + source_layer.name + '").';
        }
        if (source === TARGET.EFFECT) {
            prefix += 'effect("' + source_property.name + '")';
            if (target === TARGET.EFFECT) {
                for (var i = PARAM.TRANSFORM_START + 1; i < PARAM.TRANSFORM_END; i++) {
                    var property = target_property.property(i);
                    property.expression = prefix + '(' + i + ')';
                }
            }
            else if (target === TARGET.TRANSFORM) {
                for (var i = PARAM.TRANSFORM_START + 1, j = 0; i < PARAM.TRANSFORM_END; i++, j++) {
                    var transform_match_name = TRANSFORM_CHILDREN_MATCHNAMES[j];
                    var property = target_property.property(transform_match_name);
                    if (transform_match_name.indexOf('Scale') >= 0) {
                        property.expression = 'var s = ' + prefix + '(' + i + ');\n[s, s, s];';
                    }
                    else {
                        property.expression = prefix + '(' + i + ')';
                    }
                }
            }
        }
        else if (source === TARGET.TRANSFORM) {
            prefix += 'transform';
            if (target === TARGET.EFFECT) {
                for (var i = PARAM.TRANSFORM_START + 1, j = 0; i < PARAM.TRANSFORM_END; i++, j++) {
                    var transform_match_name = TRANSFORM_CHILDREN_MATCHNAMES[j];
                    var property = target_property.property(i);
                    if (transform_match_name.indexOf('Scale') >= 0) {
                        property.expression = 'var s = ' + prefix + '("' + transform_match_name + '");\ns[0];';
                    }
                    else {
                        property.expression = prefix + '("' + transform_match_name + '")';
                    }
                }
            }
            else if (target === TARGET.TRANSFORM) {
            }
        }
    })
        .add(PARAMETER_TYPE.PANEL_END, 'Transform End')
        .add(PARAMETER_TYPE.PANEL, 'Global Shape')
        .add(PARAMETER_TYPE.SCRIPT, 'Convert', function () {
        var self = this;
        var layer = Utils.getSelectedLayer();
        if (!layer || !Utils.isAVLayer(layer)) {
            return;
        }
        var selected_properties = layer.selectedProperties.slice();
        var effect;
        for (var i = 0, l = selected_properties.length; i < l; i++) {
            var selected_property = selected_properties[i];
            if (selected_property.isEffect && selected_property.matchName === KIKAKU_PATTERN_MATCHNAME) {
                effect = selected_property;
                break;
            }
        }
        if (!effect) {
            return;
        }
        var global_shape = { scale: 1, hue: 0, lightness: 0, saturation: 0, opacity: 1, phase: 0 };
        //get global shape properties
        {
            var scale = effect.property(PARAM.GLOBAL_SHAPE_SCALE);
            global_shape.scale = scale.value * 0.01;
            setValue(scale, 100, layer.time);
            var hue = effect.property(PARAM.GLOBAL_SHAPE_HUE);
            global_shape.hue = hue.value / 360;
            setValue(hue, 0, layer.time);
            var lightness = effect.property(PARAM.GLOBAL_SHAPE_LIGHTNESS);
            global_shape.lightness = lightness.value * 0.01;
            setValue(lightness, 100, layer.time);
            var saturation = effect.property(PARAM.GLOBAL_SHAPE_SATURATION);
            global_shape.saturation = saturation.value * 0.01;
            setValue(saturation, 100, layer.time);
            var opacity = effect.property(PARAM.GLOBAL_SHAPE_OPACITY);
            global_shape.opacity = opacity.value * 0.01;
            setValue(opacity, 100, layer.time);
            var phase = effect.property(PARAM.GLOBAL_SHAPE_PHASE);
            global_shape.phase = phase.value;
            setValue(phase, 0, layer.time);
        }
        var shape_number = effect.property(PARAM.SHAPE_NUMBER).value;
        for (var i = 0; i < shape_number; ++i) {
            var shape_index = PARAM.SHAPE_START + i * SHAPE_PARAM.NUM;
            var shape = effect.property(shape_index + SHAPE_PARAM.SHAPE).value;
            var use_layer = shape == SHAPE.INPUT || shape == SHAPE.LAYER;
            //scale
            var use_scale = false;
            if (use_layer && effect.property(shape_index + SHAPE_PARAM.USE_SCALE).value) {
                use_scale = true;
            }
            if (use_scale) {
                var scale = effect.property(shape_index + SHAPE_PARAM.SCALE);
                setValue(scale, global_shape.scale * scale.value, layer.time);
            }
            else {
                var size = effect.property(shape_index + SHAPE_PARAM.SIZE);
                setValue(size, global_shape.scale * size.value, layer.time);
            }
            //color
            var do_color = true;
            var do_stroke_color = false;
            if (use_layer) {
                if (effect.property(shape_index + SHAPE_PARAM.TONER).value === TONER.NONE) {
                    do_color = false;
                }
            }
            else {
                if (effect.property(shape_index + SHAPE_PARAM.FILL_TYPE).value !== FILL_TYPE.FILL) {
                    do_stroke_color = true;
                }
            }
            if (do_color) {
                var color = effect.property(shape_index + SHAPE_PARAM.COLOR);
                var rgb = color.value;
                var hsl = Utils.rgbToHsl(rgb);
                hsl[0] += global_shape.hue;
                hsl[1] *= global_shape.saturation;
                hsl[2] *= global_shape.lightness;
                rgb = Utils.hslToRgb(hsl);
                setValue(color, rgb, layer.time);
            }
            if (do_stroke_color) {
                var stroke_color = effect.property(shape_index + SHAPE_PARAM.STROKE_COLOR);
                var rgb = stroke_color.value;
                var hsl = Utils.rgbToHsl(rgb);
                hsl[0] += global_shape.hue;
                hsl[1] *= global_shape.saturation;
                hsl[2] *= global_shape.lightness;
                rgb = Utils.hslToRgb(hsl);
                setValue(stroke_color, rgb, layer.time);
            }
            //opacity
            var opacity = effect.property(shape_index + SHAPE_PARAM.OPACITY);
            setValue(opacity, global_shape.opacity * opacity.value, layer.time);
            //phase
            var phase = effect.property(shape_index + SHAPE_PARAM.PHASE);
            setValue(phase, global_shape.phase + phase.value, layer.time);
        }
    })
        .add(PARAMETER_TYPE.PANEL_END, 'Global Shape End')
        .build();
})(this);
