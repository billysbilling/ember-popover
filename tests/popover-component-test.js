var container,
    target,
    TestPopover,
    popover,
    ct;

QUnit.module('Billy.PopoverComponent', {
    setup: function() {
        container = new Ember.Container();
        container.optionsForType('template', {instantiate: false});
        container.register('template:components/popover-layout', Ember.TEMPLATES['components/popover-layout']);
        container.register('view:popoverTarget', Ember.View.extend({
            template: Ember.Handlebars.compile('<div class="target" style="position:absolute; top:0px; left:0px; background-color:blue; width:200px; height:30px;"><div>'),
            classNames: ['popover-target'],
            attributeBindings: 'style',
            style: 'position:absolute; top:0px; right:0px; left:0px; height:160px;'
        }));
        container.register('template:components/test-popover', Ember.Handlebars.compile('hello'));
        TestPopover = Billy.PopoverComponent.extend({
            templateName: 'components/test-popover',
            attributeBindings: ['style'],
            style: 'padding:0px; border:0px;'
        });
        container.register('component:test-popover', TestPopover);
        ct = $('<div class="scroll-ct"></div>')
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
        popover = target = ct = container = null;
    }
});

function createPopover() {
    popover = container.lookup('component:test-popover');
}

function showPopover() {
    Ember.run(function() {
        popover.show(target, target.$('.target'))
    });
}

function setupPopover() {
    createPopover();
    showPopover();
}

test('when destroying target popover should also be destroyed', function() {
    setupPopover();
    Em.run(function() {
        target.destroy();
    });
    equal(find('.scroll-ct > .popover').length, 0);
    ok(popover.get('isDestroyed'));
});

test('is appended to .scroll-ct if it exist', function() {
    setupPopover();
    equal(find('.scroll-ct > .popover').length, 1);
});

test('is appended to .section-body if it exist', function() {
    ct.removeClass('scroll-ct');
    ct.addClass('section-body');
    setupPopover();
    equal(find('.section-body > .popover').length, 1);
});

test('is appended to rootElement if no .scroll-ct exists', function() {
    ct.removeClass('scroll-ct');
    setupPopover();
    equal(find('> .popover').length, 1);
});

test('should disappear when clicking outside it', function() {
    setupPopover();
    click(document.body);
    equal(find('.scroll-ct > .popover').length, 0);
});

test('should not disappear when clicking it', function() {
    setupPopover();
    click('.popover');
    equal(find('.scroll-ct > .popover').length, 1);
});

test('should not disappear when clicking an element inside it', function() {
    setupPopover();
    $('<div class="click-test"></div>').appendTo(popover.get('element'));
    click('.click-test');
    equal(find('.scroll-ct > .popover').length, 1);
});

test('should not disappear when clicking target', function() {
    setupPopover();
    click('.target');
    equal(find('.scroll-ct > .popover').length, 1);
});

test('should not disappear when clicking an element inside target', function() {
    setupPopover();
    $('<div class="click-test"></div>').appendTo($('.target'));
    click('.click-test');
    equal(find('.scroll-ct > .popover').length, 1);
});

test('should match width', function() {
    setupPopover();
    equal(find('.popover').outerWidth(), 200);
});

test('should not match if not configured to', function() {
    createPopover();
    popover.set('matchWidth', false);
    showPopover();
    notEqual(find('.popover').outerWidth(), 200);
    notEqual(find('.popover').css('width'), 'auto');
});

test('should respect minWidth', function() {
    createPopover();
    popover.set('minWidth', 300);
    showPopover();
    equal(find('.popover').outerWidth(), 300);
});

test('should respect maxWidth', function() {
    createPopover();
    popover.set('maxWidth', 70);
    showPopover();
    equal(find('.popover').outerWidth(), 70);
});

test('should align to left side as default', function() {
    target.$('.target').css('left', '117px');
    setupPopover();
    ok(!find('.popover').hasClass('right'));
    equal(find('.popover').css('left'), '117px');
    equal(find('.popover').css('right'), 'auto');
});

test('should align to right side if configured', function() {
    target.$('.target').css('left', '117px');
    createPopover();
    popover.set('align', 'right');
    popover.set('minWidth', 300);
    showPopover();
    ok(find('.popover').hasClass('right'));
    equal(find('.popover').css('left'), 'auto');
    equal(find('.popover').css('right'), '83px');
});

test('should default to align to the targetView if no targetEl is set', function() {
    target.$('.target').css('left', '117px');
    createPopover();
    Ember.run(function() {
        popover.show(target);
    });
    equal(find('.popover').css('top'), '164px');
    equal(find('.popover').css('right'), 'auto');
    equal(find('.popover').css('bottom'), 'auto');
    equal(find('.popover').css('left'), '0px');
});

test('should position below when there is room for calculated height', function() {
    container.register('template:components/test-popover', Ember.Handlebars.compile('<div style="height:55px;"></div>'));
    target.$('.target').css('top', '200px');
    createPopover();
    showPopover();
    ok(!find('.popover').hasClass('above'));
    equal(find('.popover').css('top'), '234px');
    equal(find('.popover').css('bottom'), 'auto');
    equal(find('.popover').css('max-height'), 'none');
});

test('should position above when there is not room for calculated height below', function() {
    container.register('template:components/test-popover', Ember.Handlebars.compile('<div style="height:57px;"></div>'));
    target.$('.target').css('top', '200px');
    createPopover();
    showPopover();
    ok(find('.popover').hasClass('above'));
    equal(find('.popover').css('top'), 'auto');
    equal(find('.popover').css('bottom'), '104px');
    equal(find('.popover').css('max-height'), 'none');
});

test('should position below when there is room for maxHeight', function() {
    target.$('.target').css('top', '200px');
    createPopover();
    popover.set('maxHeight', 55);
    showPopover();
    ok(!find('.popover').hasClass('above'));
    equal(find('.popover').css('top'), '234px');
    equal(find('.popover').css('bottom'), 'auto');
    equal(find('.popover').css('max-height'), '55px');
});

test('should position above when there is not room for maxHeight below', function() {
    target.$('.target').css('top', '200px');
    createPopover();
    popover.set('maxHeight', 57);
    showPopover();
    ok(find('.popover').hasClass('above'));
    equal(find('.popover').css('top'), 'auto');
    equal(find('.popover').css('bottom'), '104px');
    equal(find('.popover').css('max-height'), '57px');
});

test('max-height style should be adjusted when there is little space', function() {
    target.$('.target').css('top', '0px');
    createPopover();
    popover.set('maxHeight', 10000);
    showPopover();
    equal(find('.popover').css('max-height'), '256px');
});

test('max-height style should be respect minHeight', function() {
    createPopover();
    popover.set('maxHeight', 10000);
    popover.set('minHeight', 780);
    showPopover();
    equal(find('.popover').css('max-height'), '780px');
});

test('if a .popover-body element exists it should get its max-height style set', function() {
    container.register('template:components/test-popover', Ember.Handlebars.compile('<div style="height:30px;">Top</div><div class="popover-body"></div><div style="height:20px;">Bottom</div>'));
    createPopover();
    popover.set('maxHeight', 120);
    showPopover();
    equal(find('.popover-body').css('max-height'), '70px');
});

test('should respect position=below', function() {
    target.$('.target').css('top', '300px');
    createPopover();
    popover.set('position', 'below');
    showPopover();
    ok(!find('.popover').hasClass('above'));
    equal(find('.popover').css('top'), '334px');
    equal(find('.popover').css('bottom'), 'auto');
});

test('should respect position=above', function() {
    target.$('.target').css('top', '0px');
    createPopover();
    popover.set('position', 'above');
    showPopover();
    ok(find('.popover').hasClass('above'));
    equal(find('.popover').css('top'), 'auto');
    equal(find('.popover').css('bottom'), '304px');
});