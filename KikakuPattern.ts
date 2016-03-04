/*
 *  KikakuPattern.jsx v1.0.0 / ScriptUI
 *
 *  Author: Kareobana(http://atarabi.com/)
 *  License: MIT
 *  Dependencies:
 *    Kikaku.jsx 0.6.5
 */

(function(global) {

  //Lib
  const {Utils, UIBuilder} = KIKAKU;


  //Constants
  const PARAM = {
    TRANSFORM: 'Transform',
    LAYER: 'Layer',
    SOURCE: 'Source',
    COPY: 'Copy',
    PASTE: 'Paste',
    TRANSFORM_END: 'Transform End',
    GLOBAL_SHAPE: 'Global Shape',
    CONVERT: 'Convert',
    GLOBAL_SHAPE_END: 'Global Shape End',
  };

  const KIKAKU_PATTERN_NAME = 'KikakuPattern';

  const MATCH_NAME = {
    ANCHOR: 'ADBE Anchor Point',
    POSITION: 'ADBE Position',
    POSITION_X: 'ADBE Position_0',
    POSITION_Y: 'ADBE Position_1',
    SCALE: 'ADBE Scale',
    ROTATE_Z: 'ADBE Rotate Z',
    OPACITY: 'ADBE Opacity',
  };

  const TRANSFORM_MATCHNAMES = [MATCH_NAME.ANCHOR, MATCH_NAME.POSITION, MATCH_NAME.SCALE, MATCH_NAME.ROTATE_Z, MATCH_NAME.OPACITY];

  const EFFECT_PARAM = {
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


  //Class
  class Transformer {
    private _layer: Layer = null;
    private _source: string = null;
    constructor(builder: KIKAKU.UIBuilder) { }
    clear() {
      this._layer = null;
      builder.set(PARAM.LAYER, '');
      this._source = null;
      builder.set(PARAM.SOURCE, '');
    }
    copy() {
      const layer = Utils.getSelectedLayer();
      if (!layer) {
        return this.clear();
      }

      this._layer = layer;
      builder.set(PARAM.LAYER, layer.name);

      const effect: PropertyGroup = findEffectByMatchname(layer, KIKAKU_PATTERN_NAME);
      if (effect) {
        this._source = effect.name;
        builder.set('Source', effect.name);
      } else {
        builder.set('Source', 'Transform');
      }
    }
    paste() {
      const source_layer = this._layer;
      if (!source_layer || !isValid(source_layer)) {
        return this.clear();
      }

      const target_layer = Utils.getSelectedLayer();
      if (!target_layer) {
        throw 'Select a target layer.';
      }

      if ((source_layer !== target_layer) && (source_layer.name === target_layer.name)) {
        throw 'Rename a layer name.';
      }

      if (this._source) {
        this.pasteFromEffect(source_layer, target_layer);
      } else {
        this.pasteFromTransform(source_layer, target_layer);
      }
    }
    private pasteFromEffect(source_layer: Layer, target_layer: Layer) {
      const source_effect = findEffectByName(source_layer, KIKAKU_PATTERN_NAME, this._source, false);
      if (!source_effect) {
        return this.clear();
      }

      const target_effects = findEffectsByMatchname(target_layer, KIKAKU_PATTERN_NAME);
      const prefix = this.generateExpressionPrefix(source_layer, target_layer) + `effect("${source_effect.name}")`;
      if (target_effects.length) {
        Utils.forEach(target_effects, (target_effect: PropertyGroup) => {
          for (let i = EFFECT_PARAM.TRANSFORM_START + 1; i < EFFECT_PARAM.TRANSFORM_END; i++) {
            const property: Property = <Property>target_effect.property(i);
            property.expression = `${prefix}(${i})`;;
          }
        });
      } else {
        const target_transform = target_layer.transform;
        for (let i = EFFECT_PARAM.TRANSFORM_START + 1, j = 0; i < EFFECT_PARAM.TRANSFORM_END; i++ , j++) {
          const transform_match_name = TRANSFORM_MATCHNAMES[j];
          const property: Property = <Property>target_transform.property(transform_match_name);
          try {
            if (transform_match_name === MATCH_NAME.POSITION) {
              if (property.dimensionsSeparated) {
                const x_position: Property = <Property>target_transform.property(MATCH_NAME.POSITION_X);
                const y_position: Property = <Property>target_transform.property(MATCH_NAME.POSITION_Y);
                x_position.expression = `${prefix}(${i})[0]`;
                y_position.expression = `${prefix}(${i})[1]`;
              } else {
                property.expression = `${prefix}(${i})`;
              }
            } else if (transform_match_name === MATCH_NAME.SCALE) {
              property.expression = `var s = ${prefix}(${i});
[s, s, s];`
            } else {
              property.expression = `${prefix}(${i})`;
            }
          } catch (e) {
            //pass
          }

        }
      }
    }
    private pasteFromTransform(source_layer: Layer, target_layer: Layer) {
      const source_transform = source_layer.transform;

      const target_effects = findEffectsByMatchname(target_layer, KIKAKU_PATTERN_NAME);
      if (target_effects.length) {
        const prefix = this.generateExpressionPrefix(source_layer, target_layer) + 'transform';
        Utils.forEach(target_effects, (target_effect: PropertyGroup) => {
          for (let i = EFFECT_PARAM.TRANSFORM_START + 1, j = 0; i < EFFECT_PARAM.TRANSFORM_END; i++ , j++) {
            const transform_match_name = TRANSFORM_MATCHNAMES[j];
            const property: Property = <Property>target_effect.property(i);
            if (transform_match_name === MATCH_NAME.POSITION) {
              const position = source_layer.transform.position;
              if (position.dimensionsSeparated) {
                property.expression = `[${prefix}("${MATCH_NAME.POSITION_X}"), ${prefix}("${MATCH_NAME.POSITION_Y}")]`;
              } else {
                property.expression = `${prefix}("${transform_match_name}")`;
              }
            } else if (transform_match_name === MATCH_NAME.SCALE) {
              property.expression = `var s = ${prefix}("${transform_match_name}");
s[0];`
            } else {
              property.expression = `${prefix}("${transform_match_name}")`;
            }
          }
        });
      }
    }
    private generateExpressionPrefix(source_layer: Layer, target_layer: Layer) {
      if (source_layer === target_layer) {
        return '';
      } else if (source_layer.containingComp === target_layer.containingComp) {
        return `thisComp.layer("${source_layer.name}").`;
      } else {
        return `comp("${source_layer.containingComp.name}").layer("${source_layer.name}").`;
      }
    }
  }


  class Converter {
    static convert() {
      const target_layers = Utils.getSelectedLayers();

      Utils.forEach(target_layers, (target_layer: AVLayer) => {
        if (!Utils.isAVLayer(target_layer)) {
          return;
        }

        const target_effects = findEffectsByMatchname(target_layer, KIKAKU_PATTERN_NAME);
        Utils.forEach(target_effects, (target_effect: PropertyGroup) => {
          let global_shape = { scale: 1, hue: 0, lightness: 0, saturation: 0, opacity: 1, phase: 0 };
          //get global shape properties
          {
            const scale = <Property>target_effect.property(EFFECT_PARAM.GLOBAL_SHAPE_SCALE);
            global_shape.scale = <number>scale.value * 0.01;
            setValue(scale, 100, target_layer.time);

            const hue = <Property>target_effect.property(EFFECT_PARAM.GLOBAL_SHAPE_HUE);
            global_shape.hue = <number>hue.value / 360;
            setValue(hue, 0, target_layer.time);

            const lightness = <Property>target_effect.property(EFFECT_PARAM.GLOBAL_SHAPE_LIGHTNESS);
            global_shape.lightness = <number>lightness.value * 0.01;
            setValue(lightness, 100, target_layer.time);

            const saturation = <Property>target_effect.property(EFFECT_PARAM.GLOBAL_SHAPE_SATURATION);
            global_shape.saturation = <number>saturation.value * 0.01;
            setValue(saturation, 100, target_layer.time);

            const opacity = <Property>target_effect.property(EFFECT_PARAM.GLOBAL_SHAPE_OPACITY);
            global_shape.opacity = <number>opacity.value * 0.01;
            setValue(opacity, 100, target_layer.time);

            const phase = <Property>target_effect.property(EFFECT_PARAM.GLOBAL_SHAPE_PHASE);
            global_shape.phase = <number>phase.value;
            setValue(phase, 0, target_layer.time);
          }

          const shape_number = (<Property>target_effect.property(EFFECT_PARAM.SHAPE_NUMBER)).value;

          for (let i = 0; i < shape_number; ++i) {
            const shape_index = EFFECT_PARAM.SHAPE_START + i * SHAPE_PARAM.NUM;
            const shape: number = <number>(<Property>target_effect.property(shape_index + SHAPE_PARAM.SHAPE)).value;
            const use_layer: boolean = shape == SHAPE.INPUT || shape == SHAPE.LAYER;

            //scale
            let use_scale: boolean = false;
            if (use_layer && <number>(<Property>target_effect.property(shape_index + SHAPE_PARAM.USE_SCALE)).value) {
              use_scale = true;
            }

            if (use_scale) {
              let scale = <Property>target_effect.property(shape_index + SHAPE_PARAM.SCALE);
              setValue(scale, global_shape.scale * <number>scale.value, target_layer.time);
            } else {
              let size = <Property>target_effect.property(shape_index + SHAPE_PARAM.SIZE);
              setValue(size, global_shape.scale * <number>size.value, target_layer.time);
            }

            //color
            let do_color: boolean = true;
            let do_stroke_color: boolean = false;
            if (use_layer) {
              if (<number>(<Property>target_effect.property(shape_index + SHAPE_PARAM.TONER)).value === TONER.NONE) {
                do_color = false;
              }
            } else {
              if (<number>(<Property>target_effect.property(shape_index + SHAPE_PARAM.FILL_TYPE)).value !== FILL_TYPE.FILL) {
                do_stroke_color = true;
              }
            }

            if (do_color) {
              let color = <Property>target_effect.property(shape_index + SHAPE_PARAM.COLOR);
              let rgb = <[number, number, number, number]>color.value;
              let hsl = Utils.rgbToHsl(rgb);
              hsl[0] += global_shape.hue;
              hsl[1] *= global_shape.saturation;
              hsl[2] *= global_shape.lightness;
              rgb = Utils.hslToRgb(hsl);
              setValue(color, rgb, target_layer.time);
            }
            if (do_stroke_color) {
              let stroke_color = <Property>target_effect.property(shape_index + SHAPE_PARAM.STROKE_COLOR);
              let rgb = <[number, number, number, number]>stroke_color.value;
              let hsl = Utils.rgbToHsl(rgb);
              hsl[0] += global_shape.hue;
              hsl[1] *= global_shape.saturation;
              hsl[2] *= global_shape.lightness;
              rgb = Utils.hslToRgb(hsl);
              setValue(stroke_color, rgb, target_layer.time);
            }

            //opacity
            let opacity = <Property>target_effect.property(shape_index + SHAPE_PARAM.OPACITY);
            setValue(opacity, global_shape.opacity * <number>opacity.value, target_layer.time);

            //phase
            let phase = <Property>target_effect.property(shape_index + SHAPE_PARAM.PHASE);
            setValue(phase, global_shape.phase + <number>phase.value, target_layer.time);
          }
        });
      });
    }
  }


  //Main
  const builder = new UIBuilder(global, 'KikakuPattern.jsx', {
    version: '1.0.0',
    author: 'Kareobana',
    url: 'http://atarabi.com/',
    titleWidth: 60
  });

  const transformer = new Transformer(builder);

  builder
    .addPanel(PARAM.TRANSFORM)
    .addStatictext(PARAM.LAYER, '')
    .addStatictext(PARAM.SOURCE, '')
    .addScript(PARAM.COPY, () => {
      transformer.copy();
    })
    .addScript(PARAM.PASTE, () => {
      transformer.paste();
    })
    .addPanelEnd(PARAM.TRANSFORM_END)
    .addPanel(PARAM.GLOBAL_SHAPE)
    .addScript(PARAM.CONVERT, () => {
      Converter.convert();
    })
    .addPanelEnd(PARAM.GLOBAL_SHAPE_END)
    .build();


  //functions
  function findEffect(layer: Layer, fn: (property: PropertyBase) => boolean): PropertyGroup {
    if (!Utils.isAVLayer(layer)) {
      return null;
    }
    const effect_root = (<AVLayer>layer).effect;
    for (let i = 1, l = effect_root.numProperties; i <= l; i++) {
      const effect = effect_root.property(i);
      if (fn(effect)) {
        return <PropertyGroup>effect;
      }
    }
    return null;
  }

  function findEffects(layer: Layer, fn: (property: PropertyBase) => boolean): PropertyGroup[] {
    if (!Utils.isAVLayer(layer)) {
      return [];
    }
    const effects: PropertyGroup[] = [];
    const effect_root = (<AVLayer>layer).effect;
    for (let i = 1, l = effect_root.numProperties; i <= l; i++) {
      const effect = effect_root.property(i);
      if (fn(effect)) {
        effects.push(<PropertyGroup>effect);
      }
    }
    return effects;
  }

  function findEffectByMatchname(layer: Layer, match_name: string, selected = true) {
    return findEffect(layer, (property) => property.isEffect && property.matchName === match_name && (!selected || property.selected));
  }

  function findEffectsByMatchname(layer: Layer, match_name: string, selected = true) {
    return findEffects(layer, (property) => property.isEffect && property.matchName === match_name && (!selected || property.selected));
  }

  function findEffectByName(layer: Layer, match_name: string, name: string, selected = true) {
    return findEffect(layer, (property) => property.isEffect && property.matchName === match_name && property.name === name && (!selected || property.selected));
  }

  function setValue(property: Property, value: any, time: number) {
    if (property.numKeys > 0) {
      property.setValueAtTime(time, value);
    } else {
      property.setValue(value);
    }
  }

})(this);