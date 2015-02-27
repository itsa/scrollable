"use strict";

require('js-ext/lib/object.js');
require('polyfill');
require('./css/scrollable.css');

/**
 *
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @module focusmanager
 * @class FocusManager
 * @since 0.0.1
*/

var NAME = '[scrollable]: ',
    async = require('utils').async,
    SCROLL_HANDLE = '<span plugin-dd="true" plugin-constrain="true" constrain-selector="span"></span>',
    VERTICAL_CONT = '<span class="itsa-vscroll-cont">'+SCROLL_HANDLE+'</span>',
    HORIZONTAL_CONT = '<span class="itsa-hscroll-cont">'+SCROLL_HANDLE+'</span>',
    createHashMap = require('js-ext/extra/hashmap.js').createMap;

module.exports = function (window) {

    var DOCUMENT = window.document,
        Scrollable, Event, setupEvents, DD;

    window._ITSAmodules || Object.protectedProp(window, '_ITSAmodules', createHashMap());

/*jshint boss:true */
    if (Scrollable=window._ITSAmodules.Scrollable) {
/*jshint boss:false */
        return Scrollable; // Scrollable was already created
    }

    require('window-ext')(window);
    require('node-plugin')(window);

    Event = require('event-mobile')(window);
    DD = require('drag')(window);
    DD.init(); // ITSA combines the Drag-module with drag-drop into ITSA.DD

    setupEvents = function() {
        Event.after('UI:dd-drag', function(e) {
            var dragNode = e.target,
                dragContainer = dragNode.getParent(),
                top = parseInt(dragNode.getInlineStyle('top'), 10),
                height = dragNode.height,
                heightContainer = dragContainer.height,
                effectiveRegion = heightContainer - height,
                percentedMoved = top/effectiveRegion,
                host = dragContainer.getParent(),
                hostScrollHeight = host.scrollHeight,
                hostHeight = host.height,
                model = host.plugin.scroll.model;
            model.top = Math.round(percentedMoved*(hostScrollHeight-hostHeight));
        }, '[plugin-scroll="true"] >span.itsa-vscroll-cont span');

        Event.after('UI:dd-drag', function(e) {
            var dragNode = e.target,
                dragContainer = dragNode.getParent(),
                left = parseInt(dragNode.getInlineStyle('left'), 10),
                width = dragNode.width,
                widthContainer = dragContainer.width,
                effectiveRegion = widthContainer - width,
                percentedMoved = left/effectiveRegion,
                host = dragContainer.getParent(),
                hostScrollWidth = host.scrollWidth,
                hostWidth = host.width,
                model = host.plugin.scroll.model;
            model.left = Math.round(percentedMoved*(hostScrollWidth-hostWidth));
        }, '[plugin-scroll="true"] >span.itsa-hscroll-cont span');

    };

    setupEvents();

    window._ITSAmodules.Scrollable = Scrollable = DOCUMENT.definePlugin('scroll', null, {
        attrs: {
            x: 'boolean',
            y: 'boolean',
            left: 'number',
            top: 'number',
            light: 'boolean',
            autohide: 'boolean',
            disabled: 'boolean'
        },
        defaults: {
            x: true,
            y: true,
            left: 0,
            top: 0,
        },
        render: function() {
            var instance = this,
                host = instance.host;
            host.setInlineStyle('position', 'relative');
            host.hasInlineStyle('overflow') && host.removeInlineStyle('overflow');
            host.addSystemElement(VERTICAL_CONT, false, false); // don't want silent insert --> need to render the plugins
            host.addSystemElement(HORIZONTAL_CONT, false, false);
        },
        sync: function() {
            var instance = this,
                host = instance.host,
                model = instance.model,
                scrollHeight = host.scrollHeight,
                scrollWidth = host.scrollWidth,
                height = host.height,
                width = host.width,
                scrollLeft = model.left,
                scrollTop = model.top,
                vScrollerVisible = (scrollHeight>height),
                hScrollerVisible = (scrollWidth>width),
                vscroller = host.getElement('span.itsa-vscroll-cont', true),
                hscroller = host.getElement('span.itsa-hscroll-cont', true),
                sizeHandle, effectiveRegion, maxScrollAmount, scrollAmount, handleNode;

            vscroller.toggleClass('itsa-visible', vScrollerVisible);
            hscroller.toggleClass('itsa-visible', hScrollerVisible);

            if (vScrollerVisible) {
                handleNode = vscroller.getElement('span');
                if (!handleNode.hasClass('dd-dragging')) {
                    sizeHandle = Math.round(height*(height/scrollHeight));
                    effectiveRegion = height - sizeHandle;
                    maxScrollAmount - scrollHeight - height;
                    scrollAmount = Math.max(1, (scrollTop/maxScrollAmount)) * effectiveRegion;
                    handleNode.setInlineStyle('top', scrollAmount+'px')
                              .setInlineStyle('height', sizeHandle+'px');
                }
            }
            if (hScrollerVisible) {
                handleNode = hscroller.getElement('span');
                if (!handleNode.hasClass('dd-dragging')) {
                    sizeHandle = Math.round(width*(width/scrollWidth));
                    effectiveRegion = width - sizeHandle;
                    maxScrollAmount - scrollWidth - width;
                    scrollAmount = Math.max(1, (scrollLeft/maxScrollAmount)) * effectiveRegion;
                    handleNode.setInlineStyle('left', scrollAmount+'px')
                              .setInlineStyle('width', sizeHandle+'px');
                }
            }
            host.scrollTop = scrollTop;
            host.scrollLeft = scrollLeft;
        }
    });

    return Scrollable;
};