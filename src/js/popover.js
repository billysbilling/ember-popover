//TODO: Should not position above if the content goes above the scrollCt's top (then put it below no matter what)

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
 * @namespace Billy
 * @extends Ember.Component
 */
module.exports = Em.Component.extend(require('ember-layer-mixin'), {
    layout: require('../templates/popover-layout'),

    classNames: ['popover'],

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
     * Tells the popover to display itself and align it to `targetEl`.
     * 
     * When `targetView` is destroyed the popover will automatically destroy itself.
     * 
     * @param {Ember.View} targetView
     * @param {Element} targetEl
     */
    show: function(targetView, targetEl) {
        this.set('targetView', targetView);
        targetView.one('willDestroyElement', Billy.proxy(this.destroy, this));
        this._targetEl = targetEl || targetView.$();
        //We have to append it to the root element, later it will get moved to an appropriate ct
        this.appendTo(this.container.lookup('application:main').get('rootElement'));
    },

    didInsertElement: function() {
        this._super();
        //Move to appropriate ct so we can position and keep position when ct is scrolled
        this.$().appendTo(this._getCt());
        this._updatePosition();
        $(window).on('mousedown', Billy.proxy(this._didMouseDownWindow, this));
    },
    
    willDestroyElement: function() {
        this._super();
        $(window).off('mousedown', Billy.proxy(this._didMouseDownWindow, this));
    },

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
            if (layer && 1*layer.css('z-index') > 1*self.$().css('z-index')) {
                return;
            }
            self.destroy();
        });
    },

    _getCt: function() {
        var ct = this._targetEl.closest('.section-body, .scroll-ct');
        if (ct.length == 0) {
            ct = $(this.container.lookup('application:main').get('rootElement'));
        }
        return ct;
    },

    _updatePosition: function() {
        var align = this.get('align'),
            position = this.get('position'),
            targetEl = this._targetEl,
            popoverEl = this.$(),
            popoverHeight = popoverEl.outerHeight(),
            ct = this._getCt(),
            ctOffset = ct.offset(),
            ctTop = ctOffset.top,
            ctBottom = ctTop + ct.outerHeight(),
            offsetParent = popoverEl.offsetParent(),
            offsetParentWidth = offsetParent.width(),
            offsetParentOffset = offsetParent.offset(),
            offsetParentTop = offsetParentOffset.top - ct.scrollTop(),
            offsetParentBottom = offsetParentTop + offsetParent.outerHeight(),
            offsetParentLeft = offsetParentOffset.left - ct.scrollLeft(),
            notchSize = 4,
            targetWidth = targetEl.outerWidth(),
            targetOffset = targetEl.offset(),
            targetTop = targetOffset.top - notchSize,
            targetBottom = targetTop + targetEl.outerHeight() + 2*notchSize, // (one time notchSize was already applied in `targetTop`)
            spacePadding = 10,
            space,
            spaceAbove = targetTop - ctTop - spacePadding,
            spaceUnder = ctBottom - targetBottom - spacePadding,
            minHeight = this.get('minHeight'),
            maxHeight = this.get('maxHeight'),
            preferredHeight = popoverHeight,
            resolvedMaxHeight,
            popoverTop = 'auto',
            popoverRight = 'auto',
            popoverBottom = 'auto',
            popoverLeft = 'auto',
            minWidth = this.get('minWidth'),
            maxWidth = this.get('maxWidth'),
            width = 0,
            bodyEl = this.$('.popover-body'),
            exceptBodyHeight = popoverHeight - bodyEl.outerHeight(),
            bodyMaxHeight = null;
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
        if (width > 0) {
            popoverEl.outerWidth(width);
        }
        //Left/right align
        if (align === 'right') {
            popoverRight = offsetParentWidth - (targetOffset.left - offsetParentLeft) - targetWidth;
            popoverEl.addClass('right');
        } else {
            popoverLeft = targetOffset.left - offsetParentLeft;
            popoverEl.removeClass('right');
        }
        //Position under or above
        if (maxHeight) {
            preferredHeight = maxHeight;
        }
        if (position === 'below' || (position !== 'above' && (spaceUnder >= preferredHeight || spaceUnder > spaceAbove))) {
            space = spaceUnder;
            popoverTop = targetBottom - offsetParentTop;
            popoverEl.removeClass('above');
        } else {
            space = spaceAbove;
            popoverBottom = offsetParentBottom - targetTop;
            popoverEl.addClass('above');
        }
        if (maxHeight) {
            resolvedMaxHeight = space;
            resolvedMaxHeight = Math.min(resolvedMaxHeight, maxHeight);
            if (minHeight) {
                resolvedMaxHeight = Math.max(resolvedMaxHeight, minHeight);
            }
            //If a body element was found we need to set its maximum height
            if (bodyEl.length > 0) {
                bodyMaxHeight = resolvedMaxHeight - exceptBodyHeight;
                bodyEl.css('max-height', bodyMaxHeight+'px');
            }
        }
        //Set position
        popoverEl.css({
            top: popoverTop,
            right: popoverRight,
            bottom: popoverBottom,
            left: popoverLeft,
            'max-height': resolvedMaxHeight ? resolvedMaxHeight+'px' : 'none'
        });
    },
    
    //Hack since Ember.Component does not support {{yield}} when there is no parentView
    _yield: function() {
        return Em.View.prototype._yield.apply(this, arguments);
    }
});