require('ember');

var functionProxy = require('function-proxy'),
    ieDetect = require('ie-detect');

/**
 * An extensible popover component shared by superfield selector, date selector etc.
 * 
 * Usage example:
 * 
 * ```javascript
 * var popover = this.container.lookup('component:my-popover');
 * popover.show(view, view.$('.thing-that-has-popover');
 * ```
 * 
 * @class PopoverComponent
 * @extends Ember.Component
 */
module.exports = Em.Component.extend({
    layout: require('../templates/popover-layout'),

    classNameBindings: [':popover', 'isIe'],

    /**
     * Whether the popover should match the `target`'s width.
     * 
     * @property matchWidth
     * @type Boolean
     */
    matchWidth: true,

    /**
     * The popover will never be narrower than this.
     * 
     * @property minWidth
     * @type Number
     */
    minWidth: null,

    /**
     * The popover will never be wider than this.
     *
     * @property minWidth
     * @type Number
     */
    maxWidth: null,

    /**
     * The popover's `max-height` css property will never be set to less than this value.
     * 
     * Only has an effect if `maxHeight` is also set.
     *
     * @property minWidth
     * @type Number
     */
    minHeight: 50,

    /**
     * Tells the popover to set the `max-height` css property of its own element.
     * 
     * The `max-height` will never be more than the available space above/below the target (unless `minheight` is used
     * too).
     *
     * @property maxHeight
     * @type Number
     */
    maxHeight: null,

    /**
     * Will force the position to be either above or below, if set.
     * 
     * @property position
     * @type String Either `above` or `below`. `null` to be ignored.
     */
    position: null,

    /**
     * Whether the popover should be automatically destroyed when clicking the window outside the popover and its
     * target.
     *
     * @property destroyOnWindowMouseDown
     * @type Boolean
     */
    destroyOnWindowMouseDown: true,

    /**
     * Simple IE detection for better drop-shadow filter handling
     *
     * @property isIe
     * @type Boolean
     */
    isIe: function() {
        return ieDetect.isIe;
    }.property(),

    /**
     * Application bounds.  If null, the app's rootElement will be used
     *
     * @property within
     * @type "Selectable" object or string CSS selector
     */
    within: null,

    /**
     * Array of scrollable parent elements of the target that a scroll event will be bound to.
     * We need to $.on()/$.off() these events when creating/destroying the popover
     *
     * @property _scrollableParents
     * @type Array
     */
    _scrollableParents: null,

    /**
     * Additional popover height that's not part of a scrollable element
     */
    _bodyExtraHeight: 0,

    /**
     * Tells the popover to display itself and align it to `targetEl`.
     * 
     * When `targetView` is destroyed the popover will automatically destroy itself.
     * 
     * @param {Ember.View} targetView
     * @param {Element} targetEl
     */
    show: function(targetView, targetEl) {
        this.set('targetView', targetView);
        targetView.one('willDestroyElement', functionProxy(this.destroy, this));
        this._targetEl = targetEl ? $(targetEl) : targetView.$();
        this.appendTo(this.container.lookup('application:main').get('rootElement'));
    },

    /**
     * Places the popover element's z-index 1 higher than the highest z-index found
     *
     * @private
     */
    _updateZIndex: function (){
        var highest = Math.max.apply(null,
            $.map($('body > *'), function(el) {
                var $el = $(el);
                if ($el.css('position') !== 'static') {
                    return parseInt($el.css('z-index')) || 1;
                }
                return 1;
            }));
        this.$().css('z-index', highest + 1);
    },

    /**
     * Updates z-index, position, registers scroll events on scrollable parent elements, and registers event handlers
     */
    didInsertElement: function() {
        this._super();
        this._updateZIndex();
        this._registerScrollableParents();

        //Bind events
        $(window).on('resize', functionProxy(this.updatePosition, this));
        $(window).on('mousedown', functionProxy(this._didMouseDownWindow, this));
        $(document).on('scroll', functionProxy(this.updatePosition, this));

        //Set _bodyExtraHeight (any extra height outside of the scrollable area)
        var bodyEl = this.$('.popover-body');
        if (bodyEl.length) {
            this.set('_bodyExtraHeight', this.$().outerHeight() - bodyEl.outerHeight());
        }

        //Update position
        this.updatePosition();
    },

    /**
     * Unregisters scroll events for scrollable parent elements, unregisters event handlers
     */
    willDestroyElement: function() {
        this._super();
        this._unregisterScrollableParents();
        $(window).off('resize', functionProxy(this.updatePosition, this));
        $(window).off('mousedown', functionProxy(this._didMouseDownWindow, this));
        $(document).off('scroll', functionProxy(this.updatePosition, this));
    },

    /**
     * Finds all scrollable parents and registers this.updatePosition on the scroll event handler
     *
     * @private
     */
    _registerScrollableParents: function() {
        Em.assert('_scrollableParents should be empty when initializing this component', !this.get('_scrollableParents.length'));
        var el = this._targetEl,
            parents = this.get('_scrollableParents') || Em.A();
        while (el.length) {
            //If document, we've reached the top (Firefox doesn't like using .css on document)
            if (el[0] === document) {
                break;
            }

            //Define properties that denote "scrollable".  This is not foolproof, as "initial" and "inherit" could
            //potentially still result in a scrollable element
            var sp = Em.A(['scroll', 'auto']);

            //Check if overflows are scrollable
            if (sp.contains(el.css('overflow')) || sp.contains(el.css('overflow-x')) || sp.contains(el.css('overflow-y'))) {
                parents.push(el);
                el.on('scroll', functionProxy(this.updatePosition, this));
            }

            //Next
            el = el.parent();
        }
        this.set('_scrollableParents', parents);
    },

    /**
     * Unregisters all scroll listeners from scrollable parent elements
     *
     * @private
     */
    _unregisterScrollableParents: function() {
        var self = this,
            scrollableParents = this.get('_scrollableParents');
        if (!scrollableParents) {
            return;
        }
        scrollableParents.forEach(function(parent) {
            parent.off('scroll', functionProxy(self.updatePosition, self));
        });
    },

    /**
     * Destroys popover unless one of the containing element caveats applies
     *
     * @param e mousedown event
     * @private
     */
    _didMouseDownWindow: function(e) {
        if (!this.get('destroyOnWindowMouseDown')) {
            return;
        }
        var self = this;
        Em.run(function() {
            if (self.get('isDestroying')) {
                return;
            }
            var el = self.get('element'),
                targetEl = self._targetEl[0];

            //Don't hide if the clicked target is within this popover's element
            if ($.contains(el, e.target) || el === e.target || $.contains(targetEl, e.target) || targetEl === e.target) {
                return;
            }

            //Don't hide if click was within a layer that has higher z-index than this layer
            var layer = $(e.target).closest('.layer');
            if (layer && parseInt(layer.css('z-index')) > parseInt(self.$().css('z-index'))) {
                return;
            }
            self.destroy();
        });
    },

    /**
     * Updates the position of the popover on show, resizing of window, or scrolling of scrollable parent elements.
     *
     * @private
     */
    updatePosition: function() {
        var $popover = this.$(),
            within = this.get('within') || this.container.lookup('application:main').get('rootElement');

        //Update position
        $popover.css(this._calculateCss($(within), $(window)));
    },

    /**
     * Calculates new CSS position/dimensions based on provided within and viewport elements
     * @param $within
     * @param $viewport
     * @returns {}
     * @private
     */
    _calculateCss: function($within, $viewport) {
        //Constants
        var notchPadding = 4,
            viewportPadding = 10;

        //Elements
        var $target = this._targetEl,
            $popover = this.$(),
            $body = this.$('.popover-body');

        //Specific values
        var align = this.get('align') || 'left',
            position = this.get('position'),
            minWidth = this.get('minWidth'),
            maxWidth = this.get('maxWidth'),
            minHeight = this.get('minHeight'),
            maxHeight = this.get('maxHeight');

        //Determine tallest possible popover based on the within element's height
        if (maxHeight) {
            var appHeight = $within.outerHeight(),
                enforcedMaxHeight = (appHeight - $target.outerHeight()) / 2 - viewportPadding;

            //Enforce a sensible maxHeight
            maxHeight = maxHeight && maxHeight > enforcedMaxHeight ? enforcedMaxHeight : maxHeight;

            //Set .popover-body max-height
            if ($body.length > 0) {
                $body.css('max-height', (maxHeight - this.get('_bodyExtraHeight'))+'px');
            }
        }

        //Take measurements
        var targetWidth = $target.outerWidth(),
            targetOffset = $target.offset(),
            spaceAbove = targetOffset.top - viewportPadding,
            spaceBelow = $within.outerHeight() - (targetOffset.top + $target.outerHeight() + viewportPadding);

        //Derived properties
        var width,
            top = 'auto',
            bottom = 'auto',
            left = 'auto',
            right = 'auto',
            isAbove = false;

        //Set width
        if (this.get('matchWidth')) {
            width = targetWidth;
        }
        if (minWidth) {
            width = Math.max(width, minWidth);
        }
        if (maxWidth) {
            width = Math.min(width, maxWidth);
        }
        if (width && width > 0) {
            $popover.outerWidth(width);
        }

        //Set right/left
        if (align === 'right') {
            right = $viewport.width() - targetOffset.left - targetWidth;
            $popover.addClass('popover-align-right');
        } else {
            left = targetOffset.left;
            $popover.removeClass('popover-align-right');
        }

        //Determine if popover should appear above target
        if (position === 'below') {
            //Do nothing
        } else if (position === 'above') {
            //If above specified and there's room...
            isAbove = true;
        } else {
            if (maxHeight) {
                //If max height is set
                if (spaceAbove > maxHeight && spaceBelow < maxHeight) {
                    //If space above is sufficient and space below is insufficient
                    isAbove = true;
                }
            } else {
                //If max height is not set, we need to use the popover's height
                var popoverHeight = Math.max($popover.outerHeight(), minHeight);

                if (spaceAbove > popoverHeight && spaceBelow < popoverHeight) {
                    //If space above is sufficient and space below is insufficient
                    isAbove = true;
                }
            }
        }

        //Set top or bottom property
        if (isAbove) {
            bottom = $viewport.height() - targetOffset.top + notchPadding;
            $popover.addClass('popover-above');
        } else {
            top = targetOffset.top + $target.outerHeight() + notchPadding;
            $popover.removeClass('popover-above');
        }

        //Return CSS hash
        return {
            top: top,
            right: right,
            bottom: bottom,
            left: left,
            'min-height': minHeight,
            'max-height': maxHeight ? maxHeight: 'none',
            'min-width': minWidth ? minWidth : 'none',
            'max-width': maxWidth ? maxWidth : 'none'
        };
    },

    /**
     * Hack since Ember.Component does not support {{yield}} when there is no parentView
     */
    _yield: function() {
        return Em.View.prototype._yield.apply(this, arguments);
    }
});
