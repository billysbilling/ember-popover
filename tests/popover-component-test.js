require('ember');

var PopoverComponent = require('../src/js/popover');

var app,
    container,
    target,
    TestPopover,
    popover,
    ct;

QUnit.module('popover', {
    setup: function() {
        container = new Ember.Container();
        app = Ember.Application.extend();
        container.optionsForType('template', {instantiate: false});
        container.register('application:main', app);
        container.register('template:components/popover-layout', require('../src/templates/popover-layout'));
        container.register('view:popoverTarget', Ember.View.extend({
            template: Ember.Handlebars.compile('<div class="target" style="position:absolute; top:0px; left:0px; background-color:blue; width:200px; height:30px;"><div>'),
            classNames: ['popover-target'],
            attributeBindings: 'style',
            style: 'position:absolute; top:0px; right:0px; left:0px; height:160px;'
        }));
        container.register('template:components/test-popover', Ember.Handlebars.compile('hello'));
        TestPopover = PopoverComponent.extend({
            templateName: 'components/test-popover',
            attributeBindings: ['style'],
            style: 'padding:0px; border:0px;'
        });
        container.register('component:test-popover', TestPopover);
        ct = $('<div class="scroll-ct" style="overflow: auto;"></div>');
        ct.css({
            position: 'relative',
            width: '400px',
            height: '300px',
            backgroundColor: '#ccc'
        });
        ct.appendTo('#ember-testing');
        target = container.lookup('view:popoverTarget');
        Ember.run(function() {
            target.appendTo(ct);
        });
    },
    teardown: function() {
        Em.run(function() {
            popover.destroy();
            target.destroy();
            ct.remove();
            container.destroy();
        });
        popover = target = ct = container = app = null;
    }
});

function createPopover(props) {
    props = $.extend({}, {within: '#ember-testing-container'}, props);
    popover = container.lookup('component:test-popover');
    popover.setProperties(props);
}

function showPopover() {
    Ember.run(function() {
        popover.show(target, target.$('.target'))
    });
}

function setupPopover(props) {
    createPopover(props);
    showPopover();
}

test('when destroying target popover should also be destroyed', function() {
    setupPopover();
    Em.run(function() {
        target.destroy();
    });
    equal(0, $('body > .popover').length);
    ok(popover.get('isDestroyed'));
});

test('is appended to rootElement', function() {
    ct.removeClass('scroll-ct');
    setupPopover();
    equal(1, $('body > .popover').length);
});

test('should disappear when clicking outside it', function() {
    setupPopover();
    $(window).trigger('mousedown');
    equal(0, $('body > .popover').length);
});

test('should not disappear when clicking it', function() {
    setupPopover();
    $('.popover').trigger('mousedown');
    equal(1, $('body > .popover').length);
});

test('should not disappear when clicking an element inside it', function() {
    setupPopover();
    $('<div class="click-test"></div>').appendTo(popover.get('element'));
    $('.click-test')
        .click()
        .trigger('mousedown');
    equal(1, $('body > .popover').length);
});

test('should not disappear when clicking target', function() {
    setupPopover();
    $('.target')
        .click()
        .trigger('mousedown');
    equal(1, $('body > .popover').length);
});

test('should not disappear when clicking an element inside target', function() {
    setupPopover();
    $('<div class="click-test"></div>').appendTo($('.target'));
    $('.click-test')
        .click()
        .trigger('mousedown');
    equal(1, $('body > .popover').length);
});

test('should match width', function() {
    setupPopover();
    equal(200, $('.popover').outerWidth());
});

test('should not match if not configured to', function() {
    createPopover();
    popover.set('matchWidth', false);
    showPopover();
    var $popover = $('.popover');
    notEqual(200, $popover.outerWidth());
    notEqual('auto', $popover.css('width'));
});

test('should respect minWidth', function() {
    createPopover();
    popover.set('minWidth', 300);
    showPopover();
    equal(300, $('.popover').outerWidth());
});

test('should respect maxWidth', function() {
    createPopover();
    popover.set('maxWidth', 70);
    showPopover();
    equal(70, $('.popover').outerWidth());
});

test('should align to left side as default', function() {
    target.$('.target').css('left', '117px');
    setupPopover();
    var $popover = $('.popover');
    ok(!$popover.hasClass('popover-align-right'));
    equal('auto', $popover.css('right'), 'right css is auto');
    equal(target.$('.target').offset().left, $popover.offset().left, 'left offset is correct');
});

test('should align to right side if configured', function() {
    target.$('.target').css('left', '117px');
    setupPopover({
        align: 'right',
        minWidth: 300
    });

    var $popover = $('.popover'),
        $target = target.$('.target'),
        popoverRight = $popover.offset().left + $popover.outerWidth();

    ok($popover.hasClass('popover-align-right'));
    equal('auto', $popover.css('left'));
    equal($target.offset().left + $target.outerWidth(), popoverRight, 'right offset is correct');
});

test('should align to the targetView if no targetEl is set', function() {
    target.$('.target').css('left', '117px');
    createPopover();
    Ember.run(function() {
        popover.show(target);
    });
    var $popover = $('.popover');
    equal($popover.css('top'), '164px');

    var $target = target.$();

    equal($target.offset().left, $popover.offset().left);
    equal($popover.css('bottom'), 'auto');
    equal($popover.css('right'), 'auto');
});

test('should position below when there is room for calculated height', function() {
    container.register('template:components/test-popover', Ember.Handlebars.compile('<div style="height:55px;"></div>'));
    target.$('.target').css('top', '200px');
    createPopover();
    showPopover();
    var $popover = $('.popover');
    ok(!$popover.hasClass('above'));
    equal($popover.css('top'), '234px');
    equal($popover.css('bottom'), 'auto');
});

test('should position above when there is not room for calculated height below', function() {
    container.register('template:components/test-popover', Ember.Handlebars.compile('<div style="height:57px;"></div>'));
    target.$('.target').css('top', '230px');
    setupPopover({
        within: '.scroll-ct'
    });

    var $popover = $('.popover');
    ok($popover.hasClass('popover-above'));
    equal($popover.css('top'), 'auto');
    equal($popover.css('bottom'), $(window).height() - 226 + 'px');
    equal($popover.css('max-height'), 'none');
});

test('should position below when there is room for maxHeight', function() {
    target.$('.target').css('top', '200px');
    createPopover();
    popover.set('maxHeight', 55);
    showPopover();
    var $popover = $('.popover');
    ok(!$popover.hasClass('above'));
    equal($popover.css('top'), '234px');
    equal($popover.css('bottom'), 'auto');
    equal($popover.css('max-height'), '55px');
});


test('should position above when there is not room for minHeight below', function() {
    target.$('.target').css('top', '200px');
    setupPopover({
        within: '.scroll-ct',
        minHeight: 100
    });

    var $popover = $('.popover');
    ok($popover.hasClass('popover-above'), 'popover has popover-above class');
    equal($popover.css('top'), 'auto');
    equal($popover.css('bottom'), $(window).height() - 196 + 'px');
    equal($popover.css('max-height'), 'none');
});

test('if a .popover-body element exists it should get its max-height style set', function() {
    container.register('template:components/test-popover', Ember.Handlebars.compile('<div style="height:30px;">Top</div><div class="popover-body"></div><div style="height:20px;">Bottom</div>'));
    createPopover();
    popover.set('maxHeight', 120);
    showPopover();
    equal($('.popover-body').css('max-height'), '70px');
});

test('should respect position=above if it can fit', function() {
    target.$('.target').css('top', '80px');
    setupPopover({
        position: 'above'
    });
    var $popover = $('.popover'),
        $target = target.$('.target');

    ok($popover.hasClass('popover-above', 'popover has popover-above class'));
    equal($popover.css('top'), 'auto');
    equal($target.offset().top - 4, $popover.offset().top + $popover.outerHeight());
});
