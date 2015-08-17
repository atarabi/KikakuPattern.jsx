/*
 *  KikakuPattern.jsx v0.0.0 / ScriptUI
 *
 *  Author: Kareobana(http://atarabi.com/)
 *  License: MIT
 *  Dependencies:
 *    KIKAKU.JSON
 *    KIKAKU.Utils 1.0.0
 *    KIKAKU.UIBuilder 2.1.0
 */
/// <reference path="./typings/aftereffects/ae.d.ts" />
/// <reference path="./typings/kikaku/kikaku.d.ts" />
(function (global) {
    //Lib
    var JSON = KIKAKU.JSON, Utils = KIKAKU.Utils, UIBuilder = KIKAKU.UIBuilder, PARAMETER_TYPE = UIBuilder.PARAMETER_TYPE;
    //Effect
    var KIKAKU_PATTERN_MATCHNAME = 'KikakuPattern';
    var PARAM = {
        TRANSFORM_START: 157,
        TRANSFORM_END: 163
    };
    //Global Variables
    var g_transform = {
        layer: null,
        effect: null
    };
    //Main
    var builder = new UIBuilder(global, 'KikakuPattern.jsx', {
        version: '0.0.0',
        author: 'Kareobana',
        url: 'http://atarabi.com/',
        titleWidth: 60
    });
    builder
        .add(PARAMETER_TYPE.PANEL, 'Transform')
        .add(PARAMETER_TYPE.STATICTEXT, 'Layer', '')
        .add(PARAMETER_TYPE.STATICTEXT, 'Effect', '')
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
        if (!effect) {
            return;
        }
        g_transform.layer = layer;
        g_transform.effect = effect.name;
        self.set('Layer', layer.name);
        self.set('Effect', effect.name);
    })
        .add(PARAMETER_TYPE.SCRIPT, 'Paste', function () {
        var self = this;
        var source_layer = g_transform.layer;
        var source_effect_name = g_transform.effect;
        if (!source_layer) {
            return;
        }
        try {
            source_layer.name = source_layer.name;
        }
        catch (e) {
            g_transform.layer = g_transform.effect = null;
            self.set('Layer', '');
            self.set('Effect', '');
            return;
        }
        var has_effect = false;
        var source_effect;
        var effects = source_layer.property('ADBE Effect Parade');
        for (var i = 1, l = effects.numProperties; i <= l; i++) {
            var _effect = effects.property(i);
            if (_effect.matchName === KIKAKU_PATTERN_MATCHNAME && _effect.name === source_effect_name) {
                source_effect = _effect;
                has_effect = true;
                break;
            }
        }
        if (!has_effect) {
            g_transform.layer = g_transform.effect = null;
            self.set('Layer', '');
            self.set('Effect', '');
            return;
        }
        var layer = Utils.getSelectedLayer();
        if (!layer) {
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
        if (!effect || source_effect === effect) {
            return;
        }
        var prefix = '';
        if (source_layer === layer) {
        }
        else if (source_layer.containingComp === layer.containingComp) {
            prefix = 'thisComp.layer("' + source_layer.name + '").';
        }
        else {
            prefix = 'comp("' + source_layer.containingComp.name + '").layer("' + source_layer.name + '").';
        }
        prefix += 'effect("' + source_effect.name + '")';
        for (var i = PARAM.TRANSFORM_START + 1; i < PARAM.TRANSFORM_END; i++) {
            var property = effect.property(i);
            property.expression = prefix + '(' + i + ')';
        }
    })
        .add(PARAMETER_TYPE.PANEL_END, 'Transform End')
        .build();
})(this);
