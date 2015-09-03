/*
 *  KikakuPattern.jsx v0.1.0 / ScriptUI
 *
 *  Author: Kareobana(http://atarabi.com/)
 *  License: MIT
 *  Dependencies:
 *    KIKAKU.Utils 1.0.1
 *    KIKAKU.UIBuilder 2.1.0
 */

/// <reference path="./typings/aftereffects/ae.d.ts" />
/// <reference path="./typings/kikaku/kikaku.d.ts" />

(function(global) {
	//Lib
	var Utils = KIKAKU.Utils,
		UIBuilder = KIKAKU.UIBuilder,
		PARAMETER_TYPE = UIBuilder.PARAMETER_TYPE;
	
	//Effect
	const KIKAKU_PATTERN_MATCHNAME = 'KikakuPattern';
	const TRANSFORM_MATCHNAME = 'ADBE Transform Group';
	const TRANSFORM_CHILDREN_MATCHNAMES = ['ADBE Anchor Point', 'ADBE Position', 'ADBE Scale', 'ADBE Rotate Z', 'ADBE Opacity'];
	
	const TARGET = {
		EFFECT: 'Effect',
		TRANSFORM: 'Transform'	
	};
	
	const PARAM = {
		TRANSFORM_START: 157,
		TRANSFORM_END: 163,
		SHAPE_NUMBER: 169,
		SHAPE_START: 170,
		GLOBAL_SHAPE_SCALE: 603,
		GLOBAL_SHAPE_HUE: 604,
		GLOBAL_SHAPE_LIGHTNESS: 605,
		GLOBAL_SHAPE_SATURATION: 606,
		GLOBAL_SHAPE_OPACITY: 607,
		GLOBAL_SHAPE_PHASE: 608,
	};
	
	const SHAPE = {
		LINE: 1,
		CIRCLE: 2,
		POLYGON: 3,
		INPUT: 4,
		LAYER: 5,
	};
	
	const SHAPE_PARAM = {
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
		NUM: 54,
	};
	
	const TONER = {
		NONE: 1,
		HLS: 2,
		FILL: 3,
		TINT: 4,
		TRITONE: 5,
		HUE: 6,
	};
	
	const FILL_TYPE = {
		FILL: 1,
		STROKE: 2,
		FILL_AND_STROKE: 3,	
	};
	
	//Global Variables
	var g_transform: { layer: AVLayer; source: string; } = {
		layer: null,
		source: null,
	};
	
	//Utility
	function setValue(property: Property, value: any, time: number) {
		if (property.numKeys > 0) {
			property.setValueAtTime(time, value);
		} else {
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
		.add(PARAMETER_TYPE.SCRIPT, 'Copy', function() {
			const self: KIKAKU.UIBuilder = <KIKAKU.UIBuilder>this;
			const layer: AVLayer = <AVLayer>Utils.getSelectedLayer();
			if (!layer || !Utils.isAVLayer(layer)) {
				return;
			}

			let selected_properties = layer.selectedProperties.slice();
			let effect: PropertyGroup;
			for (let i = 0, l = selected_properties.length; i < l; i++) {
				const selected_property = selected_properties[i];
				if (selected_property.isEffect && selected_property.matchName === KIKAKU_PATTERN_MATCHNAME) {
					effect = <PropertyGroup>selected_property;
					break;
				}
			}
			
			let source: string = effect ? TARGET.EFFECT + '/' + effect.name : TARGET.TRANSFORM;

			g_transform.layer = layer;
			g_transform.source = source;
	
			self.set('Layer', layer.name);
			self.set('Source', source);
		})
		.add(PARAMETER_TYPE.SCRIPT, 'Paste', function() {
			const self: KIKAKU.UIBuilder = <KIKAKU.UIBuilder>this;
			
			const source_layer: AVLayer = g_transform.layer;
			if (!source_layer) {
				return;
			}
			try {
				source_layer.name = source_layer.name;
			} catch (e) {
				g_transform.layer = g_transform.source = null;
				self.set('Layer', '');
				self.set('Effect', '');
				return alert('Cannot find the source layer.');
			}
			
			const target_layer: Layer = <Layer>Utils.getSelectedLayer();
			if (!target_layer) {
				return alert('Select a target layer.');
			}
			
			const source = g_transform.source.split('/')[0];
			let source_property: PropertyGroup;
			if (source === TARGET.EFFECT) {
				const source_effect_name = g_transform.source.split('/')[1];
				let has_effect = false;
				let effects = <PropertyGroup>source_layer.property('ADBE Effect Parade');
				for (let i = 1, l = effects.numProperties; i <= l; i++) {
					const _effect = effects.property(i);
					if (_effect.matchName === KIKAKU_PATTERN_MATCHNAME && _effect.name === source_effect_name) {
						source_property = <PropertyGroup>_effect;
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
			} else if (source === TARGET.TRANSFORM) {
				source_property = <PropertyGroup>source_layer.property(TRANSFORM_MATCHNAME);
			}
			
			let target;
			let selected_properties = target_layer.selectedProperties.slice();
			let target_property: PropertyGroup;
			for (let i = 0, l = selected_properties.length; i < l; i++) {
				const selected_property = selected_properties[i];
				if (selected_property.isEffect && selected_property.matchName === KIKAKU_PATTERN_MATCHNAME) {
					target_property = <PropertyGroup>selected_property;
					break;
				}
			}
			
			if (target_property) {
				target = TARGET.EFFECT;
			} else {
				target = TARGET.TRANSFORM;
				target_property = <PropertyGroup>target_layer.property(TRANSFORM_MATCHNAME);
			}
			
			//paste
			let prefix = '';
			if (source_layer === target_layer) {
				//pass
			} else if (source_layer.containingComp === target_layer.containingComp) {
				prefix = 'thisComp.layer("' + source_layer.name + '").';
			} else {
				prefix = 'comp("' + source_layer.containingComp.name + '").layer("' + source_layer.name + '").';
			}
			
			if (source === TARGET.EFFECT) {
				prefix += 'effect("' + source_property.name + '")';
				if (target === TARGET.EFFECT) {
					for (let i = PARAM.TRANSFORM_START + 1; i < PARAM.TRANSFORM_END; i++) {
						const property: Property = <Property>target_property.property(i);
						property.expression = prefix + '(' + i + ')';
					}
				} else if (target === TARGET.TRANSFORM) {
					for (let i = PARAM.TRANSFORM_START + 1, j = 0; i < PARAM.TRANSFORM_END; i++, j++) {
						const transform_match_name = TRANSFORM_CHILDREN_MATCHNAMES[j];
						const property: Property = <Property>target_property.property(transform_match_name);
						if (transform_match_name.indexOf('Scale') >= 0) {
							property.expression = 'var s = ' + prefix + '(' + i + ');\n[s, s, s];';
						} else {
							property.expression = prefix + '(' + i + ')';
						}
					}
				}
			} else if (source === TARGET.TRANSFORM) {
				prefix += 'transform';
				if (target === TARGET.EFFECT) {
					for (let i = PARAM.TRANSFORM_START + 1, j = 0; i < PARAM.TRANSFORM_END; i++, j++) {
						const transform_match_name = TRANSFORM_CHILDREN_MATCHNAMES[j];
						const property: Property = <Property>target_property.property(i);
						if (transform_match_name.indexOf('Scale') >= 0) {
							property.expression = 'var s = ' + prefix + '("' + transform_match_name + '");\ns[0];';
						} else {
							property.expression = prefix + '("' + transform_match_name + '")';
						}
					}
				} else if (target === TARGET.TRANSFORM) {
					//pass
				}
			}
		})
		.add(PARAMETER_TYPE.PANEL_END, 'Transform End')
		.add(PARAMETER_TYPE.PANEL, 'Global Shape')
		.add(PARAMETER_TYPE.SCRIPT, 'Convert', function () {
			const self: KIKAKU.UIBuilder = <KIKAKU.UIBuilder>this;
			const layer: AVLayer = <AVLayer>Utils.getSelectedLayer();
			if (!layer || !Utils.isAVLayer(layer)) {
				return;
			}
			
			let selected_properties = layer.selectedProperties.slice();
			let effect: PropertyGroup;
			for (let i = 0, l = selected_properties.length; i < l; i++) {
				let selected_property = selected_properties[i];
				if (selected_property.isEffect && selected_property.matchName === KIKAKU_PATTERN_MATCHNAME) {
					effect = <PropertyGroup>selected_property;
					break;
				}
			}
			
			if (!effect) {
				return;
			}
			
			let global_shape = {scale: 1, hue: 0, lightness: 0, saturation: 0, opacity: 1, phase: 0};
			//get global shape properties
			{
				let scale = <Property>effect.property(PARAM.GLOBAL_SHAPE_SCALE);
				global_shape.scale = <number>scale.value * 0.01;
				setValue(scale, 100, layer.time);
				
				let hue = <Property>effect.property(PARAM.GLOBAL_SHAPE_HUE);
				global_shape.hue = <number>hue.value / 360;
				setValue(hue, 0, layer.time);
				
				let lightness = <Property>effect.property(PARAM.GLOBAL_SHAPE_LIGHTNESS);
				global_shape.lightness = <number>lightness.value * 0.01;
				setValue(lightness, 100, layer.time);
				
				let saturation = <Property>effect.property(PARAM.GLOBAL_SHAPE_SATURATION);
				global_shape.saturation = <number>saturation.value * 0.01;
				setValue(saturation, 100, layer.time);
				
				let opacity = <Property>effect.property(PARAM.GLOBAL_SHAPE_OPACITY);
				global_shape.opacity = <number>opacity.value * 0.01;
				setValue(opacity, 100, layer.time);
				
				let phase = <Property>effect.property(PARAM.GLOBAL_SHAPE_PHASE);
				global_shape.phase = <number>phase.value;
				setValue(phase, 0, layer.time);
			}
			
			const shape_number = (<Property>effect.property(PARAM.SHAPE_NUMBER)).value;
			
			for (let i = 0; i < shape_number; ++i) {
				const shape_index = PARAM.SHAPE_START + i * SHAPE_PARAM.NUM;
				const shape:number = <number>(<Property>effect.property(shape_index + SHAPE_PARAM.SHAPE)).value;
				const use_layer: boolean = shape == SHAPE.INPUT || shape == SHAPE.LAYER;
				
				//scale
				let use_scale: boolean = false;
				if (use_layer && <number>(<Property>effect.property(shape_index + SHAPE_PARAM.USE_SCALE)).value) {
					use_scale = true;
				}
				
				if (use_scale) {
					let scale = <Property>effect.property(shape_index + SHAPE_PARAM.SCALE);
					setValue(scale, global_shape.scale * <number>scale.value, layer.time);
				} else {
					let size = <Property>effect.property(shape_index + SHAPE_PARAM.SIZE);
					setValue(size, global_shape.scale * <number>size.value, layer.time);
				}
				
				//color
				let do_color: boolean = true;
				let do_stroke_color: boolean = false;
				if (use_layer) {
					if (<number>(<Property>effect.property(shape_index + SHAPE_PARAM.TONER)).value === TONER.NONE) {
						do_color = false;
					}
				} else {
					if (<number>(<Property>effect.property(shape_index + SHAPE_PARAM.FILL_TYPE)).value !== FILL_TYPE.FILL) {
						do_stroke_color = true;
					}
				}
				
				if (do_color) {
					let color = <Property>effect.property(shape_index + SHAPE_PARAM.COLOR);
					let rgb = <[number, number, number, number]>color.value;
					let hsl = Utils.rgbToHsl(rgb);
					hsl[0] += global_shape.hue;
					hsl[1] *= global_shape.saturation;
					hsl[2] *= global_shape.lightness;
					rgb = Utils.hslToRgb(hsl);
					setValue(color, rgb, layer.time);
				}
				if (do_stroke_color) {
					let stroke_color = <Property>effect.property(shape_index + SHAPE_PARAM.STROKE_COLOR);
					let rgb = <[number, number, number, number]>stroke_color.value;
					let hsl = Utils.rgbToHsl(rgb);
					hsl[0] += global_shape.hue;
					hsl[1] *= global_shape.saturation;
					hsl[2] *= global_shape.lightness;
					rgb = Utils.hslToRgb(hsl);
					setValue(stroke_color, rgb, layer.time);
				}
				
				//opacity
				let opacity = <Property>effect.property(shape_index + SHAPE_PARAM.OPACITY);
				setValue(opacity, global_shape.opacity * <number>opacity.value, layer.time);
				
				//phase
				let phase = <Property>effect.property(shape_index + SHAPE_PARAM.PHASE);
				setValue(phase, global_shape.phase + <number>phase.value, layer.time);
			}
		})
		.add(PARAMETER_TYPE.PANEL_END, 'Global Shape End')
		.build();

})(this);