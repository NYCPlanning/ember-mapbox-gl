import { warn } from '@ember/debug';
import { assign } from '@ember/polyfills';
import { get, set } from '@ember/object';
import { getOwner } from '@ember/application';
import { bind, next, scheduleOnce } from '@ember/runloop';
import Component from '@ember/component';
import layout from '../templates/components/mapbox-gl';
import noop from 'ember-mapbox-gl/utils/noop';

const MapboxGl = mapboxgl;

/**
  Component that creates a new [mapbox-gl-js instance](https://www.mapbox.com/mapbox-gl-js/api/#map):
  
  ```hbs
  {{#mapbox-gl initOptions=initOptions mapLoaded=(action 'mapLoaded') as |map|}}

  {{/mapbox-gl}}
  ```

  @class MapboxGL
  @yield {Hash} map
  @yield {Component} map.call
  @yield {Component} map.control
  @yield {Component} map.image
  @yield {Component} map.layer
  @yield {Component} map.marker
  @yield {Component} map.on
  @yield {Component} map.popup
  @yield {Component} map.source
*/
export default Component.extend({
  layout,

  /**
    An options hash to pass on to the [mapbox-gl-js instance](https://www.mapbox.com/mapbox-gl-js/api/). 
    This is only used during map construction, and updates will have no effect.

    @argument initOptions
    @type {Object}
  */
  initOptions: null,

  /**
    An action function to call when the map has finished loading. Note that the component does not yield until the map has loaded, 
    so this is the only way to listen for the mapbox load event.

    @argument mapLoaded
    @type {Function}
  */
  mapLoaded: noop,

  init() {
    this._super(...arguments);

    this.map = null;
    this.glSupported = MapboxGl.supported();

    const mbglConfig = getOwner(this).resolveRegistration('config:environment')['mapbox-gl'] || {};
    warn('mapbox-gl config is missing in config/environment', mbglConfig, { id: 'ember-mapbox-gl.config-object' });
    warn('mapbox-gl config is missing an accessToken string', typeof mbglConfig.accessToken === 'string', { id: 'ember-mapbox-gl.access-token' });

    MapboxGl.accessToken = mbglConfig.accessToken;
  },

  didInsertElement() {
    this._super(...arguments);

    if (this.glSupported) {
      scheduleOnce('afterRender', this, this._setup);
    }
  },

  willDestroy() {
    this._super(...arguments);

    if (this.map !== null) {
      // some map users may be late doing cleanup (seen with mapbox-draw-gl), so don't remove the map until the next tick
      next(this.map, this.map.remove);
    }
  },

  _setup() {
    const mbglConfig = get(getOwner(this).resolveRegistration('config:environment'), 'mapbox-gl.map');
    const options = assign({}, mbglConfig, get(this, 'initOptions'));
    options.container = this.element;

    const map = new MapboxGl.Map(options);
    map.once('load', bind(this, this._onLoad, map));
  },

  _onLoad(map) {
    if (this.isDestroyed || this.isDestroying) {
      map.remove();
      return;
    }

    this.mapLoaded(map);

    set(this, 'map', map);
  }
});
