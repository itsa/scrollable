/**
 * Plugin to create scrollable divs
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 *
 * @module scrollable
 * @class Scrollable
 * @since 0.0.1
*/

"use strict";

require('js-ext/lib/object.js');
require('polyfill');
require('./css/scrollable.css');

var NAME = '[scrollable]: ',
    POSITION = 'position',
    OVERFLOW = 'overflow',
    SYNC_TIMER = 1000,
    SCROLL_HANDLE = '<span plugin-dd="true" plugin-constrain="true" constrain-selector="span"></span>',
    VERTICAL_CONT = '<span class="itsa-vscroll-cont">'+SCROLL_HANDLE+'</span>',
    HORIZONTAL_CONT = '<span class="itsa-hscroll-cont">'+SCROLL_HANDLE+'</span>',
    createHashMap = require('js-ext/extra/hashmap.js').createMap;

module.exports = function (window) {

    var DOCUMENT = window.document,
        later = require('utils').later,
        Scrollable, Event, setupEvents, DD, isSafari;

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

    isSafari = require('useragent')(window).isSafari;

    setupEvents = function() {
        Event.after('UI:dd-drag', function(e) {
            var dragNode = e.target,
                dragContainer = dragNode.getParent(),
                top = dragNode.top - dragContainer.top,
                height = dragNode.height,
                heightContainer = dragContainer.height,
                effectiveRegion = heightContainer - height,
                percentedMoved = top/effectiveRegion,
                host = dragContainer.getParent(),
                hostScrollHeight = host.scrollHeight,
                hostHeight = host.height,
                model = host._plugin.scroll.model;
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
                model = host._plugin.scroll.model;
            model.left = Math.round(percentedMoved*(hostScrollWidth-hostWidth));
        }, '[plugin-scroll="true"] >span.itsa-hscroll-cont span');

        Event.after('UI:nodecontentchange', function(e) {
            var node = e.target;
            node._plugin && node._plugin.scroll && node._plugin.scroll.sync();
        }, '[plugin-scroll="true"][scroll-ready="true"]');

    };

    setupEvents();

    window._ITSAmodules.Scrollable = Scrollable = DOCUMENT.definePlugin('scroll',
        function() {
            // initializer
            // because we cannot predict if the size of the container are goiig to change (fe by ancestor-classes)
            // we need to sync by timer as well:
            var instance = this;
            instance._syncTimer = later(instance.sync.bind(instance), SYNC_TIMER);
        }, {
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
                host = instance.host,
                inlinePosition, globalPosition;

            // default position to relative: check first inlinestyle because this goes quicker
            instance._inlinePosition = inlinePosition = host.getInlineStyle(POSITION);
            inlinePosition || (globalPosition=host.getStyle(POSITION));
            if ((inlinePosition==='static') || (inlinePosition==='fixed') || (globalPosition==='static') || (globalPosition==='fixed')) {
                inlinePosition = 'relative';
                host.setInlineStyle(POSITION, inlinePosition);
            }
            instance._inlineOverflow = host.getInlineStyle(OVERFLOW);
            instance._inlineOverflow && host.removeInlineStyle(OVERFLOW);
            host.addSystemElement(VERTICAL_CONT, false, false); // don't want silent insert --> need to render the plugins
            host.addSystemElement(HORIZONTAL_CONT, false, false);
        },
        sync: function() {
            var instance = this,
                host = instance.host,
                model = instance.model,
                scrollHeight = instance.getVScrollArea(),
                scrollWidth = instance.getHScrollArea(),
                height = host.innerHeight,
                width = host.innerWidth,
                scrollLeft = model.left,
                scrollTop = model.top,
                vscroller = host.getElement('span.itsa-vscroll-cont', true),
                hscroller = host.getElement('span.itsa-hscroll-cont', true),
                handleNode, vScrollerVisible, hScrollerVisible;

            // safari showed it miscalculates scrollWidth (perhaps also scrollHeight)
            // in certain circumstances by returning 1px too much
            // this may lead into a scroller when it shouldn;t be there:
            if (isSafari) {
                (scrollHeight===(height+1)) && (scrollHeight=height);
                (scrollWidth===(width+1)) && (scrollWidth=width);
            }

            vScrollerVisible = model.y && (scrollHeight>height);
            hScrollerVisible = model.x && (scrollWidth>width);
            vscroller.toggleClass('itsa-visible', vScrollerVisible);
            hscroller.toggleClass('itsa-visible', hScrollerVisible);

            console.info('vScrollerVisible: '+vScrollerVisible+'  (scrollHeight:'+scrollHeight+' | height:'+height+')');
            console.info('hScrollerVisible: '+hScrollerVisible+'  (scrollWidth:'+scrollWidth+' | width:'+width+')');

            host.scrollTop = scrollTop;
            host.scrollLeft = scrollLeft;
            // because scrollTop and scrollLeft have their restrictions, we need to reset them into the model (in case a corrcetion has taken place)
            model.top = scrollTop = host.scrollTop;
            model.left = scrollLeft = host.scrollLeft;

            if (vScrollerVisible) {
                handleNode = vscroller.getElement('span');
                if (!handleNode.hasClass('dd-dragging')) {
                    instance.setVerticalHandle(handleNode, height, scrollHeight);
                }
                vscroller.setInlineStyle('top', scrollTop+'px')
                         .setInlineStyle('right', -scrollLeft+'px');
            }
            if (hScrollerVisible) {
                handleNode = hscroller.getElement('span');
                if (!handleNode.hasClass('dd-dragging')) {
                    instance.setHorizontalHandle(handleNode, width, scrollWidth);
                }
                hscroller.setInlineStyle('bottom', -scrollTop+'px')
                         .setInlineStyle('left', scrollLeft+'px');
            }
        },
        setVerticalHandle: function(handleNode, height, scrollHeight) {
            var instance = this,
                model = instance.model,
                scrollTop = model.top,
                sizeHandle = Math.round(height*(height/scrollHeight)),
                effectiveRegion = height - sizeHandle,
                maxScrollAmount = scrollHeight - height,
                scrollAmount = effectiveRegion * Math.max(0, Math.min(1, (scrollTop/maxScrollAmount)));
            handleNode.setInlineStyle('top', scrollAmount+'px')
                      .setInlineStyle('height', sizeHandle+'px');
        },
        setHorizontalHandle: function(handleNode, width, scrollWidth) {
            var instance = this,
                model = instance.model,
                scrollLeft = model.left,
                sizeHandle = Math.round(width*(width/scrollWidth)),
                effectiveRegion = width - sizeHandle,
                maxScrollAmount = scrollWidth - width,
                scrollAmount = effectiveRegion * Math.max(0, Math.min(1, (scrollLeft/maxScrollAmount)));
            handleNode.setInlineStyle('left', scrollAmount+'px')
                      .setInlineStyle('width', sizeHandle+'px');
        },
        getHScrollArea: function() {
            return this.host.scrollWidth;
        },
        getVScrollArea: function() {
            return this.host.scrollHeight;
        },
        destroy: function() {
            var instance = this,
                host = instance.host,
                inlinePosition, inlineOverflow;
            instance._syncTimer.cancel();
/*jshint boss:true */
            if (inlinePosition=instance._inlinePosition) {
/*jshint boss:false */
                host.setInlineStyle(POSITION, inlinePosition);
            }
            else {
                host.removeInlineStyle(POSITION);
            }
/*jshint boss:true */
            if (inlineOverflow=instance._inlineOverflow) {
/*jshint boss:false */
                host.setInlineStyle(OVERFLOW, inlineOverflow);
            }
            else {
                host.removeInlineStyle(OVERFLOW);
            }
        }
    });

    return Scrollable;
};